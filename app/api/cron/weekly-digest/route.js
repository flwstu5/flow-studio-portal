import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabaseAdmin";
import { sendEmail } from "../../../../lib/email";
import { staffEmails } from "../../../../lib/notifications";
import { TIER_PLANS } from "../../../dashboard/tierPlans";

const STALE_DAYS = 3;

// Runs Monday mornings (see vercel.json) and emails staff a one-week
// summary: MRR, new subscribers, requests delivered/submitted, and
// anything currently stale. Vercel adds the Authorization header itself
// for cron-triggered requests when CRON_SECRET is set.
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data: newSubscribers } = await admin
    .from("clients")
    .select("id")
    .not("tier", "is", null)
    .gte("created_at", weekAgo.toISOString());

  const { data: activeSubscribers } = await admin
    .from("clients")
    .select("tier")
    .not("tier", "is", null)
    .is("archived_at", null);

  const { data: deliveredThisWeek } = await admin
    .from("requests")
    .select("id")
    .eq("status", "delivered")
    .gte("delivered_at", weekAgo.toISOString());

  const { data: submittedThisWeek } = await admin
    .from("requests")
    .select("id")
    .gte("created_at", weekAgo.toISOString());

  const { data: openRequests } = await admin
    .from("requests")
    .select("id, title, created_at, clients(business_name, email)")
    .neq("status", "delivered");

  const staleCutoff = new Date(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000);
  const stale = (openRequests ?? []).filter((r) => new Date(r.created_at) < staleCutoff);

  const tierCounts = { starter: 0, growth: 0, premium: 0 };
  for (const s of activeSubscribers ?? []) {
    const key = (s.tier ?? "").toLowerCase();
    if (key in tierCounts) tierCounts[key] += 1;
  }
  const mrr = Object.entries(tierCounts).reduce(
    (sum, [tier, count]) => sum + count * (TIER_PLANS[tier]?.price ?? 0),
    0
  );

  const html = `
    <div style="font-family: sans-serif; color:#171717; max-width:520px;">
      <h2 style="margin-bottom:4px;">Your week at Flow Studio</h2>
      <p style="color:#737373; font-size:13px; margin-top:0;">${formatRange(weekAgo, now)}</p>

      <table style="width:100%; border-collapse:collapse; margin:16px 0;">
        <tr><td style="padding:8px 0; border-top:1px solid #e5e5e5;">MRR</td><td style="text-align:right; border-top:1px solid #e5e5e5;">$${mrr.toLocaleString()}</td></tr>
        <tr><td style="padding:8px 0; border-top:1px solid #e5e5e5;">New subscribers</td><td style="text-align:right; border-top:1px solid #e5e5e5;">${newSubscribers?.length ?? 0}</td></tr>
        <tr><td style="padding:8px 0; border-top:1px solid #e5e5e5;">Requests delivered</td><td style="text-align:right; border-top:1px solid #e5e5e5;">${deliveredThisWeek?.length ?? 0}</td></tr>
        <tr><td style="padding:8px 0; border-top:1px solid #e5e5e5;">New requests submitted</td><td style="text-align:right; border-top:1px solid #e5e5e5;">${submittedThisWeek?.length ?? 0}</td></tr>
        <tr><td style="padding:8px 0; border-top:1px solid #e5e5e5;">Currently stale (${STALE_DAYS}+ days)</td><td style="text-align:right; border-top:1px solid #e5e5e5;">${stale.length}</td></tr>
      </table>

      ${
        stale.length > 0
          ? `<p style="font-weight:500; margin-bottom:4px;">Needs attention:</p>
             <ul style="padding-left:18px; margin-top:0;">
               ${stale
                 .map(
                   (r) =>
                     `<li>${escapeHtml(r.title)} — ${escapeHtml(
                       r.clients?.business_name ?? r.clients?.email ?? "Unknown"
                     )}</li>`
                 )
                 .join("")}
             </ul>`
          : ""
      }

      <p style="margin-top:20px;">
        <a href="https://portal.flowstudiogrfx.com/staff" style="display:inline-block; background:#CB181D; color:#fff; text-decoration:none; padding:8px 16px; border-radius:4px; font-size:14px; font-weight:500;">
          Open staff portal
        </a>
      </p>
    </div>
  `;

  await sendEmail({
    to: staffEmails(),
    subject: `Your week at Flow Studio — $${mrr.toLocaleString()} MRR, ${deliveredThisWeek?.length ?? 0} delivered`,
    html,
  });

  return NextResponse.json({ sent: true });
}

function formatRange(start, end) {
  const opts = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

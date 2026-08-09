import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabaseAdmin";
import { notifyClientOfFlyerReminder } from "../../../../lib/notifications";

// Runs on the 1st of each month (see vercel.json). Nudges active
// subscribers who haven't submitted any request yet this month — a
// low-frequency, single-touch reminder (not gated by notify_messages /
// notify_delivery, which are about request activity, not this). Vercel
// adds the Authorization header itself for cron-triggered requests when
// CRON_SECRET is set.
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: subscribers } = await admin
    .from("clients")
    .select("id, email, business_name, last_flyer_reminder_at")
    .not("tier", "is", null)
    .is("archived_at", null);

  const { data: requestsThisMonth } = await admin
    .from("requests")
    .select("client_id")
    .gte("created_at", monthStart.toISOString());

  const clientsWithRequestThisMonth = new Set((requestsThisMonth ?? []).map((r) => r.client_id));

  let remindedCount = 0;

  for (const client of subscribers ?? []) {
    if (clientsWithRequestThisMonth.has(client.id)) continue;

    const alreadyRemindedThisMonth =
      client.last_flyer_reminder_at && new Date(client.last_flyer_reminder_at) >= monthStart;
    if (alreadyRemindedThisMonth) continue;

    await notifyClientOfFlyerReminder({
      clientId: client.id,
      clientEmail: client.email,
      businessName: client.business_name,
    });

    await admin.from("clients").update({ last_flyer_reminder_at: now.toISOString() }).eq("id", client.id);

    remindedCount += 1;
  }

  return NextResponse.json({ reminded: remindedCount, totalSubscribers: subscribers?.length ?? 0 });
}

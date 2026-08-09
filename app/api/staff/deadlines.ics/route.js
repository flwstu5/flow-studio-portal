import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabaseAdmin";

// A "secret link" calendar feed (same pattern as Google Calendar's private
// ICS links) — token-gated instead of session-gated because calendar apps
// (Google/Apple/Outlook) poll this URL on their own schedule with no
// cookies attached. Fails closed if DEADLINES_FEED_SECRET isn't set.
export async function GET(request) {
  const secret = process.env.DEADLINES_FEED_SECRET;
  const token = request.nextUrl.searchParams.get("token");

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: requests } = await admin
    .from("requests")
    .select("id, title, type, status, due_date, clients(business_name, email)")
    .neq("status", "delivered")
    .not("due_date", "is", null)
    .order("due_date", { ascending: true });

  const events = (requests ?? []).map((r) => {
    const clientLabel = r.clients?.business_name ?? r.clients?.email ?? "Unknown client";
    const dateStamp = r.due_date.replace(/-/g, "");
    return [
      "BEGIN:VEVENT",
      `UID:request-${r.id}@flowstudiogrfx.com`,
      `DTSTAMP:${formatNow()}`,
      `DTSTART;VALUE=DATE:${dateStamp}`,
      `SUMMARY:${escapeIcs(`${clientLabel} — ${r.title}`)}`,
      `DESCRIPTION:${escapeIcs(`${r.type} · ${r.status.replace("_", " ")} — https://portal.flowstudiogrfx.com/staff/requests/${r.id}`)}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Flow Studio//Staff Deadlines//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Flow Studio Deadlines",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="flow-studio-deadlines.ics"',
    },
  });
}

function formatNow() {
  return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcs(str) {
  return String(str ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

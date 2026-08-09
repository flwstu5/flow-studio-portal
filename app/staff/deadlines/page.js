import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabaseServer";
import { createAdminClient } from "../../../lib/supabaseAdmin";
import StaffSidebar from "../StaffSidebar";

const statusLabels = {
  submitted: "Submitted",
  in_review: "In review",
};

export default async function StaffDeadlinesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const staffEmails = (process.env.STAFF_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!staffEmails.includes(user.email.toLowerCase())) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();

  const { data: requests } = await admin
    .from("requests")
    .select("id, title, type, status, due_date, clients(business_name, email)")
    .neq("status", "delivered")
    .not("due_date", "is", null)
    .order("due_date", { ascending: true });

  const groups = groupByDate(requests ?? []);

  const feedSecret = process.env.DEADLINES_FEED_SECRET;
  const feedUrl = feedSecret ? `https://portal.flowstudiogrfx.com/api/staff/deadlines.ics?token=${feedSecret}` : null;

  return (
    <div className="min-h-screen flex bg-white">
      <StaffSidebar active="Deadlines" />

      <main className="flex-1 p-8 max-w-3xl">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <h2 className="text-lg font-medium">Deadlines</h2>
          {feedUrl ? (
            <a
              href={feedUrl}
              className="text-xs text-brand-dark border border-brand-light rounded px-3 py-1.5"
            >
              Subscribe (.ics)
            </a>
          ) : (
            <span className="text-xs text-neutral-400">
              Set DEADLINES_FEED_SECRET to enable calendar subscription
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-500 mb-8">
          Every open request with a due date, soonest first.
        </p>

        {groups.length ? (
          groups.map((group) => (
            <div key={group.label} className="mb-8">
              <h3 className={`text-sm font-medium mb-2 ${group.overdue ? "text-red-600" : ""}`}>
                {group.label}
              </h3>
              <div className="flex flex-col">
                {group.requests.map((r) => (
                  <Link
                    key={r.id}
                    href={`/staff/requests/${r.id}`}
                    className="flex items-center justify-between border-t border-neutral-200 py-3 last:border-b hover:bg-neutral-50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <p className="text-xs text-neutral-500 mt-0.5 capitalize">
                        {r.clients?.business_name ?? r.clients?.email ?? "Unknown client"} · {r.type}
                      </p>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded bg-neutral-100 text-neutral-600 flex-shrink-0">
                      {statusLabels[r.status] ?? r.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">
            No open requests have a due date set.
          </p>
        )}
      </main>
    </div>
  );
}

// Buckets requests into Overdue / Today / Tomorrow / named weekdays (this
// week) / individual dates further out — requests is already sorted by
// due_date ascending, so this just needs to walk it once.
function groupByDate(requests) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = new Map();

  for (const r of requests) {
    const due = new Date(`${r.due_date}T00:00:00`);
    const diffDays = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

    let label;
    let overdue = false;
    if (diffDays < 0) {
      label = "Overdue";
      overdue = true;
    } else if (diffDays === 0) {
      label = "Today";
    } else if (diffDays === 1) {
      label = "Tomorrow";
    } else if (diffDays < 7) {
      label = due.toLocaleDateString("en-US", { weekday: "long" });
    } else {
      label = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    const key = overdue ? "Overdue" : label;
    if (!buckets.has(key)) {
      buckets.set(key, { label, overdue, requests: [] });
    }
    buckets.get(key).requests.push(r);
  }

  return Array.from(buckets.values());
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabaseServer";
import { createAdminClient } from "../../lib/supabaseAdmin";
import StaffSidebar from "./StaffSidebar";
import { TIER_PLANS } from "../dashboard/tierPlans";

const STALE_DAYS = 3;
const INACTIVITY_DAYS = 30;

export default async function StaffOverviewPage() {
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
    .select("id, title, status, created_at, client_id, clients(business_name, email)")
    .order("created_at", { ascending: false });

  const { data: subscribers } = await admin
    .from("clients")
    .select("id, business_name, email, tier")
    .not("tier", "is", null)
    .is("archived_at", null);

  const openCount = requests?.filter((r) => r.status !== "delivered").length ?? 0;
  const deliveredCount = requests?.filter((r) => r.status === "delivered").length ?? 0;
  const recent = requests?.slice(0, 5) ?? [];

  const clientCount = subscribers?.length ?? 0;

  const tierCounts = { starter: 0, growth: 0, premium: 0 };
  for (const s of subscribers ?? []) {
    const key = (s.tier ?? "").toLowerCase();
    if (key in tierCounts) tierCounts[key] += 1;
  }
  const mrr = Object.entries(tierCounts).reduce(
    (sum, [tier, count]) => sum + count * (TIER_PLANS[tier]?.price ?? 0),
    0
  );
  const tierSummary = Object.entries(tierCounts)
    .filter(([, count]) => count > 0)
    .map(([tier, count]) => `${count} ${TIER_PLANS[tier]?.name ?? tier}`)
    .join(" · ");

  const staleCutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
  const stale = (requests ?? []).filter(
    (r) => r.status !== "delivered" && new Date(r.created_at).getTime() < staleCutoff
  );

  // requests is already ordered newest-first, so the first request seen per
  // client_id is that client's most recent request.
  const latestRequestByClient = new Map();
  for (const r of requests ?? []) {
    if (r.client_id && !latestRequestByClient.has(r.client_id)) {
      latestRequestByClient.set(r.client_id, r.created_at);
    }
  }
  const inactivityCutoff = Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000;
  const inactive = (subscribers ?? []).filter((s) => {
    const latest = latestRequestByClient.get(s.id);
    return !latest || new Date(latest).getTime() < inactivityCutoff;
  });

  return (
    <div className="min-h-screen flex bg-white">
      <StaffSidebar active="Overview" />

      <main className="flex-1 p-8 flex flex-col gap-6 max-w-3xl">
        <h2 className="text-lg font-medium">Overview</h2>

        {stale.length > 0 && (
          <div className="border border-amber-300 bg-amber-50 rounded p-3">
            <p className="text-sm font-medium text-amber-800">
              {stale.length} request{stale.length === 1 ? "" : "s"} sitting {STALE_DAYS}+ days without delivery
            </p>
            <div className="flex flex-col gap-1 mt-2">
              {stale.map((r) => (
                <Link
                  key={r.id}
                  href={`/staff/requests/${r.id}`}
                  className="text-xs text-amber-700 underline"
                >
                  {r.title} — {r.clients?.business_name ?? r.clients?.email ?? "Unknown client"}
                </Link>
              ))}
            </div>
          </div>
        )}

        {inactive.length > 0 && (
          <div className="border border-blue-200 bg-blue-50 rounded p-3">
            <p className="text-sm font-medium text-blue-800">
              {inactive.length} subscriber{inactive.length === 1 ? "" : "s"} with no request in {INACTIVITY_DAYS}+ days
            </p>
            <div className="flex flex-col gap-1 mt-2">
              {inactive.map((s) => (
                <Link
                  key={s.id}
                  href={`/staff/clients/${s.id}`}
                  className="text-xs text-blue-700 underline"
                >
                  {s.business_name ?? s.email}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-neutral-200 rounded overflow-hidden">
          <Stat label="Open requests" value={openCount} />
          <Stat label="Delivered" value={deliveredCount} />
          <Stat label="Subscribers" value={clientCount} />
          <Stat label="MRR" value={`$${mrr.toLocaleString()}`} />
        </div>

        {tierSummary && <p className="text-xs text-neutral-400 -mt-4">{tierSummary}</p>}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Recent activity</h3>
            <Link href="/staff/requests" className="text-sm text-brand-dark border border-brand-light rounded px-3 py-1.5">
              View all requests
            </Link>
          </div>

          <div className="flex flex-col">
            {recent.length ? (
              recent.map((r) => (
                <Link
                  key={r.id}
                  href={`/staff/requests/${r.id}`}
                  className="flex items-center justify-between border-t border-neutral-200 py-3 last:border-b hover:bg-neutral-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {r.clients?.business_name ?? r.clients?.email ?? "Unknown client"}
                    </p>
                  </div>
                  <span className="text-xs text-neutral-400 capitalize flex-shrink-0">
                    {r.status.replace("_", " ")}
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">
                No requests yet.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white p-4 flex items-baseline justify-between gap-2">
      <p className="text-xs text-neutral-500 whitespace-nowrap">{label}</p>
      <p className="text-base font-medium whitespace-nowrap">{value}</p>
    </div>
  );
}

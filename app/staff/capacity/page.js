import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabaseServer";
import { createAdminClient } from "../../../lib/supabaseAdmin";
import StaffSidebar from "../StaffSidebar";
import { planLimit } from "../../dashboard/tierPlans";

export default async function StaffCapacityPage() {
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

  const { data: subscribers } = await admin
    .from("clients")
    .select("id, business_name, email, tier")
    .not("tier", "is", null)
    .is("archived_at", null)
    .order("business_name", { ascending: true });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: flyersThisMonth } = await admin
    .from("requests")
    .select("client_id")
    .eq("type", "flyer")
    .gte("created_at", monthStart.toISOString());

  const usageByClient = new Map();
  for (const r of flyersThisMonth ?? []) {
    usageByClient.set(r.client_id, (usageByClient.get(r.client_id) ?? 0) + 1);
  }

  const rows = (subscribers ?? [])
    .map((s) => {
      const used = usageByClient.get(s.id) ?? 0;
      const limit = planLimit(s.tier);
      const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
      return { ...s, used, limit, percent };
    })
    .sort((a, b) => b.percent - a.percent);

  return (
    <div className="min-h-screen flex bg-white">
      <StaffSidebar active="Capacity" />

      <main className="flex-1 p-8 max-w-3xl">
        <h2 className="text-lg font-medium mb-1">Capacity</h2>
        <p className="text-sm text-neutral-500 mb-8">
          Flyer usage this month vs. each subscriber's plan limit, most-used first.
        </p>

        <div className="flex flex-col">
          {rows.length ? (
            rows.map((r) => (
              <Link
                key={r.id}
                href={`/staff/clients/${r.id}`}
                className="flex items-center justify-between border-t border-neutral-200 py-3 last:border-b hover:bg-neutral-50 gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{r.business_name ?? r.email}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-brand-dark text-white capitalize flex-shrink-0">
                      {r.tier}
                    </span>
                    {r.percent >= 100 && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-red-100 text-red-700 flex-shrink-0">
                        At capacity
                      </span>
                    )}
                    {r.percent >= 75 && r.percent < 100 && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-800 flex-shrink-0">
                        Near capacity
                      </span>
                    )}
                  </div>
                  <div className="w-full max-w-xs bg-neutral-100 rounded-full h-1.5 mt-2">
                    <div
                      className="h-1.5 rounded-full bg-brand-dark"
                      style={{ width: `${r.percent}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-neutral-500 flex-shrink-0 whitespace-nowrap">
                  {r.used} of {r.limit ?? "—"} used
                </span>
              </Link>
            ))
          ) : (
            <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">
              No active subscribers yet.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

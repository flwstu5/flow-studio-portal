import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabaseServer";
import { createAdminClient } from "../../../lib/supabaseAdmin";
import StaffSidebar from "../StaffSidebar";

export default async function StaffClientsPage() {
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

  const { data: clients } = await admin
    .from("clients")
    .select("id, business_name, email, tier, client_type, renews_at")
    .order("business_name", { ascending: true });

  const { data: requests } = await admin
    .from("requests")
    .select("client_id, status");

  const requestCounts = new Map();
  for (const r of requests ?? []) {
    if (!requestCounts.has(r.client_id)) {
      requestCounts.set(r.client_id, { total: 0, open: 0 });
    }
    const counts = requestCounts.get(r.client_id);
    counts.total += 1;
    if (r.status !== "delivered") counts.open += 1;
  }

  return (
    <div className="min-h-screen flex bg-white">
      <StaffSidebar active="Clients" />

      <main className="flex-1 p-8 max-w-3xl">
        <h2 className="text-lg font-medium mb-6">Clients</h2>

        <div className="flex flex-col">
          {clients?.length ? (
            clients.map((c) => {
              const counts = requestCounts.get(c.id) ?? { total: 0, open: 0 };
              return (
                <Link
                  key={c.id}
                  href={`/staff/clients/${c.id}`}
                  className="flex items-center justify-between border-t border-neutral-200 py-3 last:border-b hover:bg-neutral-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {c.business_name ?? c.email}
                      </span>
                      {c.tier && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-brand-dark text-white capitalize flex-shrink-0">
                          {c.tier}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5 truncate">
                      {c.email} · {c.client_type === "subscriber" ? "Subscriber" : "Project client"}
                    </p>
                  </div>
                  <span className="text-xs text-neutral-400 flex-shrink-0">
                    {counts.open} open · {counts.total} total
                  </span>
                </Link>
              );
            })
          ) : (
            <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">
              No clients yet.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
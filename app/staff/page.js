import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabaseServer";
import { createAdminClient } from "../../lib/supabaseAdmin";
import StaffSidebar from "./StaffSidebar";

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
    .select("id, title, status, created_at, clients(business_name, email)")
    .order("created_at", { ascending: false });

  const { count: clientCount } = await admin
    .from("clients")
    .select("id", { count: "exact", head: true });

  const openCount = requests?.filter((r) => r.status !== "delivered").length ?? 0;
  const deliveredCount = requests?.filter((r) => r.status === "delivered").length ?? 0;
  const recent = requests?.slice(0, 5) ?? [];

  return (
    <div className="min-h-screen flex bg-white">
      <StaffSidebar active="Overview" />

      <main className="flex-1 p-8 flex flex-col gap-6 max-w-3xl">
        <h2 className="text-lg font-medium">Overview</h2>

        <div className="grid grid-cols-3 gap-px bg-neutral-200 rounded overflow-hidden">
          <Stat label="Open requests" value={openCount} />
          <Stat label="Delivered" value={deliveredCount} />
          <Stat label="Total clients" value={clientCount ?? "—"} />
        </div>

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

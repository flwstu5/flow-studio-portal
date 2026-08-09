import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabaseServer";
import { createAdminClient } from "../../../lib/supabaseAdmin";
import StaffSidebar from "../StaffSidebar";
import ClientsList from "./ClientsList";

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
    .select("id, business_name, email, tier, client_type, renews_at, archived_at")
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

  const { data: snapshots } = await admin
    .from("snapshots")
    .select("client_id, grade_letter, grade_percent, opportunity_count, created_at")
    .order("created_at", { ascending: false });

  // Keep only the most recent snapshot per client — snapshots are already
  // ordered newest-first, so the first one seen per client_id wins.
  const latestSnapshotByClient = new Map();
  for (const s of snapshots ?? []) {
    if (!latestSnapshotByClient.has(s.client_id)) {
      latestSnapshotByClient.set(s.client_id, s);
    }
  }

  const rows = (clients ?? []).map((c) => {
    const counts = requestCounts.get(c.id) ?? { total: 0, open: 0 };
    const snapshot = latestSnapshotByClient.get(c.id);
    return {
      ...c,
      openCount: counts.open,
      totalCount: counts.total,
      snapshotGrade: snapshot?.grade_letter ?? null,
      snapshotOpportunityCount: snapshot?.opportunity_count ?? null,
    };
  });

  return (
    <div className="min-h-screen flex bg-white">
      <StaffSidebar active="Clients" />

      <main className="flex-1 p-8 max-w-3xl">
        <h2 className="text-lg font-medium mb-6">Clients</h2>
        <ClientsList clients={rows} />
      </main>
    </div>
  );
}
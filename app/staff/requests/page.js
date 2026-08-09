import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabaseServer";
import { createAdminClient } from "../../../lib/supabaseAdmin";
import StaffSidebar from "../StaffSidebar";
import RequestsList from "./RequestsList";

export default async function StaffRequestsPage() {
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
    .select("id, title, type, status, brief, created_at, delivered_at, due_date, file_path, client_id, clients(business_name, tier, email)")
    .order("created_at", { ascending: false });

  const requestsWithLinks = await Promise.all(
    (requests ?? []).map(async (r) => {
      if (!r.file_path) return r;
      const { data, error } = await admin.storage
        .from("deliverables")
        .createSignedUrl(r.file_path, 60 * 60);
      if (error) {
        console.error("Signed URL error for", r.file_path, ":", error.message);
      }
      const fileName = r.file_path.split("/").pop().replace(/^\d+-/, "");
      return { ...r, viewUrl: data?.signedUrl ?? null, fileName };
    })
  );

  const byClient = new Map();
  for (const r of requestsWithLinks) {
    const key = r.client_id ?? "unknown";
    if (!byClient.has(key)) {
      byClient.set(key, {
        businessName: r.clients?.business_name ?? r.clients?.email ?? "Unknown client",
        tier: r.clients?.tier,
        requests: [],
      });
    }
    byClient.get(key).requests.push(r);
  }

  // Within each client group, surface the most urgent requests first:
  // open requests with the nearest (or overdue) due date, then open
  // requests with no due date, then delivered requests last.
  function urgencyRank(r) {
    if (r.status === "delivered") return 2;
    if (r.due_date) return 0;
    return 1;
  }
  for (const group of byClient.values()) {
    group.requests.sort((a, b) => {
      const rankDiff = urgencyRank(a) - urgencyRank(b);
      if (rankDiff !== 0) return rankDiff;
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      return b.created_at.localeCompare(a.created_at);
    });
  }

  const clientGroups = Array.from(byClient.values()).sort((a, b) => {
    const aLatest = a.requests[0]?.created_at ?? "";
    const bLatest = b.requests[0]?.created_at ?? "";
    return bLatest.localeCompare(aLatest);
  });

  return (
    <div className="min-h-screen flex bg-white">
      <StaffSidebar active="Requests" />

      <main className="flex-1 p-8 max-w-4xl">
        <h2 className="text-lg font-medium mb-1">All requests</h2>
        <p className="text-sm text-neutral-500 mb-8">
          Grouped by client, most recently active first.
        </p>

        <RequestsList clientGroups={clientGroups} />
      </main>
    </div>
  );
}
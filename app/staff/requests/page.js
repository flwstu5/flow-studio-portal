import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabaseServer";
import { createAdminClient } from "../../../lib/supabaseAdmin";
import StaffSidebar from "../StaffSidebar";
import StatusSelect from "../StatusSelect";
import UploadDeliverable from "../UploadDeliverable";

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
    .select("id, title, type, status, brief, created_at, delivered_at, file_path, client_id, clients(business_name, tier, email)")
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

        <div className="flex flex-col gap-6">
          {clientGroups.length ? (
            clientGroups.map((group, i) => (
              <div key={i} className="border border-neutral-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{group.businessName}</span>
                    {group.tier && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-brand-dark text-white capitalize">
                        {group.tier}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-500">
                    {group.requests.length} request{group.requests.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="flex flex-col px-4">
                  {group.requests.map((r) => (
                    <RequestRow key={r.id} request={r} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">
              No requests yet.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

const statusStyles = {
  submitted: "bg-brand-tint text-brand-dark",
  in_review: "bg-brand-tint text-brand-dark",
  delivered: "bg-green-100 text-green-700",
};

const statusLabels = {
  submitted: "Submitted",
  in_review: "In review",
  delivered: "Delivered",
};

function RequestRow({ request }) {
  return (
    <div className="border-t border-neutral-100 py-3 flex items-start justify-between gap-4 first:border-t-0">
      <div className="min-w-0">
        <Link href={`/staff/requests/${request.id}`} className="text-sm font-medium truncate hover:underline">{request.title}</Link>
        <p className="text-xs text-neutral-500 mt-0.5 capitalize">
          {request.type}
          {" · "}
          <span className={`px-1.5 py-0.5 rounded ${statusStyles[request.status] ?? "bg-neutral-100 text-neutral-600"}`}>
            {statusLabels[request.status] ?? request.status}
          </span>
        </p>
        {request.brief && (
          <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{request.brief}</p>
        )}
        {request.fileName && (
          <p className="text-xs text-neutral-500 mt-1">
            📎{" "}
            {request.viewUrl ? (
              <a href={request.viewUrl} target="_blank" rel="noopener noreferrer" className="underline">
                {request.fileName}
              </a>
            ) : (
              request.fileName
            )}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <StatusSelect requestId={request.id} currentStatus={request.status} />
        <UploadDeliverable requestId={request.id} hasFile={!!request.file_path} />
      </div>
    </div>
  );
}
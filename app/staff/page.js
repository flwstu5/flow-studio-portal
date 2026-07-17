import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabaseServer";
import { createAdminClient } from "../../lib/supabaseAdmin";
import StatusSelect from "./StatusSelect";
import UploadDeliverable from "./UploadDeliverable";

export default async function StaffPage() {
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

  // Staff can see every client's requests, so this uses the admin client
  // rather than the normal RLS-scoped one.
  const admin = createAdminClient();

  const { data: requests } = await admin
    .from("requests")
    .select("id, title, type, status, brief, created_at, delivered_at, file_path, clients(business_name, tier, email)")
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
      // file_path looks like "<requestId>/<timestamp>-<original filename>"
      const fileName = r.file_path.split("/").pop().replace(/^\d+-/, "");
      return { ...r, viewUrl: data?.signedUrl ?? null, fileName };
    })
  );

  const openRequests = requestsWithLinks.filter((r) => r.status !== "delivered");
  const deliveredRequests = requestsWithLinks.filter((r) => r.status === "delivered");

  return (
    <main className="min-h-screen bg-white px-6 py-10 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-6 h-6 rounded-md bg-brand-dark" />
        <span className="text-sm font-medium">Flow Studio — Staff</span>
      </div>

      <h1 className="text-xl font-medium mb-1">All requests</h1>
      <p className="text-sm text-neutral-500 mb-8">
        Every client's requests in one queue, most recent first.
      </p>

      <section className="mb-10">
        <h2 className="text-sm font-medium mb-2">
          Open ({openRequests.length})
        </h2>
        <div className="flex flex-col">
          {openRequests.length ? (
            openRequests.map((r) => <RequestRow key={r.id} request={r} />)
          ) : (
            <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">
              Nothing open right now.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-2">
          Delivered ({deliveredRequests.length})
        </h2>
        <div className="flex flex-col">
          {deliveredRequests.length ? (
            deliveredRequests.map((r) => <RequestRow key={r.id} request={r} />)
          ) : (
            <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">
              Nothing delivered yet.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function RequestRow({ request }) {
  return (
    <div className="border-t border-neutral-200 py-3 flex items-start justify-between gap-4 last:border-b">
      <div className="min-w-0">
        <Link href={`/staff/requests/${request.id}`} className="text-sm font-medium truncate hover:underline">{request.title}</Link>
        <p className="text-xs text-neutral-500 mt-0.5">
          {request.clients?.business_name ?? request.clients?.email ?? "Unknown client"}
          {" · "}
          {request.type}
          {request.clients?.tier ? ` · ${request.clients.tier}` : ""}
        </p>
        {request.brief && (
          <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{request.brief}</p>
        )}
        {request.fileName && (
          <p className="text-xs text-neutral-500 mt-1">
            📎{" "}
            {request.viewUrl ? (
              <a
                href={request.viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
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

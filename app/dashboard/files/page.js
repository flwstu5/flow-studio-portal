import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabaseServer";
import { createAdminClient } from "../../../lib/supabaseAdmin";
import Sidebar from "../Sidebar";

export default async function FilesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, business_name")
    .eq("auth_user_id", user.id)
    .single();

  const { data: requests } = await supabase
    .from("requests")
    .select("id, title, delivered_at, file_path")
    .eq("client_id", client?.id)
    .not("file_path", "is", null)
    .order("delivered_at", { ascending: false });

  const admin = createAdminClient();

  const requestIds = (requests ?? []).map((r) => r.id);
  const { data: allFiles } = requestIds.length
    ? await admin
        .from("request_files")
        .select("id, request_id, file_path, uploaded_at")
        .in("request_id", requestIds)
        .order("uploaded_at", { ascending: false })
    : { data: [] };

  const filesByRequest = new Map();
  for (const f of allFiles ?? []) {
    if (!filesByRequest.has(f.request_id)) filesByRequest.set(f.request_id, []);
    filesByRequest.get(f.request_id).push(f);
  }

  // Flatten to one row per file (a request can now have several), falling
  // back to the request's single file_path if request_files hasn't been
  // backfilled yet.
  const fileRows = [];
  for (const r of requests ?? []) {
    const rowsForRequest = filesByRequest.get(r.id) ?? (r.file_path ? [{ id: r.id, file_path: r.file_path, uploaded_at: r.delivered_at }] : []);
    for (const f of rowsForRequest) {
      fileRows.push({ requestId: r.id, requestTitle: r.title, deliveredAt: f.uploaded_at ?? r.delivered_at, filePath: f.file_path, key: f.id });
    }
  }

  const filesWithLinks = await Promise.all(
    fileRows.map(async (f) => {
      const { data, error } = await admin.storage
        .from("deliverables")
        .createSignedUrl(f.filePath, 60 * 60, { download: true });
      if (error) {
        console.error("Signed URL error for", f.filePath, ":", error.message);
      }
      const fileName = f.filePath.split("/").pop().replace(/^\d+-/, "");
      return { ...f, downloadUrl: data?.signedUrl ?? null, fileName };
    })
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      <Sidebar businessName={client?.business_name} userEmail={user.email} />

      <main className="flex-1 w-full p-4 sm:p-6 md:p-8 flex flex-col gap-6 max-w-3xl">
        <h2 className="text-lg font-medium">Files</h2>

        <div className="flex flex-col">
          {filesWithLinks.length ? (
            filesWithLinks.map((f) => (
              <div
                key={f.key}
                className="flex items-center justify-between border-t border-neutral-200 py-3 last:border-b"
              >
                <div className="min-w-0">
                  <Link href={`/dashboard/requests/${f.requestId}`} className="text-sm font-medium hover:underline">
                    {f.requestTitle}
                  </Link>
                  <p className="text-xs text-neutral-500 mt-0.5 truncate">
                    📎 {f.fileName} · Delivered {formatDate(f.deliveredAt)}
                  </p>
                </div>
                {f.downloadUrl && (
                  <a
                    href={f.downloadUrl}
                    className="text-xs font-medium text-[var(--brand-color)] border border-[var(--brand-light)] rounded px-2.5 py-1 flex-shrink-0"
                  >
                    Download
                  </a>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">
              No files delivered yet.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

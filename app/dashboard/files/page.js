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
    .select("*")
    .eq("client_id", client?.id)
    .not("file_path", "is", null)
    .order("delivered_at", { ascending: false });

  const admin = createAdminClient();
  const filesWithLinks = await Promise.all(
    (requests ?? []).map(async (r) => {
      const { data, error } = await admin.storage
        .from("deliverables")
        .createSignedUrl(r.file_path, 60 * 60, { download: true });
      if (error) {
        console.error("Signed URL error for", r.file_path, ":", error.message);
      }
      const fileName = r.file_path.split("/").pop().replace(/^\d+-/, "");
      return { ...r, downloadUrl: data?.signedUrl ?? null, fileName };
    })
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      <Sidebar businessName={client?.business_name} userEmail={user.email} />

      <main className="flex-1 w-full p-4 sm:p-6 md:p-8 flex flex-col gap-6 max-w-3xl">
        <h2 className="text-lg font-medium">Files</h2>

        <div className="flex flex-col">
          {filesWithLinks.length ? (
            filesWithLinks.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between border-t border-neutral-200 py-3 last:border-b"
              >
                <div className="min-w-0">
                  <Link href={`/dashboard/requests/${r.id}`} className="text-sm font-medium hover:underline">
                    {r.title}
                  </Link>
                  <p className="text-xs text-neutral-500 mt-0.5 truncate">
                    📎 {r.fileName} · Delivered {formatDate(r.delivered_at)}
                  </p>
                </div>
                {r.downloadUrl && (
                  <a
                    href={r.downloadUrl}
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

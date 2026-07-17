import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabaseServer";
import { createAdminClient } from "../../../lib/supabaseAdmin";
import StaffSidebar from "../StaffSidebar";

export default async function StaffFilesPage() {
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
    .select("id, title, file_path, delivered_at, clients(business_name, email)")
    .not("file_path", "is", null)
    .order("delivered_at", { ascending: false });

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
    <div className="min-h-screen flex bg-white">
      <StaffSidebar active="Files" />

      <main className="flex-1 p-8 max-w-3xl">
        <h2 className="text-lg font-medium mb-6">Files</h2>

        <div className="flex flex-col">
          {filesWithLinks.length ? (
            filesWithLinks.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between border-t border-neutral-200 py-3 last:border-b"
              >
                <div className="min-w-0">
                  <Link href={`/staff/requests/${r.id}`} className="text-sm font-medium hover:underline">
                    {r.title}
                  </Link>
                  <p className="text-xs text-neutral-500 mt-0.5 truncate">
                    {r.clients?.business_name ?? r.clients?.email} · 📎 {r.fileName} · Delivered {formatDate(r.delivered_at)}
                  </p>
                </div>
                {r.downloadUrl && (
                  <a href={r.downloadUrl} className="text-xs font-medium text-brand-dark border border-brand-light rounded px-2.5 py-1 flex-shrink-0">
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

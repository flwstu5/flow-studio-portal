import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabaseServer";
import { createAdminClient } from "../../../lib/supabaseAdmin";
import SignOutButton from "../SignOutButton";

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
    <div className="min-h-screen flex bg-white">
      <aside className="w-44 border-r border-neutral-200 p-4 flex flex-col gap-1">
        <div className="flex items-center gap-2 px-2 pb-6">
          <div className="w-5 h-5 rounded-md bg-brand-dark" />
          <span className="text-sm font-medium">Flow Studio</span>
        </div>

        <NavItem label="Overview" href="/dashboard" />
        <NavItem label="Requests" href="/dashboard/requests" />
        <NavItem label="Files" href="/dashboard/files" active />
        <NavItem label="Messages" href="/dashboard/messages" />

        <div className="mt-auto flex items-center gap-2 px-2 pt-4">
          <div className="w-6 h-6 rounded-full bg-brand-light flex items-center justify-center text-[10px] font-medium text-brand-dark">
            {(client?.business_name ?? "?").slice(0, 2).toUpperCase()}
          </div>
          <span className="text-xs text-neutral-500 truncate">
            {client?.business_name ?? user.email}
          </span>
        </div>
        <SignOutButton />
      </aside>

      <main className="flex-1 p-8 flex flex-col gap-6 max-w-3xl">
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
                    className="text-xs font-medium text-brand-dark border border-brand-light rounded px-2.5 py-1 flex-shrink-0"
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

function NavItem({ label, href, active }) {
  return (
    <Link
      href={href}
      className={`text-sm px-2.5 py-2 rounded block ${
        active ? "bg-brand-tint text-brand-dark font-medium" : "text-neutral-500"
      }`}
    >
      {label}
    </Link>
  );
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

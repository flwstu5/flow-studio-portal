import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabaseServer";
import { createAdminClient } from "../../lib/supabaseAdmin";
import SignOutButton from "./SignOutButton";

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

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // "clients" row: one per logged-in user, created via the Stripe webhook
  // (or manually, for early/manual signups) — see supabase/schema.sql
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  const { data: requests } = await supabase
    .from("requests")
    .select("*")
    .eq("client_id", client?.id)
    .order("created_at", { ascending: false });

  // The requests above are already scoped to this client's own rows via
  // RLS, so it's safe to generate signed download links for their files.
  const admin = createAdminClient();
  const requestsWithLinks = await Promise.all(
    (requests ?? []).map(async (r) => {
      if (!r.file_path) return r;
      const { data, error } = await admin.storage
        .from("deliverables")
        .createSignedUrl(r.file_path, 60 * 60, { download: true }); // valid 1 hour
      if (error) {
        console.error("Signed URL error for", r.file_path, ":", error.message);
      }
      return { ...r, downloadUrl: data?.signedUrl ?? null };
    })
  );

  const flyersUsed =
    requestsWithLinks?.filter((r) => {
      const created = new Date(r.created_at);
      const now = new Date();
      return (
        r.type === "flyer" &&
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      );
    }).length ?? 0;

  const openCount = requestsWithLinks?.filter((r) => r.status !== "delivered").length ?? 0;

  return (
    <div className="min-h-screen flex bg-white">
      <aside className="w-44 border-r border-neutral-200 p-4 flex flex-col gap-1">
        <div className="flex items-center gap-2 px-2 pb-6">
          <div className="w-5 h-5 rounded-md bg-brand-dark" />
          <span className="text-sm font-medium">Flow Studio</span>
        </div>

        <NavItem label="Overview" active />
        <NavItem label="Requests" />
        <NavItem label="Files" />
        <NavItem label="Messages" />

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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Overview</h2>
          <span className="text-xs font-medium px-3 py-1 rounded bg-brand-dark text-white capitalize">
            {client?.tier ?? "No plan"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-px bg-neutral-200 rounded overflow-hidden">
          <Stat label="Flyers used" value={client?.tier ? `${flyersUsed} of ${planLimit(client.tier)}` : "—"} />
          <Stat label="Open requests" value={openCount} />
          <Stat label="Renews" value={client?.renews_at ? formatDate(client.renews_at) : "—"} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Requests</h3>
            <Link
              href="/dashboard/new-request"
              className="text-sm text-brand-dark border border-brand-light rounded px-3 py-1.5"
            >
              + New request
            </Link>
          </div>

          <div className="flex flex-col">
            {requestsWithLinks?.length ? (
              requestsWithLinks.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between border-t border-neutral-200 py-3 last:border-b"
                >
                  <div>
                    <Link href={`/dashboard/requests/${r.id}`} className="text-sm font-medium hover:underline">{r.title}</Link>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {r.status === "delivered" ? "Delivered" : "Submitted"}{" "}
                      {formatDate(r.status === "delivered" ? r.delivered_at : r.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.downloadUrl && (
                      <a
                        href={r.downloadUrl}
                        className="text-xs font-medium text-brand-dark border border-brand-light rounded px-2.5 py-1"
                      >
                        Download
                      </a>
                    )}
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded ${statusStyles[r.status] ?? "bg-neutral-100 text-neutral-600"}`}
                    >
                      {statusLabels[r.status] ?? r.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">
                No requests yet. Submit your first flyer request to get started.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ label, active }) {
  return (
    <div
      className={`text-sm px-2.5 py-2 rounded ${
        active ? "bg-brand-tint text-brand-dark font-medium" : "text-neutral-500"
      }`}
    >
      {label}
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

function planLimit(tier) {
  const limits = { starter: 2, growth: 4, premium: 8 };
  return limits[tier?.toLowerCase()] ?? "—";
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabaseServer";
import SignOutButton from "../SignOutButton";

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

export default async function RequestsPage() {
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
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen flex bg-white">
      <aside className="w-44 border-r border-neutral-200 p-4 flex flex-col gap-1">
        <div className="flex items-center gap-2 px-2 pb-6">
          <img src="/logo-icon.png" alt="Flow Studio" className="w-5 h-5 rounded" />
          <span className="text-sm font-medium">Flow Studio</span>
        </div>

        <NavItem label="Overview" href="/dashboard" />
        <NavItem label="Requests" href="/dashboard/requests" active />
        <NavItem label="Files" href="/dashboard/files" />
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">All requests</h2>
          <Link
            href="/dashboard/new-request"
            className="text-sm text-brand-dark border border-brand-light rounded px-3 py-1.5"
          >
            + New request
          </Link>
        </div>

        <div className="flex flex-col">
          {requests?.length ? (
            requests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between border-t border-neutral-200 py-3 last:border-b"
              >
                <div>
                  <Link href={`/dashboard/requests/${r.id}`} className="text-sm font-medium hover:underline">
                    {r.title}
                  </Link>
                  <p className="text-xs text-neutral-500 mt-0.5 capitalize">
                    {r.type} · {formatDate(r.created_at)}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded ${statusStyles[r.status] ?? "bg-neutral-100 text-neutral-600"}`}
                >
                  {statusLabels[r.status] ?? r.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">
              No requests yet. Submit your first flyer request to get started.
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

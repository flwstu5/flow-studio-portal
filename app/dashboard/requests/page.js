import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabaseServer";
import Sidebar from "../Sidebar";

const statusStyles = {
  submitted: "bg-[var(--brand-tint)] text-[var(--brand-color)]",
  in_review: "bg-[var(--brand-tint)] text-[var(--brand-color)]",
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
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      <Sidebar businessName={client?.business_name} userEmail={user.email} />

      <main className="flex-1 w-full p-4 sm:p-6 md:p-8 flex flex-col gap-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">All requests</h2>
          <Link
            href="/dashboard/new-request"
            className="text-sm text-[var(--brand-color)] border border-[var(--brand-light)] rounded px-3 py-1.5"
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

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

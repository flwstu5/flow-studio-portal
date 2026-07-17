import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabaseServer";
import { createAdminClient } from "../../../../lib/supabaseAdmin";
import StaffSidebar from "../../StaffSidebar";

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

export default async function StaffClientDetailPage({ params }) {
  const { id } = await params;
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

  const { data: client } = await admin
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (!client) {
    redirect("/staff/clients");
  }

  const { data: requests } = await admin
    .from("requests")
    .select("id, title, type, status, created_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen flex bg-white">
      <StaffSidebar active="Clients" />

      <main className="flex-1 p-8 max-w-3xl">
        <Link href="/staff/clients" className="text-xs text-neutral-400">
          ← Back to clients
        </Link>

        <div className="mt-4 mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-medium">{client.business_name ?? client.email}</h1>
            {client.tier && (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-brand-dark text-white capitalize">
                {client.tier}
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            {client.email} · {client.client_type === "subscriber" ? "Subscriber" : "Project client"}
            {client.renews_at ? ` · Renews ${formatDate(client.renews_at)}` : ""}
          </p>
        </div>

        <h2 className="text-sm font-medium mb-2">Requests</h2>
        <div className="flex flex-col">
          {requests?.length ? (
            requests.map((r) => (
              <Link
                key={r.id}
                href={`/staff/requests/${r.id}`}
                className="flex items-center justify-between border-t border-neutral-200 py-3 last:border-b hover:bg-neutral-50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-xs text-neutral-500 mt-0.5 capitalize">
                    {r.type} · {formatDate(r.created_at)}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded flex-shrink-0 ${statusStyles[r.status] ?? "bg-neutral-100 text-neutral-600"}`}
                >
                  {statusLabels[r.status] ?? r.status}
                </span>
              </Link>
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

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
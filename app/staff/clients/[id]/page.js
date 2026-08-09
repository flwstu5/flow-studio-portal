import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabaseServer";
import { createAdminClient } from "../../../../lib/supabaseAdmin";
import StaffSidebar from "../../StaffSidebar";
import EditClientForm from "./EditClientForm";
import ArchiveButton from "./ArchiveButton";
import GradeTrend from "../../../dashboard/GradeTrend";

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

  const { data: snapshots } = await admin
    .from("snapshots")
    .select("id, url, grade_letter, grade_percent, opportunity_count, created_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const latestSnapshot = snapshots?.[0] ?? null;
  const snapshotUrl = client.website_url || latestSnapshot?.url || "";
  const runSnapshotHref = snapshotUrl
    ? `https://www.flowstudiogrfx.com/snapshot?url=${encodeURIComponent(snapshotUrl)}&email=${encodeURIComponent(client.email)}&business=${encodeURIComponent(client.business_name ?? "")}`
    : null;

  return (
    <div className="min-h-screen flex bg-white">
      <StaffSidebar active="Clients" />

      <main className="flex-1 p-8 max-w-3xl">
        <Link href="/staff/clients" className="text-xs text-neutral-400">
          ← Back to clients
        </Link>

        <div className="mt-4 mb-8">
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-medium">{client.business_name ?? client.email}</h1>
              {client.tier && (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-brand-dark text-white capitalize">
                  {client.tier}
                </span>
              )}
              {client.cancel_at_period_end && (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  Canceling {client.renews_at ? formatDate(client.renews_at) : ""}
                </span>
              )}
              {client.archived_at && (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-neutral-200 text-neutral-600">
                  Archived
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <EditClientForm
                clientId={client.id}
                currentBusinessName={client.business_name}
                currentTier={client.tier}
                currentWebsiteUrl={client.website_url}
              />
              <ArchiveButton clientId={client.id} archived={!!client.archived_at} />
            </div>
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            {client.email} · {client.client_type === "subscriber" ? "Subscriber" : "Project client"}
            {client.renews_at ? ` · Renews ${formatDate(client.renews_at)}` : ""}
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-medium">Website snapshot</h2>
              <GradeTrend snapshots={snapshots ?? []} width={90} height={24} />
            </div>
            {runSnapshotHref ? (
              <a
                href={runSnapshotHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-dark border border-brand-light rounded px-2.5 py-1"
              >
                Run snapshot
              </a>
            ) : (
              <span className="text-xs text-neutral-400">Add a website above to enable</span>
            )}
          </div>

          {latestSnapshot ? (
            <div className="flex flex-col">
              {snapshots.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between border-t border-neutral-200 py-3 last:border-b"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.url}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {s.opportunity_count ?? 0} opportunit{s.opportunity_count === 1 ? "y" : "ies"} found · {formatDate(s.created_at)}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded bg-brand-tint text-brand-dark flex-shrink-0">
                    {s.grade_letter ?? "—"} ({s.grade_percent ?? "—"}%)
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">
              No snapshots run yet.
            </p>
          )}
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
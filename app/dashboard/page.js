import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabaseServer";
import { createAdminClient } from "../../lib/supabaseAdmin";
import Sidebar from "./Sidebar";
import GradeTrend from "./GradeTrend";
import PlanUpgradeCard from "./PlanUpgradeCard";
import BillingButton from "./BillingButton";
import { planLimit } from "./tierPlans";

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

export default async function DashboardPage({ searchParams }) {
  const { billing } = (await searchParams) ?? {};
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  let clientLogoUrl = null;
  if (client?.logo_path) {
    const { data } = supabase.storage.from("client-logos").getPublicUrl(client.logo_path);
    clientLogoUrl = data?.publicUrl ?? null;
  }

  const { data: requests } = await supabase
    .from("requests")
    .select("*")
    .eq("client_id", client?.id)
    .order("created_at", { ascending: false });

  const { data: snapshotHistory } = await supabase
    .from("snapshots")
    .select("*")
    .eq("client_id", client?.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const snapshot = snapshotHistory?.[0] ?? null;

  const admin = createAdminClient();
  const requestsWithLinks = await Promise.all(
    (requests ?? []).map(async (r) => {
      if (!r.file_path) return r;
      const { data, error } = await admin.storage
        .from("deliverables")
        .createSignedUrl(r.file_path, 60 * 60, { download: true });
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
  const flyerLimit = planLimit(client?.tier);

  // Simple activation checklist for subscribers still getting set up —
  // self-dismisses once every item is complete, so it never overstays.
  const checklist = client?.tier
    ? [
        { label: "Add your logo", done: !!client?.logo_path, href: "/dashboard/profile" },
        { label: "Submit your first request", done: (requestsWithLinks?.length ?? 0) > 0, href: "/dashboard/new-request" },
        { label: "Get your first flyer delivered", done: requestsWithLinks?.some((r) => r.status === "delivered") ?? false, href: null },
      ]
    : [];
  const checklistDone = checklist.filter((item) => item.done).length;
  const showChecklist = checklist.length > 0 && checklistDone < checklist.length;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      <Sidebar
        businessName={client?.business_name}
        userEmail={user.email}
        logoUrl={clientLogoUrl}
        showEditProfileLink
      />

      <main className="flex-1 w-full p-4 sm:p-6 md:p-8 flex flex-col gap-6 max-w-3xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-medium">Overview</h2>
          <div className="flex items-center gap-2">
            {client?.tier && <BillingButton />}
            <span className="text-xs font-medium px-3 py-1 rounded bg-[var(--brand-color)] text-white capitalize">
              {client?.tier ?? "No plan"}
            </span>
          </div>
        </div>

        {client?.cancel_at_period_end && client?.renews_at && (
          <div className="border border-amber-300 bg-amber-50 rounded p-3 text-xs text-amber-800">
            Your subscription is set to cancel on {formatDate(client.renews_at)}. You'll keep access until then —
            changed your mind? Use "Manage billing" above.
          </div>
        )}

        {billing === "unavailable" && (
          <div className="border border-neutral-200 bg-neutral-50 rounded p-3 text-xs text-neutral-600">
            Billing management isn't set up on your account yet — email us and we'll sort it out.
          </div>
        )}
        {billing === "error" && (
          <div className="border border-neutral-200 bg-neutral-50 rounded p-3 text-xs text-neutral-600">
            Something went wrong opening billing. Try again in a moment, or email us.
          </div>
        )}

        {showChecklist && (
          <div className="border border-neutral-200 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Get set up</p>
              <span className="text-xs text-neutral-400">{checklistDone} of {checklist.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {checklist.map((item) => {
                const row = (
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${
                        item.done ? "bg-[var(--brand-color)] border-[var(--brand-color)]" : "border-neutral-300"
                      }`}
                    >
                      {item.done && <span className="text-white text-[10px] leading-none">✓</span>}
                    </span>
                    <span className={`text-sm ${item.done ? "text-neutral-400 line-through" : "text-neutral-700"}`}>
                      {item.label}
                    </span>
                  </div>
                );
                return item.href && !item.done ? (
                  <Link key={item.label} href={item.href} className="hover:opacity-70">
                    {row}
                  </Link>
                ) : (
                  <div key={item.label}>{row}</div>
                );
              })}
            </div>
          </div>
        )}

        {snapshot && (
          <div className="border border-neutral-200 rounded p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-[var(--brand-color)] flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-semibold text-[var(--brand-color)]">{snapshot.grade_letter ?? "—"}</span>
              </div>
              <div>
                <p className="text-sm font-medium">Website snapshot</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {snapshot.opportunity_count ?? 0} opportunit{snapshot.opportunity_count === 1 ? "y" : "ies"} found · checked {formatDate(snapshot.created_at)}
                </p>
              </div>
            </div>
            <GradeTrend snapshots={snapshotHistory} />
            <a
              href={`https://www.flowstudiogrfx.com/snapshot?url=${encodeURIComponent(snapshot.url)}&email=${encodeURIComponent(user.email)}&business=${encodeURIComponent(client?.business_name ?? "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-[var(--brand-color)] border border-[var(--brand-light)] rounded px-3 py-1.5 flex-shrink-0"
            >
              Run a fresh check
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-neutral-200 rounded overflow-hidden">
          <Stat label="Flyers used" value={flyerLimit ? `${flyersUsed} of ${flyerLimit}` : "—"} />
          <Stat label="Open requests" value={openCount} />
          <Stat label="Renews" value={client?.renews_at ? formatDate(client.renews_at) : "—"} />
        </div>

        <PlanUpgradeCard tier={client?.tier} flyersUsed={flyersUsed} limit={flyerLimit} />

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Requests</h3>
            <Link
              href="/dashboard/new-request"
              className="text-sm text-[var(--brand-color)] border border-[var(--brand-light)] rounded px-3 py-1.5"
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
                      <a href={r.downloadUrl} className="text-xs font-medium text-[var(--brand-color)] border border-[var(--brand-light)] rounded px-2.5 py-1">
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

function Stat({ label, value }) {
  return (
    <div className="bg-white p-4 flex items-baseline justify-between gap-2">
      <p className="text-xs text-neutral-500 whitespace-nowrap">{label}</p>
      <p className="text-base font-medium whitespace-nowrap">{value}</p>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
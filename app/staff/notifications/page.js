import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabaseServer";
import { createAdminClient } from "../../../lib/supabaseAdmin";
import StaffSidebar from "../StaffSidebar";

export default async function StaffNotificationsPage() {
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

  const { data: notifications } = await admin
    .from("notifications")
    .select("*")
    .eq("recipient_type", "staff")
    .order("created_at", { ascending: false })
    .limit(50);

  // Shared team inbox — no per-staff-member accounts exist anywhere else in
  // this app, so any staff member opening this page marks it read for all.
  const unreadIds = (notifications ?? []).filter((n) => !n.read_at).map((n) => n.id);
  if (unreadIds.length) {
    await admin.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
  }

  return (
    <div className="min-h-screen flex bg-white">
      <StaffSidebar active="Notifications" />

      <main className="flex-1 p-8 max-w-3xl">
        <h2 className="text-lg font-medium mb-6">Notifications</h2>

        <div className="flex flex-col">
          {notifications?.length ? (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={n.link}
                className={`border-t border-neutral-200 py-3 last:border-b block hover:bg-neutral-50 ${
                  !n.read_at ? "bg-brand-tint" : ""
                }`}
              >
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="text-xs text-neutral-500 mt-0.5">{n.body}</p>}
                <p className="text-[11px] text-neutral-400 mt-1">{formatDate(n.created_at)}</p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">
              No notifications yet.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

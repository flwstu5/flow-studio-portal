import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabaseServer";
import { createAdminClient } from "../../../lib/supabaseAdmin";
import Sidebar from "../Sidebar";

export default async function NotificationsPage() {
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

  const admin = createAdminClient();

  const { data: notifications } = await admin
    .from("notifications")
    .select("*")
    .eq("recipient_type", "client")
    .eq("client_id", client?.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Mark everything read now that the client's looking at this page.
  const unreadIds = (notifications ?? []).filter((n) => !n.read_at).map((n) => n.id);
  if (unreadIds.length) {
    await admin.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      <Sidebar businessName={client?.business_name} userEmail={user.email} />

      <main className="flex-1 w-full p-4 sm:p-6 md:p-8 flex flex-col gap-6 max-w-2xl">
        <h2 className="text-lg font-medium">Notifications</h2>

        <div className="flex flex-col">
          {notifications?.length ? (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={n.link}
                className={`border-t border-neutral-200 py-3 last:border-b block ${
                  !n.read_at ? "bg-[var(--brand-tint)] -mx-2 px-2 rounded" : ""
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

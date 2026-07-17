import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabaseServer";
import { createAdminClient } from "../../../lib/supabaseAdmin";
import StaffSidebar from "../StaffSidebar";

export default async function StaffMessagesPage() {
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
    .select("id, title, clients(business_name, email)")
    .order("created_at", { ascending: false });

  const requestsWithPreview = await Promise.all(
    (requests ?? []).map(async (r) => {
      const { data: lastMessage } = await admin
        .from("messages")
        .select("body, sender_type, created_at")
        .eq("request_id", r.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return { ...r, lastMessage };
    })
  );

  const withMessages = requestsWithPreview
    .filter((r) => r.lastMessage)
    .sort((a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at));

  return (
    <div className="min-h-screen flex bg-white">
      <StaffSidebar active="Messages" />

      <main className="flex-1 p-8 max-w-3xl">
        <h2 className="text-lg font-medium mb-6">Messages</h2>

        <div className="flex flex-col">
          {withMessages.length ? (
            withMessages.map((r) => (
              <Link
                key={r.id}
                href={`/staff/requests/${r.id}`}
                className="border-t border-neutral-200 py-3 last:border-b flex items-center justify-between gap-4 hover:bg-neutral-50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-xs text-neutral-500 mt-0.5 truncate">
                    {r.clients?.business_name ?? r.clients?.email} —{" "}
                    {r.lastMessage.sender_type === "staff" ? "You" : "Client"}: {r.lastMessage.body}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">
              No messages yet.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

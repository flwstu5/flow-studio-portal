import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabaseServer";

export default async function MessagesOverviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  const { data: requests } = await supabase
    .from("requests")
    .select("id, title, status")
    .eq("client_id", client?.id)
    .order("created_at", { ascending: false });

  // Pull the most recent message for each request, so this page can show
  // a quick preview without loading every message on every job.
  const requestsWithPreview = await Promise.all(
    (requests ?? []).map(async (r) => {
      const { data: lastMessage } = await supabase
        .from("messages")
        .select("body, sender_type, created_at")
        .eq("request_id", r.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return { ...r, lastMessage };
    })
  );

  return (
    <main className="min-h-screen bg-white px-6 py-8 max-w-2xl mx-auto">
      <Link href="/dashboard" className="text-xs text-neutral-400">
        ← Back to dashboard
      </Link>

      <h1 className="text-lg font-medium mt-4 mb-6">Messages</h1>

      <div className="flex flex-col">
        {requestsWithPreview.length ? (
          requestsWithPreview.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/requests/${r.id}`}
              className="border-t border-neutral-200 py-3 last:border-b flex items-center justify-between gap-4 hover:bg-neutral-50"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.title}</p>
                <p className="text-xs text-neutral-500 mt-0.5 truncate">
                  {r.lastMessage
                    ? `${r.lastMessage.sender_type === "staff" ? "Flow Studio" : "You"}: ${r.lastMessage.body}`
                    : "No messages yet"}
                </p>
              </div>
              <span className="text-xs text-neutral-400 capitalize flex-shrink-0">
                {r.status.replace("_", " ")}
              </span>
            </Link>
          ))
        ) : (
          <p className="text-sm text-neutral-500 py-4">
            No requests yet — once you submit one, you can message us about it here.
          </p>
        )}
      </div>
    </main>
  );
}

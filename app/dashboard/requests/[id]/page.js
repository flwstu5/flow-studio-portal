import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../../lib/supabaseServer";
import MessageThread from "./MessageThread";

export default async function RequestDetailPage({ params }) {
  const { id } = await params;
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

  const { data: request } = await supabase
    .from("requests")
    .select("*")
    .eq("id", id)
    .eq("client_id", client?.id)
    .single();

  if (!request) {
    redirect("/dashboard");
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("request_id", id)
    .order("created_at", { ascending: true });

  return (
    <main className="min-h-screen bg-white px-6 py-8 max-w-2xl mx-auto">
      <Link href="/dashboard" className="text-xs text-neutral-400">
        ← Back to dashboard
      </Link>

      <div className="mt-4 mb-6">
        <h1 className="text-lg font-medium">{request.title}</h1>
        <p className="text-xs text-neutral-500 mt-1 capitalize">
          {request.type} · {request.status.replace("_", " ")}
        </p>
      </div>

      {request.brief && (
        <div className="border-t border-b border-neutral-200 py-4 mb-6">
          <p className="text-xs font-medium text-neutral-500 mb-1">Original brief</p>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{request.brief}</p>
        </div>
      )}

      <MessageThread
        requestId={id}
        initialMessages={messages ?? []}
        senderType="client"
        senderLabel={client?.business_name ?? user.email}
      />
    </main>
  );
}

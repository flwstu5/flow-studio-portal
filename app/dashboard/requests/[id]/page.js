import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../../lib/supabaseServer";
import { createAdminClient } from "../../../../lib/supabaseAdmin";
import MessageThread from "./MessageThread";
import RatingPrompt from "./RatingPrompt";
import RevisionRequestButton from "./RevisionRequestButton";

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

  let referenceFileName = null;
  if (request.reference_file_path) {
    referenceFileName = request.reference_file_path.split("/").pop().replace(/^\d+-/, "");
  }

  const admin = createAdminClient();
  const { data: fileRows } = await admin
    .from("request_files")
    .select("id, file_path, uploaded_at")
    .eq("request_id", id)
    .order("uploaded_at", { ascending: true });

  const deliveredFiles = await Promise.all(
    (fileRows?.length ? fileRows : request.file_path ? [{ id: id, file_path: request.file_path, uploaded_at: request.delivered_at }] : []).map(
      async (f) => {
        const { data, error } = await admin.storage
          .from("deliverables")
          .createSignedUrl(f.file_path, 60 * 60, { download: true });
        if (error) {
          console.error("Signed URL error for", f.file_path, ":", error.message);
        }
        const fileName = f.file_path.split("/").pop().replace(/^\d+-/, "");
        return { id: f.id, fileName, downloadUrl: data?.signedUrl ?? null };
      }
    )
  );

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
          {referenceFileName && (
            <p className="text-xs text-neutral-500 mt-3">📎 {referenceFileName} attached</p>
          )}
        </div>
      )}

      {deliveredFiles.length > 0 && (
        <div className="border-b border-neutral-200 pb-4 mb-6">
          <p className="text-xs font-medium text-neutral-500 mb-2">
            Delivered file{deliveredFiles.length === 1 ? "" : "s"}
          </p>
          <div className="flex flex-col gap-1.5">
            {deliveredFiles.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-neutral-700 truncate">📎 {f.fileName}</span>
                {f.downloadUrl && (
                  <a
                    href={f.downloadUrl}
                    className="text-xs font-medium text-[var(--brand-color)] border border-[var(--brand-light)] rounded px-2.5 py-1 flex-shrink-0"
                  >
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {request.status === "delivered" && (
        <>
          <RatingPrompt requestId={id} initialRating={request.rating} />
          <RevisionRequestButton requestId={id} />
        </>
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

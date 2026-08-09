import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../../lib/supabaseServer";
import { createAdminClient } from "../../../../lib/supabaseAdmin";
import StaffMessageThread from "./StaffMessageThread";
import TestimonialCapture from "./TestimonialCapture";

export default async function StaffRequestDetailPage({ params }) {
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

  const { data: request } = await admin
    .from("requests")
    .select("*, clients(business_name, email, tier)")
    .eq("id", id)
    .single();

  if (!request) {
    redirect("/staff");
  }

  let referenceFileUrl = null;
  let referenceFileName = null;
  if (request.reference_file_path) {
    const { data, error } = await admin.storage
      .from("references")
      .createSignedUrl(request.reference_file_path, 60 * 60);
    if (error) {
      console.error("Signed URL error for reference file:", error.message);
    }
    referenceFileUrl = data?.signedUrl ?? null;
    referenceFileName = request.reference_file_path.split("/").pop().replace(/^\d+-/, "");
  }

  const { data: messages } = await admin
    .from("messages")
    .select("*")
    .eq("request_id", id)
    .order("created_at", { ascending: true });

  const { data: testimonial } = await admin
    .from("testimonials")
    .select("id, business_name, quote, role, result, published")
    .eq("request_id", id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-white px-6 py-8 max-w-2xl mx-auto">
      <Link href="/staff" className="text-xs text-neutral-400">
        ← Back to all requests
      </Link>

      <div className="mt-4 mb-6">
        <h1 className="text-lg font-medium">{request.title}</h1>
        <p className="text-xs text-neutral-500 mt-1 capitalize">
          {request.clients?.business_name ?? request.clients?.email} · {request.type} · {request.status.replace("_", " ")}
        </p>
      </div>

      {request.brief && (
        <div className="border-t border-b border-neutral-200 py-4 mb-6">
          <p className="text-xs font-medium text-neutral-500 mb-1">Original brief</p>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{request.brief}</p>
          {referenceFileUrl && (
            <p className="text-xs text-neutral-500 mt-3">
              📎{" "}
              <a href={referenceFileUrl} target="_blank" rel="noopener noreferrer" className="underline text-[var(--brand-color)]">
                {referenceFileName}
              </a>
            </p>
          )}
        </div>
      )}

      {request.rating && (
        <div className="border-b border-neutral-200 pb-4 mb-6">
          <p className="text-xs font-medium text-neutral-500 mb-1">
            Client rating: <span className="text-amber-500">{"★".repeat(request.rating)}</span>
            <span className="text-neutral-300">{"★".repeat(5 - request.rating)}</span>
          </p>
          {request.rating_feedback && (
            <p className="text-sm text-neutral-700 whitespace-pre-wrap">"{request.rating_feedback}"</p>
          )}
          <div className="mt-3">
            <TestimonialCapture
              requestId={id}
              defaultBusinessName={request.clients?.business_name}
              defaultQuote={request.rating_feedback}
              existing={testimonial}
            />
          </div>
        </div>
      )}

      <StaffMessageThread requestId={id} initialMessages={messages ?? []} />
    </main>
  );
}

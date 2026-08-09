"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../../lib/supabaseServer";
import { createAdminClient } from "../../../../lib/supabaseAdmin";
import { notifyStaffOfMessage, notifyClientReviewRequest } from "../../../../lib/notifications";

export async function submitRating(requestId, rating, feedback) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, email, business_name")
    .eq("auth_user_id", user.id)
    .single();

  if (!client) {
    throw new Error("No client record found for this account.");
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Invalid rating.");
  }

  const admin = createAdminClient();

  const trimmedFeedback = (feedback ?? "").trim();

  const { error } = await admin
    .from("requests")
    .update({
      rating,
      rating_submitted_at: new Date().toISOString(),
      rating_feedback: trimmedFeedback || null,
    })
    .eq("id", requestId)
    .eq("client_id", client.id);

  if (error) {
    throw new Error(error.message);
  }

  // Only nudge for a public review on the best rating, and only once the
  // real Google review link is configured (unset in the meantime, so this
  // quietly no-ops until then rather than sending a broken link).
  const reviewUrl = process.env.GOOGLE_REVIEW_URL || null;
  if (rating === 5 && reviewUrl) {
    await notifyClientReviewRequest({
      clientEmail: client.email,
      businessName: client.business_name,
      reviewUrl,
    });
  }

  return { reviewUrl: rating === 5 ? reviewUrl : null };
}

export async function sendClientMessage(requestId, body) {
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

  if (!client) {
    throw new Error("No client record found for this account.");
  }

  const admin = createAdminClient();

  // Confirm this request actually belongs to the caller before writing —
  // same double-check pattern used by submitRating above.
  const { data: request } = await admin
    .from("requests")
    .select("id, title")
    .eq("id", requestId)
    .eq("client_id", client.id)
    .single();

  if (!request) {
    throw new Error("Request not found.");
  }

  const senderLabel = client.business_name || user.email;

  const { error } = await admin.from("messages").insert({
    request_id: requestId,
    sender_type: "client",
    sender_label: senderLabel,
    body,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/requests/${requestId}`);

  await notifyStaffOfMessage({
    requestId,
    requestTitle: request.title,
    senderLabel,
    body,
  });
}

export async function requestRevision(requestId, notes) {
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

  if (!client) {
    throw new Error("No client record found for this account.");
  }

  const admin = createAdminClient();

  // Only revisions on this client's own delivered requests are allowed.
  const { data: request } = await admin
    .from("requests")
    .select("id, title, status")
    .eq("id", requestId)
    .eq("client_id", client.id)
    .single();

  if (!request) {
    throw new Error("Request not found.");
  }

  if (request.status !== "delivered") {
    throw new Error("Only delivered requests can have a revision requested.");
  }

  const { error: updateError } = await admin
    .from("requests")
    .update({ status: "in_review" })
    .eq("id", requestId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const senderLabel = client.business_name || user.email;
  const trimmedNotes = (notes ?? "").trim();
  const body = trimmedNotes ? `Requested a revision: ${trimmedNotes}` : "Requested a revision.";

  const { error: messageError } = await admin.from("messages").insert({
    request_id: requestId,
    sender_type: "client",
    sender_label: senderLabel,
    body,
  });

  if (messageError) {
    throw new Error(messageError.message);
  }

  revalidatePath(`/dashboard/requests/${requestId}`);
  revalidatePath("/staff");

  await notifyStaffOfMessage({
    requestId,
    requestTitle: request.title,
    senderLabel,
    body,
  });
}

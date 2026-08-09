"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../../lib/supabaseServer";
import { createAdminClient } from "../../../../lib/supabaseAdmin";
import { notifyStaffOfMessage } from "../../../../lib/notifications";

export async function submitRating(requestId, rating) {
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

  if (!client) {
    throw new Error("No client record found for this account.");
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Invalid rating.");
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("requests")
    .update({ rating, rating_submitted_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("client_id", client.id);

  if (error) {
    throw new Error(error.message);
  }
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

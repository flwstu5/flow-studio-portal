"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabaseServer";
import { createAdminClient } from "../../lib/supabaseAdmin";
import { notifyClientOfMessage, notifyClientOfDelivery } from "../../lib/notifications";

async function assertIsStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const staffEmails = (process.env.STAFF_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!user || !staffEmails.includes(user.email.toLowerCase())) {
    throw new Error("Not authorized.");
  }
}

export async function updateRequestStatus(requestId, newStatus) {
  await assertIsStaff();

  const admin = createAdminClient();

  const updates = { status: newStatus };
  if (newStatus === "delivered") {
    updates.delivered_at = new Date().toISOString();
  }

  const { error } = await admin.from("requests").update(updates).eq("id", requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/staff");

  if (newStatus === "delivered") {
    await notifyDelivery(admin, requestId);
  }
}

// Shared by updateRequestStatus and uploadDeliverable — both can mark a
// request delivered, so both need to notify the client the same way.
async function notifyDelivery(admin, requestId) {
  const { data: request } = await admin
    .from("requests")
    .select("title, clients(email)")
    .eq("id", requestId)
    .single();

  if (request) {
    await notifyClientOfDelivery({
      requestId,
      requestTitle: request.title,
      clientEmail: request.clients?.email,
    });
  }
}

export async function uploadDeliverable(requestId, formData) {
  await assertIsStaff();

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    throw new Error("No file provided.");
  }

  const admin = createAdminClient();

  // Store under a per-request folder so filenames can't collide across
  // different clients' requests.
  const path = `${requestId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await admin.storage
    .from("deliverables")
    .upload(path, file, { upsert: false });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: updateError } = await admin
    .from("requests")
    .update({
      file_path: path,
      status: "delivered",
      delivered_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/staff");
  await notifyDelivery(admin, requestId);
}

export async function sendStaffMessage(requestId, body) {
  await assertIsStaff();

  const admin = createAdminClient();

  const { error } = await admin.from("messages").insert({
    request_id: requestId,
    sender_type: "staff",
    sender_label: "Flow Studio",
    body,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/staff/requests/${requestId}`);

  const { data: request } = await admin
    .from("requests")
    .select("title, clients(email)")
    .eq("id", requestId)
    .single();

  if (request) {
    await notifyClientOfMessage({
      requestId,
      requestTitle: request.title,
      clientEmail: request.clients?.email,
      body,
    });
  }
}

export async function updateClient(clientId, { businessName, tier, websiteUrl }) {
  await assertIsStaff();

  const admin = createAdminClient();

  const { error } = await admin
    .from("clients")
    .update({
      business_name: businessName || null,
      tier: tier || null,
      website_url: websiteUrl || null,
    })
    .eq("id", clientId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/staff/clients/${clientId}`);
  revalidatePath("/staff/clients");
}

export async function archiveClient(clientId) {
  await assertIsStaff();

  const admin = createAdminClient();

  const { error } = await admin
    .from("clients")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", clientId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/staff/clients/${clientId}`);
  revalidatePath("/staff/clients");
}

export async function unarchiveClient(clientId) {
  await assertIsStaff();

  const admin = createAdminClient();

  const { error } = await admin
    .from("clients")
    .update({ archived_at: null })
    .eq("id", clientId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/staff/clients/${clientId}`);
  revalidatePath("/staff/clients");
}

export async function deleteMessage(messageId, requestId) {
  await assertIsStaff();

  const admin = createAdminClient();

  const { error } = await admin.from("messages").delete().eq("id", messageId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/staff/requests/${requestId}`);
  revalidatePath("/staff/messages");
}

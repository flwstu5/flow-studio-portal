"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabaseServer";
import { createAdminClient } from "../../lib/supabaseAdmin";
import { notifyClientOfMessage, notifyClientOfDelivery, notifyClientCheckIn } from "../../lib/notifications";

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
    .select("title, clients(id, email, notify_delivery)")
    .eq("id", requestId)
    .single();

  if (request) {
    await notifyClientOfDelivery({
      requestId,
      requestTitle: request.title,
      clientId: request.clients?.id,
      clientEmail: request.clients?.email,
      notifyDelivery: request.clients?.notify_delivery ?? true,
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
    .select("title, clients(id, email, notify_messages)")
    .eq("id", requestId)
    .single();

  if (request) {
    await notifyClientOfMessage({
      requestId,
      requestTitle: request.title,
      clientId: request.clients?.id,
      clientEmail: request.clients?.email,
      notifyMessages: request.clients?.notify_messages ?? true,
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

export async function sendCheckIn(clientId) {
  await assertIsStaff();

  const admin = createAdminClient();

  const { data: client } = await admin
    .from("clients")
    .select("email, business_name")
    .eq("id", clientId)
    .single();

  if (!client) {
    throw new Error("Client not found.");
  }

  await notifyClientCheckIn({
    clientId,
    clientEmail: client.email,
    businessName: client.business_name,
  });

  const { error } = await admin
    .from("clients")
    .update({ last_checkin_sent_at: new Date().toISOString() })
    .eq("id", clientId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/staff");
}

export async function updateClientNotes(clientId, notes) {
  await assertIsStaff();

  const admin = createAdminClient();

  const { error } = await admin
    .from("client_notes")
    .upsert({ client_id: clientId, notes, updated_at: new Date().toISOString() });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/staff/clients/${clientId}`);
}

export async function upsertTestimonial(requestId, { businessName, quote, role, result }) {
  await assertIsStaff();

  const admin = createAdminClient();

  const { data: request } = await admin
    .from("requests")
    .select("client_id")
    .eq("id", requestId)
    .single();

  if (!request) {
    throw new Error("Request not found.");
  }

  const { data: existing } = await admin
    .from("testimonials")
    .select("id")
    .eq("request_id", requestId)
    .maybeSingle();

  const row = {
    request_id: requestId,
    client_id: request.client_id,
    business_name: businessName,
    quote,
    role: role || null,
    result: result || null,
    published: true,
  };

  const { error } = existing
    ? await admin.from("testimonials").update(row).eq("id", existing.id)
    : await admin.from("testimonials").insert(row);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/staff/requests/${requestId}`);
}

export async function setTestimonialPublished(testimonialId, requestId, published) {
  await assertIsStaff();

  const admin = createAdminClient();

  const { error } = await admin
    .from("testimonials")
    .update({ published })
    .eq("id", testimonialId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/staff/requests/${requestId}`);
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

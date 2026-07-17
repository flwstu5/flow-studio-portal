"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabaseServer";
import { createAdminClient } from "../../lib/supabaseAdmin";

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
}

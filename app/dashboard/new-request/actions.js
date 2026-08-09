"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabaseServer";
import { createAdminClient } from "../../../lib/supabaseAdmin";

export async function createRequest(formData) {
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

  const title = formData.get("title");
  const type = formData.get("type");
  const brief = formData.get("brief");
  const referenceFile = formData.get("referenceFile");
  const hasReferenceFile = referenceFile && typeof referenceFile !== "string" && referenceFile.size > 0;

  const { data: request, error } = await supabase
    .from("requests")
    .insert({
      client_id: client.id,
      title,
      type,
      brief,
      status: "submitted",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (hasReferenceFile) {
    const admin = createAdminClient();
    const path = `${request.id}/${Date.now()}-${referenceFile.name}`;

    const { error: uploadError } = await admin.storage
      .from("references")
      .upload(path, referenceFile, { upsert: false });

    if (uploadError) {
      console.error("Reference file upload failed:", uploadError.message);
      // Don't fail the whole request over a file upload hiccup — the
      // request itself is already saved and Flow Studio can follow up.
    } else {
      const { error: updateError } = await admin
        .from("requests")
        .update({ reference_file_path: path })
        .eq("id", request.id);

      if (updateError) {
        console.error("Failed to save reference file path:", updateError.message);
      }
    }
  }

  redirect("/dashboard");
}
"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabaseServer";
import { createAdminClient } from "../../../../lib/supabaseAdmin";

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

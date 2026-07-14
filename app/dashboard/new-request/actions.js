"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabaseServer";

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

  const { error } = await supabase.from("requests").insert({
    client_id: client.id,
    title,
    type,
    brief,
    status: "submitted",
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/dashboard");
}
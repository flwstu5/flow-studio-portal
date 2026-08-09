import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabaseServer";
import { createAdminClient } from "../../../../lib/supabaseAdmin";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ count: 0 });
  }

  const admin = createAdminClient();

  const staffEmails = (process.env.STAFF_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (staffEmails.includes(user.email.toLowerCase())) {
    const { count } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_type", "staff")
      .is("read_at", null);

    return NextResponse.json({ count: count ?? 0 });
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!client) {
    return NextResponse.json({ count: 0 });
  }

  const { count } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_type", "client")
    .eq("client_id", client.id)
    .is("read_at", null);

  return NextResponse.json({ count: count ?? 0 });
}

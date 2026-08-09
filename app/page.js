import { redirect } from "next/navigation";
import { createClient } from "../lib/supabaseServer";

export default async function Home() {
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

  if (staffEmails.includes(user.email.toLowerCase())) {
    redirect("/staff");
  }

  redirect("/dashboard");
}

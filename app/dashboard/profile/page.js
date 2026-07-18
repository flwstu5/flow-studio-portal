import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabaseServer";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  let logoUrl = null;
  if (client?.logo_path) {
    const { data } = supabase.storage.from("client-logos").getPublicUrl(client.logo_path);
    logoUrl = data?.publicUrl ?? null;
  }

  return (
    <main className="min-h-screen bg-white px-6 py-8 max-w-lg mx-auto">
      <Link href="/dashboard" className="text-xs text-neutral-400">
        ← Back to dashboard
      </Link>

      <h1 className="text-lg font-medium mt-4 mb-6">Business profile</h1>

      <ProfileForm
        currentBusinessName={client?.business_name ?? ""}
        currentLogoUrl={logoUrl}
      />
    </main>
  );
}

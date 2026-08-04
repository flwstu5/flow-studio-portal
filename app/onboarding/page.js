import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabaseServer";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: client } = await supabase
    .from("clients")
    .select("business_name, logo_path, accent_color, onboarding_completed_at")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // Nothing left to do here — send them on to the dashboard.
  if (client?.onboarding_completed_at) {
    redirect("/dashboard");
  }

  let logoUrl = null;
  if (client?.logo_path) {
    const { data } = supabase.storage.from("client-logos").getPublicUrl(client.logo_path);
    logoUrl = data?.publicUrl ?? null;
  }

  return (
    <OnboardingForm
      businessName={client?.business_name ?? ""}
      logoUrl={logoUrl}
      accentColor={client?.accent_color ?? "#CB181D"}
    />
  );
}

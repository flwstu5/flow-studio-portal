import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabaseServer";

// Gate for everything under /dashboard: must be signed in, and must have
// finished onboarding (password + business customization) before seeing
// any client-facing page. Also hands down the client's chosen accent color
// as CSS variables so every page underneath can theme itself without
// re-fetching the client row.
export default async function DashboardLayout({ children }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: client } = await supabase
    .from("clients")
    .select("accent_color, onboarding_completed_at")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (client && !client.onboarding_completed_at) {
    redirect("/onboarding");
  }

  const accent = client?.accent_color || "#CB181D";

  return (
    <div
      style={{
        "--brand-color": accent,
        "--brand-light": `color-mix(in srgb, ${accent} 45%, white)`,
        "--brand-tint": `color-mix(in srgb, ${accent} 8%, white)`,
      }}
    >
      {children}
    </div>
  );
}

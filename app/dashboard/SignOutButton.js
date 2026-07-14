"use client";

import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabaseClient";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.push("/login");
      }}
      className="text-xs text-neutral-400 px-2.5 pt-2 text-left"
    >
      Sign out
    </button>
  );
}

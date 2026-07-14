import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// This uses the SECRET key, not the publishable one — it can bypass Row
// Level Security entirely. Only ever import this in server-only code
// (API routes, server actions) — never in a client component, and never
// let this key reach the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

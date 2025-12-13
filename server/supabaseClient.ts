import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL must be set in environment variables.");
}

if (!SERVICE_ROLE_KEY) {
  throw new Error(
    "A Supabase service key (SUPABASE_SERVICE_ROLE_KEY) or anon key (SUPABASE_ANON_KEY) must be set.",
  );
}

export const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

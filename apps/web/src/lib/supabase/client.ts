import { createBrowserClient } from "@supabase/ssr";
import { getEnv } from "@/lib/env";
import type { Database } from "./types";

/** Browser-side Supabase client (anon key, RLS-scoped to the signed-in user). */
export function createClient() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv();
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

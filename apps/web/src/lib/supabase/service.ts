import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { clean } from "@/lib/env";

/**
 * Service-role client. SERVER ONLY, and for exactly one job: signing the photo
 * links on a public report (src/lib/proof-photos.ts), because anon can't sign
 * and we deliberately give anon no storage policy (it would let anyone list
 * every shared photo). Nothing else may import this module.
 *
 * Returns null when SUPABASE_SERVICE_ROLE_KEY isn't set, so the report degrades
 * to "photo unavailable" instead of failing.
 */
export function createServiceClient(): SupabaseClient | null {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Validated access to the public Supabase env vars. Throws loudly (with the var
 * name) when one is missing so misconfiguration fails fast instead of at runtime
 * deep inside the Supabase client.
 */
export function getEnv() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL) throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_ANON_KEY) throw new Error("Missing env NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return { SUPABASE_URL, SUPABASE_ANON_KEY };
}

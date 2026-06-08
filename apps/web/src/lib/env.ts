/**
 * Validated access to the public Supabase env vars. Throws loudly (with the var
 * name) when one is missing so misconfiguration fails fast instead of at runtime
 * deep inside the Supabase client. Use this for data access (page/component
 * clients) where a missing config SHOULD fail the request loudly.
 *
 * Do NOT call this from middleware — middleware runs on every route, so a throw
 * there 500s the entire site. Use {@link getEnvSafe} there instead.
 */
export function getEnv() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL) throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_ANON_KEY) throw new Error("Missing env NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return { SUPABASE_URL, SUPABASE_ANON_KEY };
}

/**
 * Non-throwing variant of {@link getEnv}: returns the validated vars, or `null`
 * when either is missing. For code paths that must degrade rather than crash —
 * notably middleware, which runs on every request and would otherwise take the
 * whole site down (the 2026-06-08 `MIDDLEWARE_INVOCATION_FAILED` outage).
 */
export function getEnvSafe() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return { SUPABASE_URL, SUPABASE_ANON_KEY };
}

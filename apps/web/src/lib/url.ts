/**
 * Canonical base URL for building absolute redirect targets (OAuth `redirectTo`,
 * email links, metadata). Bare `location.origin` is fragile: it pins a magic
 * link to wherever the browser happened to be (e.g. localhost during dev), and
 * is unavailable in SSR. Precedence here gives an explicit, stable base:
 *   1. NEXT_PUBLIC_SITE_URL    — canonical prod URL (set in Vercel)
 *   2. NEXT_PUBLIC_VERCEL_URL  — per-deploy URL (preview deploys)
 *   3. window.location.origin  — browser, when neither env is set
 *   4. http://localhost:3000   — final fallback (local dev / SSR)
 * Returned without a trailing slash so callers append `/auth/callback`.
 */
function cleanEnv(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const stripped = value.replace(/\s/g, "");
  return stripped === "" ? undefined : stripped;
}

export function getURL(): string {
  const vercel = cleanEnv(process.env.NEXT_PUBLIC_VERCEL_URL);
  const raw =
    cleanEnv(process.env.NEXT_PUBLIC_SITE_URL) ??
    (vercel ? `https://${vercel}` : undefined) ??
    (typeof window !== "undefined" ? window.location.origin : undefined) ??
    "http://localhost:3000";
  const withScheme = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}

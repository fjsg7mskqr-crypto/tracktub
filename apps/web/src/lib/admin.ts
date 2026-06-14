/**
 * Admin allowlist + pre-launch access-gate decision.
 *
 * During the pre-launch window the public may reach ONLY the marketing surface
 * (`/landing`, `/blog`) and the auth plumbing needed to sign in (`/login`,
 * `/auth/callback`). Every other route is the founder's alone: reachable only by
 * a signed-in user whose email is on the `ADMIN_EMAILS` allowlist. This is the
 * single source of truth for "is this email an admin" (also used by
 * `insights/page.tsx`) and for the middleware redirect decision.
 */

/** Parse the comma-separated `ADMIN_EMAILS` env into a normalized lowercase set. */
export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** True when `email` is on the `ADMIN_EMAILS` allowlist. Empty/absent → false. */
export function isAdminEmail(
  email: string | null | undefined,
  raw: string | undefined = process.env.ADMIN_EMAILS,
): boolean {
  if (!email) return false;
  return parseAdminEmails(raw).includes(email.toLowerCase());
}

export type AccessDecision = "allow" | "landing" | "login";

/**
 * Pure pre-launch gate decision, extracted so the redirect matrix is testable
 * without a live request.
 *
 * - Public paths are always allowed.
 * - A logged-out visitor to a protected path is sent to `/landing` (from the
 *   root) or `/login` (deeper paths — so the founder can still sign in).
 * - When `enforceAdmin` is on (production builds only), a signed-in NON-admin is
 *   bounced to `/landing`. In local dev the gate is off so the seeded demo and
 *   `/dev` login bypass keep working.
 */
export function appAccessDecision(opts: {
  path: string;
  isPublic: boolean;
  hasUser: boolean;
  isAdmin: boolean;
  enforceAdmin: boolean;
}): AccessDecision {
  const { path, isPublic, hasUser, isAdmin, enforceAdmin } = opts;
  if (isPublic) return "allow";
  if (!hasUser) return path === "/" ? "landing" : "login";
  if (enforceAdmin && !isAdmin) return "landing";
  return "allow";
}

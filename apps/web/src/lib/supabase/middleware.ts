import { createServerClient } from "@supabase/ssr";
import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { getEnvSafe } from "@/lib/env";
import { appAccessDecision, isAdminEmail } from "@/lib/admin";
import {
  bucketForPath,
  checkRateLimit,
  getClientIp,
  tooManyRequests,
} from "@/lib/ratelimit";

/** Paths reachable without a session: the marketing surface (landing + blog),
 *  the login form, the auth callback, shared proof links, and the invite-accept
 *  page. Everything else requires a signed-in user — and, in production, a user
 *  on the `ADMIN_EMAILS` allowlist (the pre-launch lockdown; see `@/lib/admin`).
 *  `/landing` + `/blog` are the only browsable public pages pre-launch.
 *  `/proof/*` is public by design — a recipient opens a shared turnover's proof
 *  link with no account ("No login required to view"). The page reads through
 *  the anonymous `share_token` RLS policies (`turnover_public_proof` /
 *  `photo_public_proof`, migration `20260610120000`) and records the open via
 *  `record_proof_open`. Gating it here redirected recipients to /login and made
 *  the PRD wedge metric (shared links opened by recipients) unmeasurable (#104).
 *  It stays public through the lockdown: it is a capability link (an unguessable
 *  token), not a stumble-able surface, and no valid public tokens exist yet.
 *  `/invite/*` is the same capability-link shape — a signed-out invitee MUST
 *  reach the accept screen to start the sign-in round-trip (issue #97/#98); it
 *  reads only a SECURITY-DEFINER preview, so gating it would break the flow
 *  without protecting anything. */
const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/landing",
  "/blog",
  "/proof",
  "/invite",
];

/**
 * Refreshes the Supabase session on every request and gates protected routes.
 * Must run before any data access so the cookie-borne session stays fresh.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Rate-limit the abuse-prone public surfaces (login, auth callback, proof
  // links) before any other work (issue #42). No-op until Upstash is configured,
  // and checkRateLimit fails open, so this can never 500 the site.
  const bucket = bucketForPath(request.nextUrl.pathname);
  if (bucket) {
    const { success, reset } = await checkRateLimit(
      bucket,
      getClientIp(request.headers),
    );
    if (!success) return tooManyRequests(reset);
  }

  // Middleware runs on every route, so it must never throw — a throw here is a
  // site-wide 500 (MIDDLEWARE_INVOCATION_FAILED). If Supabase isn't configured,
  // skip session refresh/auth gating and let the request through; data pages
  // still fail loudly on their own via getEnv(), but the site stays up. Warn so
  // the misconfiguration is visible in logs rather than silent.
  const env = getEnvSafe();
  if (!env) {
    console.warn(
      "[middleware] Supabase env not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY); skipping session refresh and auth gating.",
    );
    return response;
  }
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env;

  // Anything from here on (client construction, the auth round-trip) can throw —
  // e.g. an INVALID env value (a malformed URL makes createServerClient throw
  // `Invalid supabaseUrl`, the second half of the 2026-06-08 outage) or Supabase
  // being unreachable. Because middleware runs on every route, an uncaught throw
  // is a site-wide 500, so we fail open: log loudly and pass the request through.
  // RLS and the data-access clients' own getEnv() remain the real protection, so
  // skipping the auth-gate redirect here exposes nothing a missing config wouldn't.
  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    // IMPORTANT: do nothing between creating the client and getUser() — it keeps
    // the session in sync. getUser() revalidates the token with the auth server.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;
    const isPublic =
      PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/")) ||
      // Dev-only demo sign-in route (404s in production via its own guard).
      (process.env.NODE_ENV !== "production" && path.startsWith("/dev/"));

    // Pre-launch lockdown: protected routes require a signed-in user, and in
    // production also an ADMIN_EMAILS-allowlisted one. The admin requirement is
    // off outside production so the seeded localhost demo / `/dev` bypass keep
    // working. Decision logic lives in `@/lib/admin` (pure + unit-tested).
    const decision = appAccessDecision({
      path,
      isPublic,
      hasUser: Boolean(user),
      isAdmin: isAdminEmail(user?.email),
      enforceAdmin: process.env.NODE_ENV === "production",
    });

    if (decision !== "allow") {
      const url = request.nextUrl.clone();
      // "landing" — logged-out marketing traffic on the root, or a non-admin who
      // signed in but isn't permitted past the public surface. "login" — a
      // logged-out visitor on a deeper app path, so the founder can sign in.
      url.pathname = decision === "landing" ? "/landing" : "/login";
      // Carry any cookies refreshed above onto the redirect, matching the
      // canonical Supabase middleware (harmless today, correct if logic changes).
      const redirect = NextResponse.redirect(url);
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    }

    return response;
  } catch (err) {
    // Surface the failure in Sentry — this fail-open path is exactly the
    // 2026-06-08 outage class, previously visible only in Vercel logs.
    // captureException never throws (and is a no-op without a DSN), so the
    // fail-open guarantee holds.
    Sentry.captureException(err);
    console.error(
      "[middleware] Supabase session check failed; passing the request through to avoid a site-wide 500. Check NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY:",
      err,
    );
    return response;
  }
}

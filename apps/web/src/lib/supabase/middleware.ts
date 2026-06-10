import { createServerClient } from "@supabase/ssr";
import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { getEnvSafe } from "@/lib/env";

/** Paths reachable without a session: the login form and the auth callback.
 *  Everything else requires a signed-in user. Public proof links (`/proof/*`)
 *  will rejoin this list in M2 once they read from Supabase via an anonymous
 *  `share_token` SELECT policy; until then the route serves only stale demo
 *  data, so it stays gated rather than publicly advertising a dead page. */
const PUBLIC_PATHS = ["/login", "/auth/callback", "/landing"];

/**
 * Refreshes the Supabase session on every request and gates protected routes.
 * Must run before any data access so the cookie-borne session stays fresh.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

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
    const isPublic = PUBLIC_PATHS.some(
      (p) => path === p || path.startsWith(p + "/"),
    );

    if (!user && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
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

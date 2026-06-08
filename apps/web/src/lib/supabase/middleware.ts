import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/lib/env";

/** Paths reachable without a session: the login form and the auth callback.
 *  Everything else requires a signed-in user. Public proof links (`/proof/*`)
 *  will rejoin this list in M2 once they read from Supabase via an anonymous
 *  `share_token` SELECT policy; until then the route serves only stale demo
 *  data, so it stays gated rather than publicly advertising a dead page. */
const PUBLIC_PATHS = ["/login", "/auth/callback"];

/**
 * Refreshes the Supabase session on every request and gates protected routes.
 * Must run before any data access so the cookie-borne session stays fresh.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv();

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
}

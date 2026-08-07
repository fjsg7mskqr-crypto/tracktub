import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { buildCsp, getCspReportUri } from "@/lib/csp";

/**
 * Generate a cryptographically random base64 nonce using the Web Crypto API
 * (available in both Node.js 20+ and the Next.js Edge Runtime).
 */
function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(Array.from(bytes, (b) => String.fromCodePoint(b)).join(""));
}

export async function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp(nonce, { reportUri: getCspReportUri() });

  // Next.js reads the nonce from the `Content-Security-Policy` header on the
  // *forwarded request* (NOT `x-nonce`): seeing a nonce'd CSP there is what makes
  // it (a) stamp that nonce onto every <script> it emits and (b) opt the route
  // out of static generation so each response carries a fresh, matching nonce.
  // Forwarding only `x-nonce` did neither — routes stayed statically prerendered
  // and CDN-cached with nonce-less scripts, while the response CSP still sent a
  // per-request `strict-dynamic` nonce. The nonce never matched, so a CSP3
  // browser (incl. iOS Safari 15.4+) blocked EVERY script → no hydration → dead
  // buttons on prod (e.g. "Continue with Google" never firing). `x-nonce` stays
  // forwarded for any component that wants to read it directly.
  const response = await updateSession(request, {
    "x-nonce": nonce,
    "Content-Security-Policy": csp,
  });

  // Attach the enforcing CSP to every response (pass-through or redirect).
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  // Run on everything except static assets, image files, and the Sentry tunnel
  // (`/monitoring` is a telemetry ingest path — errors from signed-out users
  // must reach it, so it bypasses session refresh and auth gating).
  // `robots.txt` / `sitemap.xml` are excluded too: they MUST be fetchable by
  // anonymous crawlers, and the pre-launch gate would otherwise redirect them
  // to /login or /landing, defeating the whole SEO point.
  matcher: [
    "/((?!monitoring|robots.txt|sitemap.xml|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

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

export async function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp(nonce, { reportUri: getCspReportUri() });

  // Forward x-nonce to the Next.js render layer via updateSession's
  // extraRequestHeaders so Next.js applies the nonce to its inline bootstrap
  // <script> tags automatically (App Router reads x-nonce from the forwarded
  // request headers during server rendering).
  const response = await updateSession(request, { "x-nonce": nonce });

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

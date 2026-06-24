import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

// NOTE: cleanEnv and sentryCspReportUri below intentionally duplicate logic
// from src/lib/csp.ts (getCspReportUri / cleanEnv). next.config.mjs is
// executed by Node.js at build time before TypeScript transpilation, so it
// cannot import from src/. If the DSN fallback or parsing logic ever changes,
// update BOTH this file AND src/lib/csp.ts to keep them in sync.

/** Whitespace-stripped env read (same repair as src/lib/env.ts — a pasted
 *  value can arrive line-wrapped and the stray bytes would corrupt the DSN). */
function cleanEnv(name) {
  const stripped = (process.env[name] ?? "").replace(/\s/g, "");
  return stripped === "" ? undefined : stripped;
}

/** Sentry's Security-Header report endpoint, derived from the same DSN the
 *  browser SDK uses (env-overridable, with the baked fallback). The CSP itself
 *  is built per-request by middleware (src/middleware.ts + src/lib/csp.ts),
 *  which uses the same logic. This function exists here only to supply the
 *  static Reporting-Endpoints header (Chrome's modern Reporting API). */
function sentryCspReportUri() {
  const dsn =
    cleanEnv("NEXT_PUBLIC_SENTRY_DSN") ??
    "https://95ef95ac9eefd2ee1f0c31b83284943b@o4510660925718528.ingest.us.sentry.io/4511538300846080";
  try {
    const { protocol, host, username, pathname } = new URL(dsn);
    const projectId = pathname.replace(/^\//, "");
    if (!username || !projectId) return undefined;
    return `${protocol}//${host}/api/${projectId}/security/?sentry_key=${username}`;
  } catch {
    return undefined;
  }
}

const cspReportUri = sentryCspReportUri();

// The enforcing Content-Security-Policy header is generated per-request by
// middleware (src/middleware.ts) with a unique nonce, so it does NOT appear
// here. Static security headers that don't require per-request values stay.
const securityHeaders = [
  // Names the `report-to csp-endpoint` group referenced by the per-request CSP
  // in middleware, for browsers on the Reporting API (Chrome). The legacy
  // report-uri directive in the CSP covers Safari and Firefox.
  ...(cspReportUri
    ? [{ key: "Reporting-Endpoints", value: `csp-endpoint="${cspReportUri}"` }]
    : []),
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Lock down powerful APIs we don't use. The v1 capture flow takes photos via
  // <input type="file" capture>, which is NOT gated by this policy — only
  // getUserMedia-style live camera access would need `camera` re-opened.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Silence the multiple-lockfile workspace-root warning.
  outputFileTracingRoot: path.join(import.meta.dirname),
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  experimental: {
    // Default 1MB is far smaller than a real phone-camera photo (the
    // capture-v2 wizard uploads guided/issue photos via server actions).
    // Confirmed via node_modules/next/dist/server/config-schema.js that this
    // key is nested under `experimental` for the installed Next version —
    // a top-level `serverActions` key is rejected as unrecognized and the
    // limit silently falls back to the 1MB default.
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default withSentryConfig(nextConfig, {
  org: "supernova-r7",
  project: "tracktub-web",

  // Source-map upload happens only when the token is present (Vercel/CI env);
  // local builds just skip it with a warning.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,

  // First-party ingest path so ad-blockers can't eat error reports. Must stay
  // excluded from the auth-gating middleware matcher (src/middleware.ts).
  tunnelRoute: "/monitoring",

  silent: !process.env.CI,
});

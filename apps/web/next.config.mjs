import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

const isDev = process.env.NODE_ENV === "development";

/** Whitespace-stripped env read (same repair as src/lib/env.ts — a pasted
 *  value can arrive line-wrapped and the stray bytes would corrupt the CSP). */
function cleanEnv(name) {
  const stripped = (process.env[name] ?? "").replace(/\s/g, "");
  return stripped === "" ? undefined : stripped;
}

/** The only cross-origin traffic today is the Supabase project (auth + data,
 *  https for REST and wss for realtime). Derived from env so the policy follows
 *  the project without a code change; absent locally the app is same-origin only. */
function connectSrc() {
  const sources = ["'self'"];
  const supabaseUrl = cleanEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (supabaseUrl) {
    try {
      const { origin } = new URL(supabaseUrl);
      sources.push(origin, origin.replace(/^https:/, "wss:"));
    } catch {
      // Malformed URL: fall back to same-origin; data clients fail loudly via getEnv().
    }
  }
  // Webpack HMR in `next dev` talks over a websocket to the dev server.
  if (isDev) sources.push("ws:");
  return sources.join(" ");
}

/** Sentry's Security-Header report endpoint, derived from the same DSN the
 *  browser SDK uses (env-overridable, with the baked fallback). This is what
 *  makes the Report-Only burn-in (#38) measurable: violations land in Sentry
 *  instead of only users' consoles. */
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

/** Report-Only while we burn in (issue #38); enforcement is tracked in #41.
 *  Demo photos are data:/blob: URLs and fonts are self-hosted via next/font,
 *  so the allowlist stays tight. `frame-ancestors` only bites once enforced —
 *  X-Frame-Options below covers clickjacking in the meantime. Violations are
 *  reported to Sentry via report-uri (Safari/Firefox) + report-to (Chrome,
 *  paired with the Reporting-Endpoints header below). */
function contentSecurityPolicy(reportUri) {
  const directives = [
    "default-src 'self'",
    // Next.js injects inline bootstrap scripts; dev additionally needs eval for
    // react-refresh. Nonce-based script-src lands with enforcement (#41).
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    // Sentry session replay records via a worker created from a blob: URL.
    "worker-src 'self' blob:",
    `connect-src ${connectSrc()}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (reportUri) {
    directives.push(`report-uri ${reportUri}`, "report-to csp-endpoint");
  }
  return directives.join("; ");
}

const cspReportUri = sentryCspReportUri();

const securityHeaders = [
  {
    key: "Content-Security-Policy-Report-Only",
    value: contentSecurityPolicy(cspReportUri),
  },
  // Names the `report-to csp-endpoint` group referenced by the CSP above, for
  // browsers on the Reporting API (Chrome). report-uri covers the rest.
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
    serverActions: {
      // Default 1MB is far smaller than a real phone-camera photo (the
      // capture-v2 wizard uploads guided/issue photos via server actions).
      bodySizeLimit: "10mb",
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

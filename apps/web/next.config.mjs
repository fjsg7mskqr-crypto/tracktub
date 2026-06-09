import path from "node:path";

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

/** Report-Only while we burn in (issue #38); enforcement is tracked in #41.
 *  Demo photos are data:/blob: URLs and fonts are self-hosted via next/font,
 *  so the allowlist stays tight. `frame-ancestors` only bites once enforced —
 *  X-Frame-Options below covers clickjacking in the meantime. */
function contentSecurityPolicy() {
  return [
    "default-src 'self'",
    // Next.js injects inline bootstrap scripts; dev additionally needs eval for
    // react-refresh. Nonce-based script-src lands with enforcement (#41).
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connectSrc()}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

const securityHeaders = [
  {
    key: "Content-Security-Policy-Report-Only",
    value: contentSecurityPolicy(),
  },
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
};

export default nextConfig;

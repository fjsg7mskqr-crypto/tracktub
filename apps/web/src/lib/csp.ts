/** Strip all whitespace from an env var value (mirrors next.config.mjs cleanEnv). */
function cleanEnv(name: string): string | undefined {
  const stripped = (process.env[name] ?? "").replace(/\s/g, "");
  return stripped === "" ? undefined : stripped;
}

/**
 * Derive the Sentry CSP report endpoint from the DSN (env var or baked
 * fallback). Used by middleware for the report-uri / report-to directives and
 * by next.config.mjs for the Reporting-Endpoints header.
 */
export function getCspReportUri(dsn?: string): string | undefined {
  const resolved =
    dsn ??
    cleanEnv("NEXT_PUBLIC_SENTRY_DSN") ??
    "https://95ef95ac9eefd2ee1f0c31b83284943b@o4510660925718528.ingest.us.sentry.io/4511538300846080";
  try {
    const { protocol, host, username, pathname } = new URL(resolved);
    const projectId = pathname.replace(/^\//, "");
    if (!username || !projectId) return undefined;
    return `${protocol}//${host}/api/${projectId}/security/?sentry_key=${username}`;
  } catch {
    return undefined;
  }
}

/** The Supabase origin (scheme + host only), or undefined if unset/malformed. */
function supabaseOrigin(supabaseUrl?: string): string | undefined {
  const url = supabaseUrl ?? cleanEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!url) return undefined;
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

/** Default PostHog ingestion host (shared with src/lib/analytics.ts). */
export const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

/**
 * The origins posthog-js needs in connect-src, or [] when analytics is off.
 *
 * Mirrors posthog-js's RequestRouter (1.447.x): for PostHog Cloud hosts it
 * derives a region and sends events/flags to `https://<region>.i.posthog.com`
 * and remote config to `https://<region>-assets.i.posthog.com`; for any other
 * (self-hosted / reverse-proxy) host every request goes to that host. External
 * script loading is disabled in analytics.ts, so script-src needs nothing.
 * A malformed host is dropped (like supabaseOrigin) rather than breaking the CSP.
 */
function posthogOrigins(key?: string, host?: string): string[] {
  if (!key) return [];
  let origin: string;
  try {
    const url = new URL(
      host ?? cleanEnv("NEXT_PUBLIC_POSTHOG_HOST") ?? DEFAULT_POSTHOG_HOST
    );
    if (url.protocol !== "https:" && url.protocol !== "http:") return [];
    origin = url.origin;
  } catch {
    return [];
  }
  const region = /^https:\/\/(app|us|us-assets)(\.i)?\.posthog\.com$/i.test(
    origin
  )
    ? "us"
    : /^https:\/\/(eu|eu-assets)(\.i)?\.posthog\.com$/i.test(origin)
      ? "eu"
      : undefined;
  if (!region) return [origin];
  const regional = [
    `https://${region}.i.posthog.com`,
    `https://${region}-assets.i.posthog.com`,
  ];
  // Flags use the configured host verbatim (e.g. app.posthog.com).
  return regional.includes(origin) ? regional : [origin, ...regional];
}

/** Build the connect-src value: 'self' + Supabase https/wss + PostHog + ws: in dev. */
function connectSrc(opts: BuildCspOptions): string {
  const sources = ["'self'"];
  const origin = supabaseOrigin(opts.supabaseUrl);
  if (origin) sources.push(origin, origin.replace(/^https:/, "wss:"));
  const key =
    "posthogKey" in opts
      ? opts.posthogKey
      : cleanEnv("NEXT_PUBLIC_POSTHOG_KEY");
  sources.push(...posthogOrigins(key, opts.posthogHost));
  // Webpack HMR in `next dev` uses a websocket to the dev server.
  if (process.env.NODE_ENV === "development") sources.push("ws:");
  return sources.join(" ");
}

export interface BuildCspOptions {
  /** Overrides the env-derived Sentry report-uri. Pass undefined to omit. */
  reportUri?: string | null;
  /** Override the Supabase URL for connect-src/img-src (defaults to env var). */
  supabaseUrl?: string;
  /** Override NEXT_PUBLIC_POSTHOG_KEY (pass undefined to simulate unset). */
  posthogKey?: string;
  /** Override NEXT_PUBLIC_POSTHOG_HOST for connect-src. */
  posthogHost?: string;
  /** Force dev relaxations (unsafe-eval, ws:) regardless of NODE_ENV. */
  isDev?: boolean;
}

/**
 * Build an enforcing, nonce-based Content-Security-Policy string (issue #41).
 * The nonce is generated per-request by the middleware and set on Next.js
 * inline bootstrap scripts via the x-nonce forwarded request header.
 * 'strict-dynamic' lets nonce-trusted scripts load further scripts without
 * explicit allowlisting; 'self' is kept as a fallback for older browsers.
 */
export function buildCsp(nonce: string, opts: BuildCspOptions = {}): string {
  const isDev = opts.isDev ?? process.env.NODE_ENV === "development";
  const reportUri = "reportUri" in opts ? opts.reportUri : getCspReportUri();
  const imgOrigin = supabaseOrigin(opts.supabaseUrl);

  const directives = [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'self'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // Photos render straight from Supabase Storage public URLs.
    `img-src 'self' data: blob:${imgOrigin ? ` ${imgOrigin}` : ""}`,
    "font-src 'self'",
    // Sentry session replay records via a worker created from a blob: URL.
    "worker-src 'self' blob:",
    `connect-src ${connectSrc(opts)}`,
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

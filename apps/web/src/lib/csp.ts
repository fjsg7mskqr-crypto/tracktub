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

/** Build the connect-src value: 'self' + Supabase https/wss + ws: in dev. */
function connectSrc(supabaseUrl?: string): string {
  const sources = ["'self'"];
  const url = supabaseUrl ?? cleanEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (url) {
    try {
      const { origin } = new URL(url);
      sources.push(origin, origin.replace(/^https:/, "wss:"));
    } catch {
      // Malformed URL: same-origin only.
    }
  }
  // Webpack HMR in `next dev` uses a websocket to the dev server.
  if (process.env.NODE_ENV === "development") sources.push("ws:");
  return sources.join(" ");
}

export interface BuildCspOptions {
  /** Overrides the env-derived Sentry report-uri. Pass undefined to omit. */
  reportUri?: string | null;
  /** Override the Supabase URL for connect-src (defaults to env var). */
  supabaseUrl?: string;
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
  const reportUri =
    "reportUri" in opts ? opts.reportUri : getCspReportUri();

  const directives = [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'self'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    // Sentry session replay records via a worker created from a blob: URL.
    "worker-src 'self' blob:",
    `connect-src ${connectSrc(opts.supabaseUrl)}`,
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

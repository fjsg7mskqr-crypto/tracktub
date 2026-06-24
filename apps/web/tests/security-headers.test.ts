import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { buildCsp, getCspReportUri } from "@/lib/csp";

/** The config builds its header list at module load, so each test stubs env
 *  first and then imports a fresh copy. Vitest runs with NODE_ENV=test, which
 *  exercises the production-shaped policy (no dev-only relaxations). */
async function loadConfigHeaders() {
  const config = (await import("../next.config.mjs")).default;
  const rules = await config.headers!();
  expect(rules).toHaveLength(1);
  expect(rules[0].source).toBe("/(.*)");
  return Object.fromEntries(rules[0].headers.map((h) => [h.key, h.value]));
}

// Stable nonce for CSP builder assertions — the middleware generates a fresh
// one per request; tests pass it explicitly for deterministic checks.
const TEST_NONCE = "dGVzdC1ub25jZXZhbHVl";

describe("next.config.mjs static security headers", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it("sets every baseline header on all routes", async () => {
    const headers = await loadConfigHeaders();
    expect(headers["Strict-Transport-Security"]).toContain("max-age=63072000");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    // CSP is now enforcing and nonce-based, set per-request by middleware —
    // neither variant belongs in the static config headers.
    expect(headers["Content-Security-Policy-Report-Only"]).toBeUndefined();
    expect(headers["Content-Security-Policy"]).toBeUndefined();
  });

  it("keeps Reporting-Endpoints for Chrome CSP violation reports", async () => {
    const headers = await loadConfigHeaders();
    // The Reporting-Endpoints header names the csp-endpoint group referenced by
    // `report-to csp-endpoint` in the per-request CSP built by middleware.
    expect(headers["Reporting-Endpoints"]).toMatch(
      /^csp-endpoint="https:\/\/\S+sentry\.io\/api\/\d+\/security\//,
    );
  });
});

describe("enforcing nonce-based CSP (built per-request by middleware)", () => {
  it("uses nonce in script-src and omits unsafe-inline from script-src", () => {
    const csp = buildCsp(TEST_NONCE, { isDev: false });
    expect(csp).toContain(`'nonce-${TEST_NONCE}'`);
    // 'unsafe-inline' must not appear in script-src (the nonce is the gating
    // mechanism). style-src legitimately keeps it for CSS-in-JS.
    const scriptSrc = csp
      .split(";")
      .find((d) => d.trim().startsWith("script-src"));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("includes strict-dynamic for Next.js module loading", () => {
    const csp = buildCsp(TEST_NONCE, { isDev: false });
    expect(csp).toContain("'strict-dynamic'");
  });

  it("locks down the high-risk CSP directives", () => {
    const csp = buildCsp(TEST_NONCE, { isDev: false });
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    // Dev-only relaxations must not leak into the production policy.
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("ws:");
  });

  it("allowlists the Supabase origin (https + wss) in connect-src", () => {
    const csp = buildCsp(TEST_NONCE, {
      supabaseUrl: "https://x.supabase.co",
      isDev: false,
    });
    expect(csp).toContain(
      "connect-src 'self' https://x.supabase.co wss://x.supabase.co",
    );
  });

  it("stays same-origin when Supabase env is missing or malformed", () => {
    const csp = buildCsp(TEST_NONCE, { supabaseUrl: "not a url", isDev: false });
    expect(csp).toContain("connect-src 'self';");
  });

  it("keeps report-uri + report-to in the enforcing policy (Sentry)", () => {
    const reportUri = getCspReportUri();
    const csp = buildCsp(TEST_NONCE, { isDev: false });
    // Legacy (Safari/Firefox) + modern (Chrome) reporting, both pointed at the
    // Sentry security-header endpoint derived from the baked DSN.
    expect(csp).toMatch(
      /report-uri https:\/\/\S+sentry\.io\/api\/\d+\/security\/\?sentry_key=\w+/,
    );
    expect(csp).toContain("report-to csp-endpoint");
    expect(reportUri).toMatch(
      /^https:\/\/\S+sentry\.io\/api\/\d+\/security\/\?sentry_key=\w+/,
    );
  });
});

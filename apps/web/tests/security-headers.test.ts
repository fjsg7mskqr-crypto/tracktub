import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { buildCsp, getCspReportUri } from "@/lib/csp";

/** The config builds its header list at module load, so each test stubs env
 *  first and then imports a fresh copy. Vitest runs with NODE_ENV=test, which
 *  exercises the production-shaped policy (no dev-only relaxations). */
async function loadConfigHeaders() {
  const config = (await import("../next.config.mjs")).default;
  const rules = await config.headers!();
  // Rule 0 = our site-wide headers; rule 1 = Vercel BotID's own first-party
  // path (withBotId, issue #43), and nothing else.
  expect(rules).toHaveLength(2);
  expect(rules[0].source).toBe("/(.*)");
  expect(rules[1].source).toBe(BOTID_SOURCE);
  return Object.fromEntries(rules[0].headers.map((h) => [h.key, h.value]));
}

const BOTID_SOURCE =
  "/149e9513-01fa-4fb0-aad4-566afd725d1b/2d206a39-8ed7-437e-a3be-862e0f06eea3/:path*";

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
      /^csp-endpoint="https:\/\/\S+sentry\.io\/api\/\d+\/security\//
    );
  });
});

describe("Vercel BotID path headers (issue #43)", () => {
  it("only loosens framing for BotID's own path, appended after the site rule", async () => {
    // Next applies the LAST matching rule per header key, so BotID's
    // SAMEORIGIN must come after our site-wide DENY to win on its path only.
    const config = (await import("../next.config.mjs")).default;
    const rules = await config.headers!();
    const botid = Object.fromEntries(
      rules[1].headers.map((h) => [h.key, h.value])
    );
    expect(botid).toEqual({
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'",
    });
  });

  it("rewrites BotID's first-party path to Vercel", async () => {
    const config = (await import("../next.config.mjs")).default;
    const rewrites = await config.rewrites!();
    const list = Array.isArray(rewrites)
      ? rewrites
      : [...(rewrites.beforeFiles ?? []), ...(rewrites.afterFiles ?? [])];
    expect(list.map((r) => r.destination)).toEqual(
      expect.arrayContaining([
        "https://api.vercel.com/bot-protection/v1/challenge",
        "https://api.vercel.com/bot-protection/v1/proxy/:path*",
      ])
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
      "connect-src 'self' https://x.supabase.co wss://x.supabase.co"
    );
  });

  it("stays same-origin when Supabase env is missing or malformed", () => {
    const csp = buildCsp(TEST_NONCE, {
      supabaseUrl: "not a url",
      isDev: false,
    });
    expect(csp).toContain("connect-src 'self';");
    expect(csp).toContain("img-src 'self' data: blob:;");
  });

  it("allowlists the Supabase origin (only) in img-src for Storage photos", () => {
    const csp = buildCsp(TEST_NONCE, {
      supabaseUrl:
        "https://x.supabase.co/storage/v1/object/public/photos/a.jpg",
      isDev: false,
    });
    expect(csp).toContain("img-src 'self' data: blob: https://x.supabase.co;");
    // script-src is untouched by the Supabase origin.
    const scriptSrc = csp
      .split(";")
      .find((d) => d.trim().startsWith("script-src"));
    expect(scriptSrc).not.toContain("supabase.co");
  });

  it("keeps report-uri + report-to in the enforcing policy (Sentry)", () => {
    const reportUri = getCspReportUri();
    const csp = buildCsp(TEST_NONCE, { isDev: false });
    // Legacy (Safari/Firefox) + modern (Chrome) reporting, both pointed at the
    // Sentry security-header endpoint derived from the baked DSN.
    expect(csp).toMatch(
      /report-uri https:\/\/\S+sentry\.io\/api\/\d+\/security\/\?sentry_key=\w+/
    );
    expect(csp).toContain("report-to csp-endpoint");
    expect(reportUri).toMatch(
      /^https:\/\/\S+sentry\.io\/api\/\d+\/security\/\?sentry_key=\w+/
    );
  });
});

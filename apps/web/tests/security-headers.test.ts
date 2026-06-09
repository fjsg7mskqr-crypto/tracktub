import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

/** The config builds its header list at module load, so each test stubs env
 *  first and then imports a fresh copy. Vitest runs with NODE_ENV=test, which
 *  exercises the production-shaped policy (no dev-only relaxations). */
async function loadHeaders() {
  const config = (await import("../next.config.mjs")).default;
  const rules = await config.headers!();
  expect(rules).toHaveLength(1);
  expect(rules[0].source).toBe("/(.*)");
  return Object.fromEntries(rules[0].headers.map((h) => [h.key, h.value]));
}

describe("security headers", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it("sets every baseline header on all routes", async () => {
    const headers = await loadHeaders();
    expect(headers["Strict-Transport-Security"]).toContain("max-age=63072000");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    // Report-Only during burn-in (#38); the enforcing flip is tracked in #41.
    expect(headers["Content-Security-Policy-Report-Only"]).toBeDefined();
    expect(headers["Content-Security-Policy"]).toBeUndefined();
  });

  it("locks down the high-risk CSP directives", async () => {
    const csp = (await loadHeaders())["Content-Security-Policy-Report-Only"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    // Dev-only relaxation must not leak into the production policy.
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("ws:");
  });

  it("allowlists the Supabase origin (https + wss) in connect-src", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    const csp = (await loadHeaders())["Content-Security-Policy-Report-Only"];
    expect(csp).toContain(
      "connect-src 'self' https://x.supabase.co wss://x.supabase.co",
    );
  });

  it("stays same-origin when Supabase env is missing or malformed", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not a url");
    const csp = (await loadHeaders())["Content-Security-Policy-Report-Only"];
    expect(csp).toContain("connect-src 'self';");
  });
});

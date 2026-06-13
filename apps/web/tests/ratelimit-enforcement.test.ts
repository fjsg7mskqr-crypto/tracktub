import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Integration guard for #42: when the limiter DENIES (as a real burst would once
// Upstash is configured), the middleware must short-circuit the throttled path
// with a 429 — before any auth work. We force the deny by mocking checkRateLimit
// so the wiring (bucketForPath → checkRateLimit → tooManyRequests) is exercised
// end-to-end without a live Redis. tooManyRequests/bucketForPath stay real.
async function runWith(denied: boolean, url: string) {
  vi.resetModules();
  vi.doMock("@/lib/ratelimit", async () => {
    const actual =
      await vi.importActual<typeof import("@/lib/ratelimit")>(
        "@/lib/ratelimit",
      );
    return {
      ...actual,
      checkRateLimit: async () => ({
        success: !denied,
        reset: Date.now() + 30_000,
      }),
    };
  });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  const { updateSession } = await import("@/lib/supabase/middleware");
  return updateSession(new NextRequest(url));
}

describe("middleware rate-limit enforcement", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/ratelimit");
    vi.resetModules();
  });

  it("returns 429 with Retry-After on a throttled proof link when denied", async () => {
    const res = await runWith(true, "https://tracktub.vercel.app/proof/tok");
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("does not 429 a non-throttled route even when the limiter would deny", async () => {
    // /insights isn't a throttled surface, so the limiter is never consulted;
    // unconfigured Supabase env makes the middleware pass through (200).
    const res = await runWith(true, "https://tracktub.vercel.app/insights");
    expect(res.status).toBe(200);
  });

  it("allows a throttled proof link through when the limiter permits", async () => {
    const res = await runWith(false, "https://tracktub.vercel.app/proof/tok");
    expect(res.status).toBe(200);
  });
});

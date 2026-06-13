import { describe, it, expect, afterEach, vi } from "vitest";
import {
  getClientIp,
  checkRateLimit,
  tooManyRequests,
  bucketForPath,
} from "@/lib/ratelimit";

describe("bucketForPath", () => {
  it("maps the throttled public surfaces to buckets", () => {
    expect(bucketForPath("/login")).toBe("login");
    expect(bucketForPath("/auth/callback")).toBe("callback");
    expect(bucketForPath("/proof/some-token")).toBe("proof");
  });

  it("returns null for ordinary app routes", () => {
    expect(bucketForPath("/")).toBeNull();
    expect(bucketForPath("/insights")).toBeNull();
    expect(bucketForPath("/proofreading")).toBeNull();
  });
});

describe("getClientIp", () => {
  it("takes the first hop of x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(h)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const h = new Headers({ "x-real-ip": "9.9.9.9" });
    expect(getClientIp(h)).toBe("9.9.9.9");
  });

  it("falls back to a sentinel when no IP header is present", () => {
    expect(getClientIp(new Headers())).toBe("127.0.0.1");
  });
});

describe("checkRateLimit when Upstash is not configured", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is a no-op that always allows (so it ships inert until keys are set)", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const result = await checkRateLimit("login", "1.2.3.4");
    expect(result.success).toBe(true);
  });
});

describe("tooManyRequests", () => {
  it("returns a 429 with a Retry-After header derived from the reset time", () => {
    const resetMs = Date.now() + 30_000;
    const res = tooManyRequests(resetMs);
    expect(res.status).toBe(429);
    const retry = Number(res.headers.get("retry-after"));
    expect(retry).toBeGreaterThan(0);
    expect(retry).toBeLessThanOrEqual(31);
  });

  it("defaults Retry-After to a positive value when no reset is given", () => {
    const res = tooManyRequests();
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/**
 * App-layer rate limiting (issue #42) for the abuse-prone public surfaces.
 *
 * Approach: Upstash Ratelimit (sliding window, per-client-IP), chosen over
 * Vercel WAF for per-route control that lives in code and is reviewable. It is
 * ENV-GATED: with no `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` set,
 * every check is a no-op that allows the request — so this ships completely
 * inert and only activates once the owner provisions an Upstash Redis and adds
 * the two env vars (Preview + Production). Mirrors the PostHog no-op-until-keyed
 * pattern already in the codebase.
 *
 * Supabase Auth enforces its own limits on the auth API; this complements that
 * by throttling OUR routes (login surface, auth callback, waitlist, proof links)
 * at the edge.
 */
export type RateLimitBucket = "login" | "callback" | "waitlist" | "proof";

// Generous windows: a scripted burst trips them; ordinary interactive use never
// does. Per-IP, sliding window.
const LIMITS: Record<RateLimitBucket, { tokens: number; window: `${number} s` }> =
  {
    login: { tokens: 10, window: "60 s" },
    callback: { tokens: 10, window: "60 s" },
    waitlist: { tokens: 5, window: "60 s" },
    proof: { tokens: 30, window: "60 s" },
  };

// `undefined` = not yet resolved; `null` = resolved-but-unconfigured (no-op).
let limiters: Record<RateLimitBucket, Ratelimit> | null | undefined;

function getLimiters(): Record<RateLimitBucket, Ratelimit> | null {
  if (limiters !== undefined) return limiters;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    limiters = null;
    return null;
  }
  const redis = new Redis({ url, token });
  limiters = Object.fromEntries(
    (Object.keys(LIMITS) as RateLimitBucket[]).map((bucket) => [
      bucket,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          LIMITS[bucket].tokens,
          LIMITS[bucket].window,
        ),
        prefix: `tt:rl:${bucket}`,
        analytics: false,
      }),
    ]),
  ) as Record<RateLimitBucket, Ratelimit>;
  return limiters;
}

/** Best-effort client IP: first hop of x-forwarded-for, else x-real-ip, else a
 *  sentinel. Good enough as a throttle key behind Vercel's edge. */
export function getClientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

/** Map a request path to its rate-limit bucket, or null if the path isn't a
 *  throttled surface. (The waitlist is throttled in its server action, not by
 *  path, since it POSTs to a page route.) */
export function bucketForPath(path: string): RateLimitBucket | null {
  if (path === "/login") return "login";
  if (path === "/auth/callback" || path.startsWith("/auth/callback/"))
    return "callback";
  if (path === "/proof" || path.startsWith("/proof/")) return "proof";
  return null;
}

export type RateLimitResult = { success: boolean; reset?: number };

/**
 * Returns `{ success: true }` when allowed (and ALWAYS when unconfigured or on
 * any limiter error — fail open, never block real traffic on infra trouble).
 */
export async function checkRateLimit(
  bucket: RateLimitBucket,
  identifier: string,
): Promise<RateLimitResult> {
  const ls = getLimiters();
  if (!ls) return { success: true };
  try {
    const { success, reset } = await ls[bucket].limit(identifier);
    return { success, reset };
  } catch (err) {
    console.error(`[ratelimit] ${bucket} check failed; allowing:`, err);
    return { success: true };
  }
}

/** A 429 response with a Retry-After (seconds) derived from the reset epoch-ms. */
export function tooManyRequests(reset?: number): NextResponse {
  const seconds =
    reset && reset > Date.now()
      ? Math.max(1, Math.ceil((reset - Date.now()) / 1000))
      : 60;
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    { status: 429, headers: { "retry-after": String(seconds) } },
  );
}

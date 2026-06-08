import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Regression guard for the 2026-06-08 outage: middleware runs on every route,
// so if it throws when Supabase env is unset it 500s the entire site
// (MIDDLEWARE_INVOCATION_FAILED). When unconfigured it must degrade — let the
// request through — rather than crash.
describe("updateSession when Supabase env is not configured", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("does not throw and passes the request through instead of 500ing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const request = new NextRequest("https://tracktub.vercel.app/insights");
    const response = await updateSession(request);

    // NextResponse.next() pass-through: 200, no auth redirect, no thrown crash.
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});

// Second 2026-06-08 failure mode: the env vars WERE set, but to an invalid value
// (a malformed URL), so createServerClient threw `Invalid supabaseUrl` — still a
// site-wide MIDDLEWARE_INVOCATION_FAILED 500. A present-but-broken config must
// degrade exactly like a missing one rather than take the whole site down.
describe("updateSession when Supabase env is present but invalid", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("does not throw on an invalid Supabase URL; degrades to pass-through", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not-a-valid-url");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");

    const request = new NextRequest("https://tracktub.vercel.app/insights");
    const response = await updateSession(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    // The failure is logged loudly rather than swallowed silently.
    expect(errSpy).toHaveBeenCalled();
  });
});

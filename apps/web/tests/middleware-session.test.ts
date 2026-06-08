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

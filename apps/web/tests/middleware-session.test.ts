import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Drive the auth-gating path with a stub Supabase client that always resolves to
// an anonymous (no user) session, so we exercise PUBLIC_PATHS routing without a
// live backend. createServerClient is only constructed once env is valid.
function stubAnonSupabase() {
  vi.doMock("@supabase/ssr", () => ({
    createServerClient: () => ({
      auth: { getUser: async () => ({ data: { user: null } }) },
    }),
  }));
}

async function anonRequest(url: string) {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://stub.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "stub-anon-key");
  stubAnonSupabase();
  vi.resetModules();
  const { updateSession: freshUpdateSession } = await import(
    "@/lib/supabase/middleware"
  );
  return freshUpdateSession(new NextRequest(url));
}

// Drive the gate with a stubbed signed-in user (given email) so we can exercise
// the pre-launch admin lockdown without a live backend.
function stubUserSupabase(email: string) {
  vi.doMock("@supabase/ssr", () => ({
    createServerClient: () => ({
      auth: { getUser: async () => ({ data: { user: { email } } }) },
    }),
  }));
}

async function userRequest(
  url: string,
  email: string,
  opts: { nodeEnv?: string; adminEmails?: string } = {},
) {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://stub.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "stub-anon-key");
  vi.stubEnv("NODE_ENV", opts.nodeEnv ?? "production");
  vi.stubEnv("ADMIN_EMAILS", opts.adminEmails ?? "ethan@nhs-llc.com");
  stubUserSupabase(email);
  vi.resetModules();
  const { updateSession: freshUpdateSession } = await import(
    "@/lib/supabase/middleware"
  );
  return freshUpdateSession(new NextRequest(url));
}

// Pre-launch lockdown (epic #133): in production the app is reachable only by an
// ADMIN_EMAILS-allowlisted user; everyone else lands on /landing. The marketing
// surface (/landing, /blog) stays public. Local dev keeps the gate off.
describe("updateSession pre-launch admin lockdown", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@supabase/ssr");
    vi.resetModules();
  });

  it("bounces a signed-in NON-admin off a protected route to /landing (prod)", async () => {
    const response = await userRequest(
      "https://tracktub.vercel.app/team",
      "stranger@gmail.com",
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/landing");
  });

  it("lets a signed-in admin through to a protected route (prod)", async () => {
    const response = await userRequest(
      "https://tracktub.vercel.app/team",
      "ethan@nhs-llc.com",
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does NOT enforce the admin gate outside production (dev demo stays open)", async () => {
    const response = await userRequest(
      "https://localhost:3000/team",
      "stranger@gmail.com",
      { nodeEnv: "development" },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("keeps the marketing surface (/blog) public even for a non-admin", async () => {
    const response = await userRequest(
      "https://tracktub.vercel.app/blog",
      "stranger@gmail.com",
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});

// Regression guard for #104: a shared /proof/<token> link must be openable by an
// anonymous recipient (no login). The proof page reads via anon `share_token`
// RLS policies and records the open — but middleware was gating it, redirecting
// recipients to /login and making the PRD wedge metric unmeasurable.
describe("updateSession public proof links (anonymous recipients)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@supabase/ssr");
    vi.resetModules();
  });

  it("lets an anonymous request to /proof/<token> through (no /login redirect)", async () => {
    const response = await anonRequest(
      "https://tracktub.vercel.app/proof/abc-123-token",
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("still redirects an anonymous request to a protected route (/insights) to /login", async () => {
    const response = await anonRequest("https://tracktub.vercel.app/insights");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });
});

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

import { describe, it, expect, afterEach, vi } from "vitest";
import { getEnv, getEnvSafe } from "@/lib/env";

describe("getEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns required public vars", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    const env = getEnv();
    expect(env.SUPABASE_URL).toBe("https://x.supabase.co");
    expect(env.SUPABASE_ANON_KEY).toBe("anon");
  });

  // issue #18 regression: a JWT anon key pasted line-wrapped arrives with
  // newlines/spaces *inside* it. Those bytes then end up in the
  // `Authorization: Bearer <key>` header, which the fetch layer rejects with
  // "Header 'Authorization' has invalid value" — so every login fails. A JWT
  // contains no legitimate whitespace, so stripping it is always safe.
  it("strips whitespace embedded in the anon key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGci\nOiJIUzI1 NiJ9\t");
    expect(getEnv().SUPABASE_ANON_KEY).toBe("eyJhbGciOiJIUzI1NiJ9");
  });

  it("strips whitespace around the URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "  https://x.supabase.co\n");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    expect(getEnv().SUPABASE_URL).toBe("https://x.supabase.co");
  });

  it("throws naming the ANON key var when it is only whitespace", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "   \n  ");
    expect(() => getEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("throws naming the missing URL var", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    expect(() => getEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("throws naming the missing ANON key var", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(() => getEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });
});

describe("getEnvSafe", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns the vars when both are present", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    expect(getEnvSafe()).toEqual({
      SUPABASE_URL: "https://x.supabase.co",
      SUPABASE_ANON_KEY: "anon",
    });
  });

  it("strips whitespace embedded in the anon key (issue #18)", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "  https://x.supabase.co ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJh\nbGci OiJ9");
    expect(getEnvSafe()).toEqual({
      SUPABASE_URL: "https://x.supabase.co",
      SUPABASE_ANON_KEY: "eyJhbGciOiJ9",
    });
  });

  it("returns null when the anon key is only whitespace", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "  \n ");
    expect(getEnvSafe()).toBeNull();
  });

  it("returns null (not a throw) when the URL is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    expect(getEnvSafe()).toBeNull();
  });

  it("returns null (not a throw) when the anon key is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(getEnvSafe()).toBeNull();
  });
});

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

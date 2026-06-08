import { describe, it, expect, afterEach, vi } from "vitest";
import { getEnv } from "@/lib/env";

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

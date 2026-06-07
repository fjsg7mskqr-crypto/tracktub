import { describe, it, expect, beforeEach } from "vitest";
import { getEnv } from "@/lib/env";

describe("getEnv", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  });

  it("returns required public vars", () => {
    const env = getEnv();
    expect(env.SUPABASE_URL).toBe("https://x.supabase.co");
    expect(env.SUPABASE_ANON_KEY).toBe("anon");
  });

  it("throws when a required var is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => getEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});

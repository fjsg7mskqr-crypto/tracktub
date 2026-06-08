import { describe, it, expect, afterEach, vi } from "vitest";
import { getURL } from "@/lib/url";

describe("getURL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("prefers NEXT_PUBLIC_SITE_URL and strips a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tracktub.vercel.app/");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "");
    expect(getURL()).toBe("https://tracktub.vercel.app");
  });

  it("strips whitespace from a pasted site URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "  https://tracktub.vercel.app\n");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "");
    expect(getURL()).toBe("https://tracktub.vercel.app");
  });

  it("falls back to NEXT_PUBLIC_VERCEL_URL with an https scheme added", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "tracktub-git-feat.vercel.app");
    expect(getURL()).toBe("https://tracktub-git-feat.vercel.app");
  });

  it("falls back to window.location.origin when no env is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "");
    vi.stubGlobal("window", { location: { origin: "https://browser.example" } });
    expect(getURL()).toBe("https://browser.example");
  });

  it("falls back to localhost when no env and no window", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "");
    expect(getURL()).toBe("http://localhost:3000");
  });
});

import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { metadata } from "@/app/landing/page";

describe("landing page is the home page (#425)", () => {
  it("sitemap lists / (not /landing)", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain("http://localhost:3000/");
    expect(urls.some((u) => u.endsWith("/landing"))).toBe(false);
  });

  it("robots allows / and keeps the app disallows", () => {
    const rule = (
      robots().rules as { allow: string[]; disallow: string[] }[]
    )[0];
    expect(rule.allow).toContain("/");
    expect(rule.allow).not.toContain("/landing");
    for (const p of ["/tubs", "/visits", "/login", "/api/", "/proof/"]) {
      expect(rule.disallow).toContain(p);
    }
  });

  it("canonical, OG and Twitter URLs point at /", () => {
    expect(metadata.alternates?.canonical).toBe("http://localhost:3000/");
    expect(metadata.openGraph?.url).toBe("http://localhost:3000/");
    expect(JSON.stringify(metadata.twitter)).not.toContain("/landing");
  });
});

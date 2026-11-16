// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import GuidesHub, { metadata as hubMeta } from "@/app/guides/page";
import GuidePage from "@/app/guides/[slug]/page";
import { dynamic } from "@/app/guides/layout";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import {
  getAllGuides,
  getGuideBySlug,
  getRelatedGuides,
  GUIDES_BYLINE_NOTE,
} from "@/lib/guides";
import nextConfig from "../next.config.mjs";

afterEach(cleanup);

async function renderGuide(slug: string) {
  const ui = await GuidePage({ params: Promise.resolve({ slug }) });
  return render(ui);
}

describe("guides content", () => {
  it("has the turnover and water chemistry guides with required frontmatter", () => {
    const guides = getAllGuides();
    expect(guides.map((g) => g.slug)).toEqual(["turnover", "water-chemistry"]);
    for (const g of guides) {
      expect(g.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(g.section).not.toBe("");
      expect(g.record.length).toBeGreaterThan(0);
    }
  });

  it("rejects unknown and traversal slugs", () => {
    expect(getGuideBySlug("nope")).toBeNull();
    expect(getGuideBySlug("../secrets")).toBeNull();
  });

  it("links related guides both ways", () => {
    const t = getAllGuides().find((g) => g.slug === "turnover")!;
    expect(getRelatedGuides(t).map((g) => g.slug)).toEqual(["water-chemistry"]);
  });

  it("makes no claim the app or the sources don't back", () => {
    for (const g of getAllGuides()) {
      const text = getGuideBySlug(g.slug)!.content.toLowerCase();
      for (const banned of [
        "server time",
        "trusted clock",
        "trusted timestamp",
        "tamper-proof",
        "dispute-grade",
        "1–3 ppm free",
      ])
        expect(text).not.toContain(banned);
    }
  });
});

describe("/guides hub", () => {
  it("stays dynamic under the nonce CSP", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("lists both guides and links to the blog", () => {
    render(<GuidesHub />);
    expect(String(hubMeta.title)).toContain("Hot tub help");
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/guides/turnover");
    expect(hrefs).toContain("/guides/water-chemistry");
    expect(hrefs).toContain("/blog");
    expect(document.body.textContent).toContain(GUIDES_BYLINE_NOTE);
  });
});

describe("/guides/[slug]", () => {
  it.each(["turnover", "water-chemistry"])(
    "%s renders byline, last-reviewed, breadcrumbs, related and the closing box",
    async (slug) => {
      const { container } = await renderGuide(slug);
      const g = getGuideBySlug(slug)!;
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
        g.title
      );
      expect(screen.getByText("TrackTub Team")).toBeTruthy();
      expect(screen.getByText(GUIDES_BYLINE_NOTE)).toBeTruthy();
      expect(container.textContent).toMatch(
        /Last reviewed [A-Z][a-z]+ \d+, 2026/
      );

      const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
      expect(within(crumbs).getByText("Guides").getAttribute("href")).toBe(
        "/guides"
      );
      expect(within(crumbs).getByText(g.section)).toBeTruthy();

      const box = screen.getByRole("complementary");
      expect(within(box).getByText("Do this every visit")).toBeTruthy();
      expect(box.textContent).toContain(
        "TrackTub records this on every visit, and the owner gets a link."
      );
      expect(within(box).getByRole("link").getAttribute("href")).toBe(
        "/landing"
      );
      expect(screen.getByRole("heading", { name: "Related" })).toBeTruthy();

      const ld = Array.from(
        container.querySelectorAll('script[type="application/ld+json"]')
      ).map((s) => JSON.parse(s.textContent ?? ""));
      expect(ld.map((x) => x["@type"])).toEqual(["Article", "BreadcrumbList"]);
      expect(ld[1].itemListElement).toHaveLength(3);
    }
  );

  it("turnover uses the plan's H2s", async () => {
    await renderGuide("turnover");
    const h2 = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(h2).toEqual(
      expect.arrayContaining([
        "The 15-minute between-guest routine",
        "Test first: as found",
        "What to photograph (before / after / cover on)",
        "When to drain instead",
      ])
    );
  });

  it("water chemistry has the four-target table with the app's ranges", async () => {
    const { container } = await renderGuide("water-chemistry");
    const rows = Array.from(container.querySelectorAll("table tbody tr")).map(
      (r) => r.textContent ?? ""
    );
    expect(rows).toHaveLength(4);
    expect(rows[0]).toContain("80 to 120");
    expect(rows[1]).toContain("7.2 to 7.8");
    expect(rows[2]).toContain("150 to 250");
    expect(rows[3]).toContain("3 to 10");
    expect(container.textContent).toContain(
      "Local health codes may be stricter"
    );
  });
});

describe("old turnover post redirect", () => {
  it("permanently redirects the blog post to /guides/turnover", async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toContainEqual({
      source: "/blog/str-hot-tub-turnover-checklist",
      destination: "/guides/turnover",
      permanent: true,
    });
  });
});

describe("discovery", () => {
  it("sitemap lists the hub and each guide with its review date", () => {
    const map = sitemap();
    const urls = map.map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/guides"))).toBe(true);
    for (const g of getAllGuides()) {
      const entry = map.find((e) => e.url.endsWith(`/guides/${g.slug}`));
      expect(entry).toBeTruthy();
      expect(entry?.lastModified).toEqual(new Date(g.lastReviewed));
    }
    expect(urls.some((u) => u.includes("str-hot-tub-turnover-checklist"))).toBe(
      false
    );
  });

  it("robots allows /guides", () => {
    const rule = robots().rules;
    const allow = (Array.isArray(rule) ? rule[0] : rule).allow;
    expect(allow).toContain("/guides");
  });
});

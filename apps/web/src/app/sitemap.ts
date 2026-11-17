import type { MetadataRoute } from "next";
import { getAllGuides, getLatestGuideDate } from "@/lib/guides";
import { PRIVACY_UPDATED } from "@/lib/privacy";
import { getURL } from "@/lib/url";

/**
 * Last real content change to the landing page (`/`). Bump it when the landing copy
 * changes. A constant (not `new Date()`) because Google only trusts `lastmod`
 * that is consistently accurate; "modified on every request" teaches it to
 * ignore the field for the whole sitemap.
 */
const LANDING_LAST_MODIFIED = "2026-11-16";

/**
 * sitemap.xml — indexable public marketing URLs (`/` and `/guides/*`).
 * Built off the canonical base URL (`getURL()`). Submit to Google Search Console.
 * New markdown guides in `content/guides/` are picked up automatically.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getURL();
  const guides = getAllGuides();

  return [
    {
      url: `${base}/`,
      lastModified: new Date(LANDING_LAST_MODIFIED),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/guides`,
      lastModified: new Date(getLatestGuideDate() ?? LANDING_LAST_MODIFIED),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${base}/privacy`,
      lastModified: new Date(PRIVACY_UPDATED),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...guides.map((g) => ({
      url: `${base}/guides/${g.slug}`,
      lastModified: new Date(g.lastReviewed),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}

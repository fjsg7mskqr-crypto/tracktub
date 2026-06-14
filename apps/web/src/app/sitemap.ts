import type { MetadataRoute } from "next";
import { getURL } from "@/lib/url";

/**
 * sitemap.xml — the indexable public URLs. Pre-launch that's just the marketing
 * landing page; blog post URLs join here when the blog ships (issue #134).
 * Built off the canonical base URL (`getURL()`). This is the file submitted to
 * Google Search Console.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getURL();
  return [
    {
      url: `${base}/landing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}

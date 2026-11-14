import type { MetadataRoute } from "next";
import { getAllPosts, getLatestPostDate, postLastModified } from "@/lib/blog";
import { getURL } from "@/lib/url";

/**
 * Last real content change to `/landing`. Bump it when the landing copy
 * changes. A constant (not `new Date()`) because Google only trusts `lastmod`
 * that is consistently accurate; "modified on every request" teaches it to
 * ignore the field for the whole sitemap.
 */
const LANDING_LAST_MODIFIED = "2026-11-13";

/**
 * sitemap.xml — indexable public marketing URLs (`/landing`, `/blog/*`).
 * Built off the canonical base URL (`getURL()`). Submit to Google Search Console.
 * New markdown posts in `content/blog/` are picked up automatically.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getURL();
  const posts = getAllPosts();

  return [
    {
      url: `${base}/landing`,
      lastModified: new Date(LANDING_LAST_MODIFIED),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/blog`,
      lastModified: new Date(getLatestPostDate() ?? LANDING_LAST_MODIFIED),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/privacy`,
      lastModified: new Date("2026-11-14"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified: new Date("2026-11-14"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: new Date(postLastModified(post)),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}

import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { getURL } from "@/lib/url";

/**
 * sitemap.xml — indexable public marketing URLs (`/landing`, `/blog/*`).
 * Built off the canonical base URL (`getURL()`). Submit to Google Search Console.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getURL();
  const posts = getAllPosts();

  return [
    {
      url: `${base}/landing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt ?? post.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}

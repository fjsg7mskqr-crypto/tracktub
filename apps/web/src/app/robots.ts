import type { MetadataRoute } from "next";
import { getURL } from "@/lib/url";

/**
 * robots.txt — pre-launch, the only browsable public pages are the marketing
 * landing page and the blog. Everything else is the gated app (and is redirected
 * away from anonymous crawlers by middleware anyway); we disallow it explicitly
 * so crawl budget stays on the content we want indexed. Points crawlers at the
 * sitemap. Built off the canonical base URL (`getURL()`).
 */
export default function robots(): MetadataRoute.Robots {
  const base = getURL();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/landing", "/blog"],
        disallow: [
          "/add-property",
          "/team",
          "/insights",
          "/chemistry",
          "/login",
          "/auth/",
          "/p/",
          "/t/",
          "/proof/",
          "/invite",
          "/api/",
          "/dev/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

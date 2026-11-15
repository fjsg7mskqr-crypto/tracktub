import type { Metadata } from "next";
import { getURL } from "@/lib/url";

/**
 * Shared OG/Twitter card — the 1200×630 PNG export of `branding/social/og-card.svg`
 * (copied from `branding/social/og-card.png`). PNG, not SVG: Facebook, LinkedIn,
 * X and most chat unfurlers ignore SVG og:images.
 */
export const OG_IMAGE_PATH = "/og-card.png";

export function absoluteUrl(pathname: string): string {
  const base = getURL();
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

/** Metadata helpers for public marketing routes (`/landing`, `/blog/*`). */
export function marketingMetadata({
  title,
  description,
  pathname,
}: {
  title: string;
  description: string;
  pathname: string;
}): Metadata {
  const url = absoluteUrl(pathname);
  const image = absoluteUrl(OG_IMAGE_PATH);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "TrackTub",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: "TrackTub" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function articleMetadata(post: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  updatedAt?: string;
  author?: string;
}): Metadata {
  const pathname = `/blog/${post.slug}`;
  const url = absoluteUrl(pathname);
  const image = absoluteUrl(OG_IMAGE_PATH);

  return {
    title: `${post.title} — TrackTub`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      siteName: "TrackTub",
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      authors: [post.author ?? "TrackTub Team"],
      images: [{ url: image, width: 1200, height: 630, alt: "TrackTub" }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [image],
    },
  };
}

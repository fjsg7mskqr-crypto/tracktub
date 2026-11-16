import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/** Frontmatter for an evergreen guide (see `content/guides/*.md`). */
export type GuideMeta = {
  slug: string;
  title: string;
  description: string;
  /** Group on the hub and the middle breadcrumb, e.g. "Water chemistry". */
  section: string;
  /** ISO date, shown as "Last reviewed <date>". Also the sitemap lastmod. */
  lastReviewed: string;
  publishedAt: string;
  /** Slugs of related guides. */
  related: string[];
  /** Fields to record each visit, for the closing "Do this every visit" box. */
  record: string[];
  /** Sort order on the hub (ascending). */
  order: number;
};

export type Guide = GuideMeta & { content: string };

export const GUIDES_BYLINE = "TrackTub Team";
export const GUIDES_BYLINE_NOTE =
  "Written by a working hot tub tech who services rental tubs";

const CONTENT_DIR = path.join(process.cwd(), "content/guides");

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}

function parseFile(slug: string, raw: string): Guide {
  const { data, content } = matter(raw);
  const lastReviewed = String(data.lastReviewed ?? "");
  return {
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ""),
    section: String(data.section ?? "Guides"),
    lastReviewed,
    publishedAt: String(data.publishedAt ?? lastReviewed),
    related: strList(data.related),
    record: strList(data.record),
    order: Number(data.order ?? 100),
    content: content.trim(),
  };
}

/** All guides, in hub order. */
export function getAllGuides(): GuideMeta[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const slug = name.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(CONTENT_DIR, name), "utf8");
      const { content: _content, ...meta } = parseFile(slug, raw);
      return meta;
    })
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}

export function getGuideSlugs(): string[] {
  return getAllGuides().map((g) => g.slug);
}

export function getGuideBySlug(slug: string): Guide | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const filePath = path.join(CONTENT_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  return parseFile(slug, fs.readFileSync(filePath, "utf8"));
}

/** Guides listed in this guide's `related` frontmatter that exist. */
export function getRelatedGuides(guide: GuideMeta): GuideMeta[] {
  const all = getAllGuides();
  return guide.related
    .map((slug) => all.find((g) => g.slug === slug))
    .filter((g): g is GuideMeta => Boolean(g) && g?.slug !== guide.slug);
}

/** Newest `lastReviewed` across all guides (drives the hub's sitemap lastmod). */
export function getLatestGuideDate(): string | null {
  return (
    getAllGuides()
      .map((g) => g.lastReviewed)
      .sort((x, y) => x.localeCompare(y))
      .at(-1) ?? null
  );
}

/** ISO `YYYY-MM-DD` → "November 16, 2026" (UTC, so it never shifts a day). */
export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Section name → URL-safe anchor id on the hub. */
export function sectionAnchor(section: string): string {
  return section.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

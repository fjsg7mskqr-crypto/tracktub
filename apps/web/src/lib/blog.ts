import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/** Frontmatter for a blog post (see `content/blog/*.md`). */
export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  pillar?: string;
  author?: string;
};

export type BlogPost = BlogPostMeta & {
  content: string;
};

const CONTENT_DIR = path.join(process.cwd(), "content/blog");

function parseFile(slug: string, raw: string): BlogPost {
  const { data, content } = matter(raw);
  const title = String(data.title ?? slug);
  const description = String(data.description ?? "");
  const publishedAt = String(data.publishedAt ?? data.date ?? "");
  const updatedAt = data.updatedAt ? String(data.updatedAt) : undefined;
  const pillar = data.pillar ? String(data.pillar) : undefined;
  const author = data.author ? String(data.author) : "TrackTub Team";

  return {
    slug,
    title,
    description,
    publishedAt,
    updatedAt,
    pillar,
    author,
    content: content.trim(),
  };
}

/** All published posts, newest first. */
export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const slug = name.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(CONTENT_DIR, name), "utf8");
      const post = parseFile(slug, raw);
      const { content: _content, ...meta } = post;
      return meta;
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getPostSlugs(): string[] {
  return getAllPosts().map((p) => p.slug);
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  return parseFile(slug, raw);
}

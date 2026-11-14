import { describe, expect, it } from "vitest";
import { getAllPosts, getPostBySlug, getPostSlugs } from "@/lib/blog";

describe("blog content", () => {
  it("lists published posts newest first", () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThan(0);
    for (let i = 1; i < posts.length; i++) {
      expect(
        posts[i - 1]!.publishedAt.localeCompare(posts[i]!.publishedAt)
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it("every post has the frontmatter the page and sitemap rely on", () => {
    for (const meta of getAllPosts()) {
      expect(meta.title.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
      expect(Number.isNaN(Date.parse(meta.publishedAt))).toBe(false);
    }
  });

  it("internal /blog links in posts point at real posts", () => {
    const slugs = new Set(getPostSlugs());
    for (const slug of slugs) {
      const body = getPostBySlug(slug)?.content ?? "";
      for (const m of body.matchAll(/\]\(\/blog\/([a-z0-9-]+)\)/g)) {
        expect(slugs.has(m[1]!)).toBe(true);
      }
    }
  });

  it("loads a post by slug with frontmatter", () => {
    const post = getPostBySlug("str-hot-tub-turnover-checklist");
    expect(post).not.toBeNull();
    expect(post?.title).toContain("Turnover Checklist");
    expect(post?.pillar).toBe("Turnover SOP");
    expect(post?.content.length).toBeGreaterThan(500);
  });

  it("returns null for unknown slugs", () => {
    expect(getPostBySlug("does-not-exist")).toBeNull();
  });

  it("rejects path traversal in slug", () => {
    expect(getPostBySlug("../secrets")).toBeNull();
    expect(getPostBySlug("foo/bar")).toBeNull();
  });

  it("exposes slugs for static generation", () => {
    expect(getPostSlugs()).toContain("str-hot-tub-turnover-checklist");
  });
});

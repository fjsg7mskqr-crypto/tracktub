import { describe, expect, it } from "vitest";
import {
  getAllPosts,
  getLatestPostDate,
  getPostBySlug,
  getPostSlugs,
  getRelatedPosts,
  postLastModified,
} from "@/lib/blog";

describe("blog content", () => {
  it("lists published posts newest first", () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThan(0);
    expect(posts[0]?.slug).toBe("str-hot-tub-turnover-checklist");
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

describe("blog SEO helpers", () => {
  it("latest post date is the newest last-modified date", () => {
    const latest = getLatestPostDate();
    const dates = getAllPosts().map(postLastModified);
    expect(latest).not.toBeNull();
    for (const d of dates) expect(d <= (latest as string)).toBe(true);
  });

  it("related posts never include the current post and respect the limit", () => {
    for (const slug of getPostSlugs()) {
      const related = getRelatedPosts(slug, 2);
      expect(related.length).toBeLessThanOrEqual(2);
      expect(related.map((p) => p.slug)).not.toContain(slug);
    }
  });

  it("related posts list same-pillar posts first", () => {
    for (const post of getAllPosts()) {
      const related = getRelatedPosts(post.slug, 10);
      const firstOther = related.findIndex((p) => p.pillar !== post.pillar);
      if (firstOther === -1) continue;
      const after = related.slice(firstOther);
      expect(after.some((p) => p.pillar === post.pillar)).toBe(false);
    }
  });
});

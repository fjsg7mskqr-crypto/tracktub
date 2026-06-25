import { describe, expect, it } from "vitest";
import { getAllPosts, getPostBySlug, getPostSlugs } from "@/lib/blog";

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

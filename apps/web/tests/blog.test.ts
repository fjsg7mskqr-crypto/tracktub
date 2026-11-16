import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  getAllPosts,
  getLatestPostDate,
  getPostBySlug,
  getRelatedPosts,
  postLastModified,
} from "@/lib/blog";

// The live turnover post graduated to /guides/turnover, so the blog may have no
// posts. Ordering is tested against a temp directory of fixtures.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-"));
function post(slug: string, publishedAt: string) {
  fs.writeFileSync(
    path.join(dir, `${slug}.md`),
    `---\ntitle: ${slug}\npublishedAt: "${publishedAt}"\n---\nBody`
  );
}
post("older", "2026-01-01");
post("newer", "2026-02-01");
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("blog content", () => {
  it("lists posts newest first", () => {
    expect(getAllPosts(dir).map((p) => p.slug)).toEqual(["newer", "older"]);
  });

  it("returns an empty list for a missing directory", () => {
    expect(getAllPosts(path.join(dir, "nope"))).toEqual([]);
  });

  it("returns null for unknown slugs and rejects path traversal", () => {
    expect(getPostBySlug("does-not-exist")).toBeNull();
    expect(getPostBySlug("../secrets")).toBeNull();
    expect(getPostBySlug("foo/bar")).toBeNull();
  });

  it("no longer ships the turnover checklist post (moved to /guides)", () => {
    expect(getPostBySlug("str-hot-tub-turnover-checklist")).toBeNull();
  });
});

describe("blog SEO helpers", () => {
  it("falls back to publishedAt for last-modified", () => {
    const [first] = getAllPosts(dir);
    expect(first && postLastModified(first)).toBe("2026-02-01");
  });

  it("latest date and related posts are safe when there are no posts", () => {
    expect(getLatestPostDate()).toBeNull();
    expect(getRelatedPosts("anything")).toEqual([]);
  });
});

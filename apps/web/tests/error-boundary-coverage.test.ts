import { describe, it, expect } from "vitest";
import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

/**
 * Guard for the 2026-09-02 "dead tap": tapping "New turnover" did nothing and
 * showed nothing. In the App Router, a server component that throws during a
 * CLIENT-SIDE navigation, with no `error.tsx` anywhere in its segment tree,
 * makes the router abort silently — the screen simply does not change. There is
 * no error, no log the user can see, and no navigation.
 *
 * `global-error.tsx` does NOT cover this: it replaces the root layout and only
 * catches throws originating in that layout.
 *
 * So: every route segment that renders a page must have an `error.tsx` at or
 * above it. This test walks the real app directory, so a new route added
 * without a boundary fails here rather than in the founder's hands.
 *
 * (Note: the boundary was NOT proven to be the cause of that specific bug —
 * see the spec's "The dead tap" section. It is required regardless, because a
 * silent failure is unacceptable whatever produced it.)
 */

const APP_DIR = join(__dirname, "..", "src", "app");

/** Every directory under src/app containing a page.tsx, as segment arrays. */
async function findPageDirs(dir: string, base = dir): Promise<string[][]> {
  const out: string[][] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  if (entries.some((e) => e.isFile() && e.name === "page.tsx")) {
    const rel = relative(base, dir);
    out.push(rel === "" ? [] : rel.split(sep));
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      out.push(...(await findPageDirs(join(dir, entry.name), base)));
    }
  }
  return out;
}

/** True when this segment, or any ancestor, holds an error.tsx. */
async function hasBoundary(segments: string[]): Promise<boolean> {
  for (let i = segments.length; i >= 0; i--) {
    const dir = join(APP_DIR, ...segments.slice(0, i));
    const entries = await readdir(dir, { withFileTypes: true });
    if (entries.some((e) => e.isFile() && e.name === "error.tsx")) return true;
  }
  return false;
}

describe("error boundary coverage", () => {
  it("every route segment with a page has an error.tsx at or above it", async () => {
    const pageDirs = await findPageDirs(APP_DIR);
    expect(pageDirs.length).toBeGreaterThan(0);

    const unguarded: string[] = [];
    for (const segments of pageDirs) {
      if (!(await hasBoundary(segments))) {
        unguarded.push("/" + segments.join("/"));
      }
    }

    expect(unguarded).toEqual([]);
  });
});

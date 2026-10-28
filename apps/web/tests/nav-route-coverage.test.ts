import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { routeExists } from "@/lib/routes";

/**
 * Guard for the orphaned-tab bug found 2026-09-02: BottomTabBar advertised
 * Today / Tubs / History / More, and three of those four had no route at all.
 * They 404'd in production for six weeks and no test noticed.
 *
 * Nav components are the one place a broken link is guaranteed to be hit, so
 * every href they hard-code must resolve to a real route.
 */

const APP_DIR = join(__dirname, "..", "src", "app");

/**
 * Files whose hard-coded hrefs must all resolve. Add new nav components here.
 * TabBar renders hrefs from app-routes.ts, so the literals live there; TabBar
 * and Shell stay listed so any href hard-coded into them later is caught too.
 */
const NAV_FILES = [
  "src/lib/app-routes.ts",
  "src/components/app/TabBar.tsx",
  "src/components/Shell.tsx",
  "src/app/page.tsx",
];

/** Pull `href: "/x"` and `href="/x"` literals; ignore template strings. */
function hrefsIn(relPath: string): string[] {
  const source = readFileSync(join(__dirname, "..", relPath), "utf8");
  const matches = source.matchAll(/href[:=]\s*"(\/[^"{}]*)"/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

describe("nav route coverage", () => {
  for (const file of NAV_FILES) {
    it(`every hard-coded href in ${file} resolves to a route`, () => {
      const hrefs = hrefsIn(file);
      const broken = hrefs.filter((href) => !routeExists(href, APP_DIR));
      expect(broken).toEqual([]);
    });
  }

  it("finds the tab hrefs (guards the extraction regex itself)", () => {
    expect(hrefsIn("src/lib/app-routes.ts")).toEqual([
      "/",
      "/calendar",
      "/tubs",
      "/reports",
    ]);
  });
});

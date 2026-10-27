import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Does `href` resolve to a real App Router route under `appDir`?
 *
 * Walks the href's segments against the filesystem, matching a literal
 * directory first and falling back to a dynamic segment (`[id]`, `[...slug]`).
 * A route exists when the final directory holds a `page.tsx`.
 *
 * Node-only (uses `fs`) — for tests and build-time checks, never the browser.
 */
export function routeExists(href: string, appDir: string): boolean {
  const path = href.split("?")[0].split("#")[0];
  const segments = path.split("/").filter(Boolean);

  let dir = appDir;
  for (const segment of segments) {
    const literal = join(dir, segment);
    if (existsSync(literal)) {
      dir = literal;
      continue;
    }
    const dynamic = readdirSync(dir, { withFileTypes: true }).find(
      (entry) => entry.isDirectory() && entry.name.startsWith("["),
    );
    if (!dynamic) return false;
    dir = join(dir, dynamic.name);
  }

  return existsSync(join(dir, "page.tsx"));
}

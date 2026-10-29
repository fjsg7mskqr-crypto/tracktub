import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Does `href` resolve to a real App Router route under `appDir`?
 *
 * Walks the href's segments against the filesystem, matching a literal
 * directory first and falling back to a dynamic segment (`[id]`, `[...slug]`).
 * Route-group folders (`(name)`) are looked through. A route exists when the
 * final directory holds a `page.tsx`.
 *
 * Node-only (uses `fs`) — for tests and build-time checks, never the browser.
 */
export function routeExists(href: string, appDir: string): boolean {
  const path = href.split("?")[0].split("#")[0];
  const segments = path.split("/").filter(Boolean);

  // Route groups (`(home)`) add a folder without adding a URL segment, so every
  // level is the directory itself plus any groups inside it.
  let dirs = withGroups(appDir);
  for (const segment of segments) {
    const next: string[] = [];
    for (const dir of dirs) {
      const literal = join(dir, segment);
      if (existsSync(literal)) {
        next.push(literal);
        continue;
      }
      const dynamic = readdirSync(dir, { withFileTypes: true }).find(
        (entry) => entry.isDirectory() && entry.name.startsWith("[")
      );
      if (dynamic) next.push(join(dir, dynamic.name));
    }
    if (next.length === 0) return false;
    dirs = next.flatMap(withGroups);
  }

  return dirs.some((dir) => existsSync(join(dir, "page.tsx")));
}

/** `dir` and every route-group folder nested directly (or via groups) in it. */
function withGroups(dir: string): string[] {
  return [
    dir,
    ...readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith("("))
      .flatMap((e) => withGroups(join(dir, e.name))),
  ];
}

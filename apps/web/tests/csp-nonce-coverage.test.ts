import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

/**
 * Regression guard for #281 (and #271 before it).
 *
 * The enforcing CSP is nonce-based with 'strict-dynamic' (see src/lib/csp.ts).
 * Under CSP Level 3, 'strict-dynamic' makes browsers IGNORE 'self' and every
 * host-source in `script-src`, so ONLY scripts carrying that request's nonce
 * run. Next injects the nonce while *rendering* — which means a statically
 * prerendered route is written to disk as frozen, nonce-less HTML at build
 * time, then served alongside a response header carrying a fresh per-request
 * nonce. Nothing matches, and every script on the page is blocked.
 *
 * The page still returns 200 and still renders its server HTML, so this is
 * invisible to uptime checks and to a quick eyeball. It reached production
 * twice: /login (#271, "Continue with Google" silently inert) and
 * /landing + /blog (#281, waitlist form silently unable to submit).
 *
 * This test reads the real `next build` output. CI runs `npm run build` before
 * `npm run test`, so the artifacts are present; locally it skips with a note if
 * you haven't built.
 */

const APP_DIR = join(__dirname, "..", ".next", "server", "app");

/**
 * Prerendered HTML that is allowed to ship nonce-less scripts, because the
 * HTML is never actually delivered to a browser. Each entry needs a reason —
 * if a new page shows up here, that is the signal to make it dynamic instead.
 */
const ALLOWED: Record<string, string> = {
  "chemistry.html":
    "server-side redirect() to /operations — responds 307, this shell is never sent",
  "operations/maintenance.html":
    "server-side redirect() to /operations/schedule — responds 307, never sent",
  "dev/ui.html": "dev-only gallery; notFound() in production",
  // These two are served, but degrade acceptably: static error text with no
  // interactive elements. Next does not support route segment config on the
  // built-in not-found/global-error boundaries.
  "_not-found.html": "error shell — static text only, nothing interactive to break",
  "_global-error.html": "error shell — static text only, nothing interactive to break",
};

async function findHtml(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await findHtml(full)));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

describe("CSP nonce coverage over prerendered routes (#281)", () => {
  it.skipIf(!existsSync(APP_DIR))(
    "no prerendered page ships scripts that the nonce CSP would block",
    async () => {
      const offenders = (await findHtml(APP_DIR))
        .map((file) => ({ file, rel: relative(APP_DIR, file) }))
        .filter(({ rel }) => !(rel in ALLOWED))
        .filter(({ file }) => readFileSync(file, "utf8").includes("<script"));

      expect(
        offenders.map((o) => o.rel),
        "These routes are statically prerendered but ship <script> tags. Under the " +
          "enforcing nonce CSP with 'strict-dynamic' every one of those scripts is " +
          "blocked in the browser: no hydration, no client routing, no analytics, and " +
          "any interactive component is inert — while the page still returns 200. " +
          'Fix by adding `export const dynamic = "force-dynamic";` to the route ' +
          "segment (see src/app/landing/page.tsx), or add an entry to ALLOWED here " +
          "with a reason if the HTML genuinely never reaches a browser.",
      ).toEqual([]);
    },
  );

  it.skipIf(!existsSync(APP_DIR))(
    "the routes that broke in production stay dynamic",
    async () => {
      // /login (#271), /landing and /blog (#281). If any of these reappears as
      // prerendered HTML, the corresponding outage has regressed.
      const rels = (await findHtml(APP_DIR)).map((f) => relative(APP_DIR, f));
      expect(rels).not.toContain("login.html");
      expect(rels).not.toContain("landing.html");
      expect(rels).not.toContain("blog.html");
    },
  );
});

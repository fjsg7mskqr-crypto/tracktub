/**
 * Workaround for Vercel + Next 16 post-build validation with multi-segment
 * Root Directory (apps/web): the platform looks for .next at the monorepo root
 * (/vercel/path0/.next) instead of apps/web/.next. See vercel/vercel#15937.
 *
 * Runs only on Vercel after `next build`; CI and local dev use `npm run build`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (!process.env.VERCEL) {
  process.exit(0);
}

const appDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const appNext = path.join(appDir, ".next");
const repoRootNext = path.join(appDir, "..", "..", ".next");

if (!fs.existsSync(appNext)) {
  console.error(`link-next-at-monorepo-root: missing ${appNext}`);
  process.exit(1);
}

fs.rmSync(repoRootNext, { recursive: true, force: true });
fs.symlinkSync(appNext, repoRootNext, "dir");
console.log(`link-next-at-monorepo-root: ${repoRootNext} -> ${appNext}`);

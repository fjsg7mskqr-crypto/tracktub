/* Build a self-contained HTML gallery of the branding/ package.
   Usage: node gallery.mjs <output.html>
   SVGs inlined; PNGs embedded as data-URIs; full standalone document (opens via
   file:// — no server needed). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT = process.argv[2];
if (!OUT) throw new Error("pass output path");

const exists = (p) => fs.existsSync(path.join(ROOT, p));
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const b64 = (p) => fs.readFileSync(path.join(ROOT, p)).toString("base64");
const kb = (p) => Math.max(1, Math.round(fs.statSync(path.join(ROOT, p)).size / 1024));
const lsSvg = (d) => (exists(d) ? fs.readdirSync(path.join(ROOT, d)).filter((f) => f.endsWith(".svg")).sort() : []);
const isLight = (n) => /light|black/.test(n);
const nm = (f) => f.replace(/^tracktub-/, "").replace(/\.svg$/, "");

const svgInline = (p, h) => read(p).replace("<svg ", `<svg style="height:${h}px;width:auto;max-width:100%;display:block" `);
const png = (p, style) => `<img alt="${p}" src="data:image/png;base64,${b64(p)}" style="${style}"/>`;
const darkTile = (i, m = 120) => `<div style="background:#0E0F11;border:1px solid rgba(255,255,255,.10);border-radius:12px;padding:20px;display:flex;align-items:center;justify-content:center;min-height:${m}px">${i}</div>`;
const lightTile = (i, m = 120) => `<div style="background:#FFFFFF;border:1px solid rgba(8,9,10,.12);border-radius:12px;padding:20px;display:flex;align-items:center;justify-content:center;min-height:${m}px">${i}</div>`;
const cap = (t) => `<div class="mono" style="font-size:11px;color:#8A8F98;margin-top:7px;text-align:center">${t}</div>`;
const cell = (tile, label) => `<div>${tile}${cap(label)}</div>`;
const grid = (cells, min = 220) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(${min}px,1fr));gap:14px">${cells.join("")}</div>`;

function logoRow(dir, h, min) {
  return grid(
    lsSvg(dir).map((f) => {
      const inner = svgInline(`${dir}/${f}`, h);
      return cell(isLight(f) ? lightTile(inner) : darkTile(inner), nm(f));
    }),
    min
  );
}

let body = `<h2>TrackTub — branding/ package</h2>
<p class="subtitle">The consolidated, Figma-ready brand folder. Every asset is SVG <b>and</b> PNG; shown here straight from disk.</p>`;

body += `<div class="section"><span class="label">brand-board (the one-sheet)</span>${darkTile(png("branding/brand-board.png", "width:100%;max-width:920px;border-radius:8px"), 160)}</div>`;
body += `<div class="section"><span class="label">Lockups · horizontal + stacked</span>${logoRow("branding/logo/lockup", 64, 280)}</div>`;
body += `<div class="section"><span class="label">The mark</span>${logoRow("branding/logo/mark", 92, 170)}</div>`;
body += `<div class="section"><span class="label">Wordmark (outlined)</span>${logoRow("branding/logo/wordmark", 40, 280)}</div>`;

const icons = lsSvg("branding/icon").map((f) => cell(darkTile(svgInline(`branding/icon/${f}`, 72)), nm(f)));
const pwaDir = "branding/icon/pwa";
const pwa = exists(pwaDir)
  ? fs.readdirSync(path.join(ROOT, pwaDir)).filter((f) => f.endsWith(".png")).sort()
      .map((f) => cell(darkTile(png(`${pwaDir}/${f}`, "width:72px;height:72px;border-radius:14px"), 120), f.replace(".png", "")))
  : [];
body += `<div class="section"><span class="label">Icons · favicon / app / maskable / monochrome + PWA PNGs</span>${grid([...icons, ...pwa], 170)}</div>`;

body += `<div class="section"><span class="label">Social &amp; marketing</span><div style="display:flex;flex-direction:column;gap:14px">` +
  cell(darkTile(png("branding/social/og-card.png", "width:100%;max-width:620px;border-radius:8px"), 160), "og-card · 1200×630") +
  cell(darkTile(png("branding/social/x-header.png", "width:100%;max-width:620px;border-radius:8px"), 160), "x-header · 1500×500") +
  cell(darkTile(svgInline("branding/social/avatar.svg", 120), 160), "avatar") +
  `</div></div>`;

body += `<div class="section"><span class="label">Print (SVG vector + 300-DPI PNG)</span>` +
  grid([
    cell(lightTile(png("branding/print/tracktub-horizontal-color-300dpi.png", "width:100%;max-width:320px"), 130), "color · 300dpi"),
    cell(lightTile(png("branding/print/tracktub-horizontal-black-300dpi.png", "width:100%;max-width:320px"), 130), "black · 300dpi"),
  ], 280) + `</div>`;

body += `<div class="section"><span class="label">Color + device</span>` +
  grid([
    cell(darkTile(png("branding/color/swatches.png", "width:100%;max-width:480px;border-radius:8px"), 120), "color/swatches"),
    cell(darkTile(svgInline("branding/device/waterline.svg", 18), 90), "device/waterline"),
  ], 300) + `</div>`;

// inventory
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel, acc);
    else acc.push(rel);
  }
  return acc;
}
const files = walk("branding");
body += `<div class="section"><span class="label">Full inventory · ${files.length} files in branding/</span>` +
  `<pre style="background:#0E0F11;border:1px solid rgba(255,255,255,.10);border-radius:10px;padding:16px;overflow:auto;font-size:11.5px;line-height:1.6;color:#8A8F98">${files.map((f) => `${f}  ·  ${kb(f)} KB`).join("\n")}</pre></div>`;

const DOC = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TrackTub branding</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}
body{margin:0 auto;padding:32px;max-width:1120px;background:#08090A;color:#EDEDEF;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.5}
h2{font-size:26px;letter-spacing:-.02em;margin:0 0 4px}h3{font-size:15px;margin:0}
.subtitle{color:#8A8F98;font-size:14px;margin:4px 0 0}.section{margin:34px 0}
.label{font-family:ui-monospace,"SF Mono",monospace;text-transform:uppercase;letter-spacing:.12em;font-size:11px;color:#5F646E;display:block;margin-bottom:14px}
.mono{font-family:ui-monospace,"SF Mono",monospace}pre{margin:0}a{color:#3B82F6}
</style></head><body>${body}</body></html>`;
fs.writeFileSync(OUT, DOC);
console.log("wrote", OUT, `(${files.length} branding/ files)`);

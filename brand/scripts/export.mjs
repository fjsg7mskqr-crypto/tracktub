/* TrackTub brand export — generates the outlined wordmark + lockups and every
   raster from the SVG masters. Build-only; run with `npm run export`.

   Outputs:
     brand/logo/wordmark/*.svg   (outlined, 4 treatments)
     brand/logo/lockup/*.svg     (horizontal + stacked, outlined, 4 treatments)
     brand/logo/export/*.png     (transparent PNGs for slides/Canva)
     brand/social/*              (avatar, OG card, X header — svg + png)
     brand/print/*               (300-DPI lockups, on white + black)
     apps/web/src/app/{icon.svg,apple-icon.png,favicon.ico}
     apps/web/public/icons/*     (PWA: any/maskable/monochrome)
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const BRAND = path.resolve(ROOT, "brand");
const WEB = path.resolve(ROOT, "apps/web");

const C = {
  blue: "#3B82F6",
  white: "#EDEDEF",
  ink: "#08090A",
  pureWhite: "#FFFFFF",
  black: "#000000",
  lo: "#8A8F98",
};

/* ----------------------------- font / outlining ---------------------------- */
function findFont() {
  const dir = path.join(__dirname, ".fonts");
  const hit = fs
    .readdirSync(dir)
    .find((f) => /semibold/i.test(f) && /\.(otf|ttf)$/i.test(f));
  if (!hit) throw new Error("No SemiBold Inter font found in brand/scripts/.fonts");
  return path.join(dir, hit);
}
const font = opentype.loadSync(findFont());

// Lay out a string into per-glyph x positions (px) with em-relative tracking.
function layout(text, fontSize, trackingEm) {
  const scale = fontSize / font.unitsPerEm;
  const tracking = trackingEm * fontSize;
  const glyphs = font.stringToGlyphs(text);
  const positions = [];
  let x = 0;
  for (let i = 0; i < glyphs.length; i++) {
    positions.push(x);
    const adv = glyphs[i].advanceWidth * scale;
    let kern = 0;
    if (i < glyphs.length - 1) kern = font.getKerningValue(glyphs[i], glyphs[i + 1]) * scale;
    x += adv + kern + tracking;
  }
  return { glyphs, positions, scale, advance: x - tracking };
}

// Build path data + tight bbox for a slice [from,to) of a laid-out string.
function slicePaths(glyphs, positions, fontSize, from, to) {
  let d = "";
  let bb = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  for (let i = from; i < to; i++) {
    const gp = glyphs[i].getPath(positions[i], 0, fontSize);
    const b = gp.getBoundingBox();
    bb.x1 = Math.min(bb.x1, b.x1);
    bb.y1 = Math.min(bb.y1, b.y1);
    bb.x2 = Math.max(bb.x2, b.x2);
    bb.y2 = Math.max(bb.y2, b.y2);
    d += gp.toPathData(3) + " ";
  }
  return { d: d.trim(), bb };
}

// Outlined "TrackTub" wordmark. Returns {inner, width, height} with content at 0,0.
function wordmark(trackColor, tubColor, fontSize = 100) {
  const { glyphs, positions } = layout("TrackTub", fontSize, -0.03);
  const track = slicePaths(glyphs, positions, fontSize, 0, 5); // T r a c k
  const tub = slicePaths(glyphs, positions, fontSize, 5, 8); // T u b
  const x1 = Math.min(track.bb.x1, tub.bb.x1);
  const y1 = Math.min(track.bb.y1, tub.bb.y1);
  const x2 = Math.max(track.bb.x2, tub.bb.x2);
  const y2 = Math.max(track.bb.y2, tub.bb.y2);
  const inner =
    `<g transform="translate(${(-x1).toFixed(3)} ${(-y1).toFixed(3)})">` +
    `<path d="${track.d}" fill="${trackColor}"/>` +
    `<path d="${tub.d}" fill="${tubColor}"/>` +
    `</g>`;
  return { inner, width: x2 - x1, height: y2 - y1 };
}

// One outlined text run (single fill). Returns {inner,width,height} at 0,0.
function textRun(text, color, fontSize, trackingEm = -0.01) {
  const { glyphs, positions, advance } = layout(text, fontSize, trackingEm);
  const { d, bb } = slicePaths(glyphs, positions, fontSize, 0, glyphs.length);
  const inner =
    `<g transform="translate(${(-bb.x1).toFixed(3)} ${(-bb.y1).toFixed(3)})">` +
    `<path d="${d}" fill="${color}"/></g>`;
  return { inner, width: Math.max(advance, bb.x2 - bb.x1), height: bb.y2 - bb.y1 };
}

/* -------------------------------- the mark --------------------------------- */
// Mark drawn on the 64 grid. Content optically spans ~x10..54, y16..48 (centered).
function markInner(check, water) {
  return (
    `<path d="M10 40 q5.5 -3.5 11 0 t11 0 t11 0 t11 0" stroke="${water}" stroke-width="2" fill="none"/>` +
    `<path d="M14 46 q5 -2.2 10 0 t10 0 t10 0 t10 0" stroke="${water}" stroke-width="1.2" fill="none" opacity="0.55"/>` +
    `<path d="M16 30 L26 40" stroke="${check}" stroke-width="5.5" stroke-linecap="square"/>` +
    `<path d="M26 40 L48 16" stroke="${check}" stroke-width="5.5" stroke-linecap="square"/>`
  );
}
const MARK = { contentLeft: 10, contentRight: 54, contentTop: 16, contentBottom: 48 };

/* ------------------------------- lockups ----------------------------------- */
function lockupHorizontal(check, water, trackC, tubC) {
  const wm = wordmark(trackC, tubC);
  const visibleMarkH = wm.height * 1.45;
  const s = visibleMarkH / (MARK.contentBottom - MARK.contentTop); // scale 64-grid
  const markVisibleW = (MARK.contentRight - MARK.contentLeft) * s;
  const gap = wm.height * 0.55;
  const H = visibleMarkH;
  const W = markVisibleW + gap + wm.width;
  // place mark: content-left→0, content-vert-center→H/2
  const boxLeft = -MARK.contentLeft * s;
  const boxTop = H / 2 - ((MARK.contentTop + MARK.contentBottom) / 2) * s;
  const wmX = markVisibleW + gap;
  const wmY = (H - wm.height) / 2;
  const inner =
    `<g transform="translate(${boxLeft.toFixed(3)} ${boxTop.toFixed(3)}) scale(${s.toFixed(4)})">${markInner(check, water)}</g>` +
    `<g transform="translate(${wmX.toFixed(3)} ${wmY.toFixed(3)})">${wm.inner}</g>`;
  return { inner, width: W, height: H };
}

function lockupStacked(check, water, trackC, tubC) {
  const wm = wordmark(trackC, tubC);
  const visibleMarkH = wm.height * 1.7;
  const s = visibleMarkH / (MARK.contentBottom - MARK.contentTop);
  const markVisibleW = (MARK.contentRight - MARK.contentLeft) * s;
  const gap = wm.height * 0.55;
  const W = Math.max(markVisibleW, wm.width);
  const H = visibleMarkH + gap + wm.height;
  const boxLeft = W / 2 - ((MARK.contentLeft + MARK.contentRight) / 2) * s;
  const boxTop = -MARK.contentTop * s;
  const wmX = (W - wm.width) / 2;
  const wmY = visibleMarkH + gap;
  const inner =
    `<g transform="translate(${boxLeft.toFixed(3)} ${boxTop.toFixed(3)}) scale(${s.toFixed(4)})">${markInner(check, water)}</g>` +
    `<g transform="translate(${wmX.toFixed(3)} ${wmY.toFixed(3)})">${wm.inner}</g>`;
  return { inner, width: W, height: H };
}

/* ------------------------------- svg helpers ------------------------------- */
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed ? w.toFixed(2) : w}" height="${h.toFixed ? h.toFixed(2) : h}" viewBox="0 0 ${w.toFixed ? w.toFixed(2) : w} ${h.toFixed ? h.toFixed(2) : h}" fill="none" role="img" aria-label="TrackTub">${body}</svg>\n`;

// Like svg() but adds clear space around the artwork (negative-offset viewBox).
const framed = (w, h, body, padFrac = 0.08) => {
  const pad = h * padFrac;
  const W = w + pad * 2;
  const H = h + pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(2)}" height="${H.toFixed(2)}" viewBox="${(-pad).toFixed(2)} ${(-pad).toFixed(2)} ${W.toFixed(2)} ${H.toFixed(2)}" fill="none" role="img" aria-label="TrackTub">${body}</svg>\n`;
};

function write(rel, content) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, content);
  console.log("  ✓", rel);
}

async function rasterize(svgStr, { width, height, flatten = null }, rel) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  let img = sharp(Buffer.from(svgStr), { density: 320 }).resize(width, height, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (flatten) img = img.flatten({ background: flatten });
  await img.png().toFile(out);
  console.log("  ✓", rel, `(${width}×${height})`);
}

/* ------------------------------- read masters ------------------------------ */
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const faviconSvg = read("brand/logo/favicon/tracktub-favicon.svg");
const appIconSvg = read("brand/logo/app-icon/app-icon.svg");
const maskableSvg = read("brand/logo/app-icon/app-icon-maskable.svg");
const monoSvg = read("brand/logo/app-icon/app-icon-monochrome.svg");

/* ================================== RUN ==================================== */
const TREATMENTS = [
  { id: "color-dark", check: C.white, water: C.blue, track: C.white, tub: C.blue },
  { id: "color-light", check: C.ink, water: C.blue, track: C.ink, tub: C.blue },
  { id: "white", check: C.pureWhite, water: C.pureWhite, track: C.pureWhite, tub: C.pureWhite },
  { id: "black", check: C.black, water: C.black, track: C.black, tub: C.black },
];

console.log("Wordmarks + lockups (outlined):");
for (const t of TREATMENTS) {
  const wm = wordmark(t.track, t.tub);
  write(`brand/logo/wordmark/tracktub-wordmark-${t.id}.svg`, framed(wm.width, wm.height, wm.inner));
  const h = lockupHorizontal(t.check, t.water, t.track, t.tub);
  write(`brand/logo/lockup/tracktub-horizontal-${t.id}.svg`, framed(h.width, h.height, h.inner));
  const s = lockupStacked(t.check, t.water, t.track, t.tub);
  write(`brand/logo/lockup/tracktub-stacked-${t.id}.svg`, framed(s.width, s.height, s.inner));
}

// keep dark + light + white lockup strings around for compositions/exports
const hDark = lockupHorizontal(C.white, C.blue, C.white, C.blue);
const hLight = lockupHorizontal(C.ink, C.blue, C.ink, C.blue);
const hBlack = lockupHorizontal(C.black, C.black, C.black, C.black);
const sDark = lockupStacked(C.white, C.blue, C.white, C.blue);

console.log("Logo package PNGs (transparent):");
await rasterize(framed(hDark.width, hDark.height, hDark.inner), { width: 1024 }, "brand/logo/export/tracktub-horizontal-color-dark-1024.png");
await rasterize(framed(hLight.width, hLight.height, hLight.inner), { width: 1024 }, "brand/logo/export/tracktub-horizontal-color-light-1024.png");
await rasterize(framed(hDark.width, hDark.height, hDark.inner), { width: 512 }, "brand/logo/export/tracktub-horizontal-color-dark-512.png");
await rasterize(framed(sDark.width, sDark.height, sDark.inner), { width: 1024 }, "brand/logo/export/tracktub-stacked-color-dark-1024.png");
const markDark = read("brand/logo/mark/tracktub-mark-color-dark.svg");
const markWhite = read("brand/logo/mark/tracktub-mark-white.svg");
await rasterize(markDark, { width: 512 }, "brand/logo/export/tracktub-mark-color-dark-512.png");
await rasterize(markWhite, { width: 512 }, "brand/logo/export/tracktub-mark-white-512.png");

console.log("Web + mobile icons:");
// favicon.svg → app icon.svg (Next serves it for the tab)
write("apps/web/src/app/icon.svg", faviconSvg);
await rasterize(appIconSvg, { width: 180, height: 180, flatten: { r: 8, g: 9, b: 10 } }, "apps/web/src/app/apple-icon.png");
await rasterize(appIconSvg, { width: 192, height: 192 }, "apps/web/public/icons/icon-192.png");
await rasterize(appIconSvg, { width: 512, height: 512 }, "apps/web/public/icons/icon-512.png");
await rasterize(maskableSvg, { width: 192, height: 192 }, "apps/web/public/icons/icon-maskable-192.png");
await rasterize(maskableSvg, { width: 512, height: 512 }, "apps/web/public/icons/icon-maskable-512.png");
await rasterize(monoSvg, { width: 512, height: 512 }, "apps/web/public/icons/icon-monochrome-512.png");

// favicon.ico (16/32/48 packed)
const tmp = path.join(__dirname, ".tmp");
fs.mkdirSync(tmp, { recursive: true });
const icoSizes = [16, 32, 48];
const icoFiles = [];
for (const s of icoSizes) {
  const f = path.join(tmp, `fav-${s}.png`);
  await sharp(Buffer.from(faviconSvg), { density: 320 }).resize(s, s).png().toFile(f);
  icoFiles.push(f);
}
const ico = await pngToIco(icoFiles);
fs.writeFileSync(path.join(WEB, "src/app/favicon.ico"), ico);
console.log("  ✓ apps/web/src/app/favicon.ico (16/32/48)");

console.log("Social / X:");
await rasterize(appIconSvg, { width: 400, height: 400 }, "brand/social/avatar-400.png");

// OG card 1200×630 and X header 1500×500 — composed from the outlined lockup + tagline
function card(W, H, lockup, tagline) {
  // fit the lockup to ~64% width, capped by height
  let lockScale = (W * 0.64) / lockup.width;
  const maxLockH = H * 0.3;
  if (lockup.height * lockScale > maxLockH) lockScale = maxLockH / lockup.height;
  const lw = lockup.width * lockScale;
  const lh = lockup.height * lockScale;

  const tag = textRun(tagline, C.lo, 30, -0.01);
  const tagS = Math.min(1.4, (W * 0.5) / tag.width);
  const tw = tag.width * tagS;
  const th = tag.height * tagS;

  const wl = read("brand/device/waterline.svg").match(/<path[^>]*\/>/)[0];
  const waveW = W * 0.26;
  const waveScale = waveW / 256;
  const waveH = 16 * waveScale;

  const gap1 = H * 0.08; // lockup → tagline
  const gap2 = H * 0.05; // tagline → wave
  const blockH = lh + gap1 + th + gap2 + waveH;
  const y = (H - blockH) / 2;

  return svg(
    W,
    H,
    `<rect width="${W}" height="${H}" fill="#08090A"/>` +
      `<rect width="${W}" height="${H}" fill="url(#g)"/>` +
      `<defs><radialGradient id="g" cx="50%" cy="0%" r="80%"><stop offset="0%" stop-color="#3B82F6" stop-opacity="0.10"/><stop offset="60%" stop-color="#3B82F6" stop-opacity="0"/></radialGradient></defs>` +
      `<g transform="translate(${((W - lw) / 2).toFixed(2)} ${y.toFixed(2)}) scale(${lockScale.toFixed(4)})">${lockup.inner}</g>` +
      `<g transform="translate(${((W - tw) / 2).toFixed(2)} ${(y + lh + gap1).toFixed(2)}) scale(${tagS.toFixed(4)})">${tag.inner}</g>` +
      `<g transform="translate(${((W - waveW) / 2).toFixed(2)} ${(y + lh + gap1 + th + gap2).toFixed(2)}) scale(${waveScale.toFixed(4)})">${wl}</g>`
  );
}
const TAG = "Guest-ready hot tub proof for every turnover.";
const og = card(1200, 630, hDark, TAG);
write("brand/social/og-card.svg", og);
await rasterize(og, { width: 1200, height: 630 }, "brand/social/og-card-1200x630.png");
// wire into the app via Next's file conventions (auto OG + Twitter meta)
await rasterize(og, { width: 1200, height: 630 }, "apps/web/src/app/opengraph-image.png");
await rasterize(og, { width: 1200, height: 630 }, "apps/web/src/app/twitter-image.png");
const xh = card(1500, 500, hDark, TAG);
write("brand/social/x-header.svg", xh);
await rasterize(xh, { width: 1500, height: 500 }, "brand/social/x-header-1500x500.png");

console.log("Print (300 DPI):");
// 8.5in-wide-ish artwork at 300dpi → ~2550px; lockup centered on white / black
await rasterize(framed(hLight.width, hLight.height, hLight.inner, 0.12), { width: 3000, flatten: { r: 255, g: 255, b: 255 } }, "brand/print/tracktub-horizontal-color-on-white-300dpi.png");
await rasterize(framed(hBlack.width, hBlack.height, hBlack.inner, 0.12), { width: 3000, flatten: { r: 255, g: 255, b: 255 } }, "brand/print/tracktub-horizontal-black-on-white-300dpi.png");
// vector masters for print live alongside as SVG
write("brand/print/tracktub-horizontal-color-light.svg", framed(hLight.width, hLight.height, hLight.inner, 0.12));
write("brand/print/tracktub-horizontal-black.svg", framed(hBlack.width, hBlack.height, hBlack.inner, 0.12));

// cleanup tmp
fs.rmSync(tmp, { recursive: true, force: true });
console.log("\nDone.");

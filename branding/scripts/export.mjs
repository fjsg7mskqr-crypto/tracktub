/* TrackTub brand export — generates the consolidated, Figma-ready `branding/`
   package (SVG + PNG for every asset) plus the app build icons.

   Self-contained: all geometry is defined here, so this script is the single
   source of truth. Run: `cd branding/scripts && npm install && npm run export`.

   Outputs:
     branding/logo/{mark,wordmark,lockup}/*.svg + *.png   (4 treatments each)
     branding/icon/{favicon,app-icon,app-icon-maskable,app-icon-monochrome}.svg + .png
     branding/icon/pwa/*.png  + branding/icon/favicon.ico
     branding/social/{og-card,x-header,avatar}.svg + .png
     branding/print/*.svg + *-300dpi.png
     branding/device/waterline.svg + .png
     branding/color/swatches.svg + .png
     branding/brand-board.svg + .png
     apps/web/src/app/{icon.svg,apple-icon.png,favicon.ico,opengraph-image.png,twitter-image.png}
     apps/web/public/icons/*.png
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const WEB = path.resolve(ROOT, "apps/web");

const C = {
  blue: "#3B82F6",
  white: "#EDEDEF",
  ink: "#08090A",
  pureWhite: "#FFFFFF",
  black: "#000000",
  lo: "#8A8F98",
  green: "#34D399",
};

/* ------------------------------- font / text ------------------------------ */
function findFont() {
  const dir = path.join(__dirname, ".fonts");
  const hit = fs.readdirSync(dir).find((f) => /semibold/i.test(f) && /\.(otf|ttf)$/i.test(f));
  if (!hit) throw new Error("No SemiBold Inter font in brand/scripts/.fonts");
  return path.join(dir, hit);
}
const font = opentype.loadSync(findFont());

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
  return { glyphs, positions, advance: x - tracking };
}
function slicePaths(glyphs, positions, fontSize, from, to) {
  let d = "";
  const bb = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  for (let i = from; i < to; i++) {
    const gp = glyphs[i].getPath(positions[i], 0, fontSize);
    const b = gp.getBoundingBox();
    bb.x1 = Math.min(bb.x1, b.x1); bb.y1 = Math.min(bb.y1, b.y1);
    bb.x2 = Math.max(bb.x2, b.x2); bb.y2 = Math.max(bb.y2, b.y2);
    d += gp.toPathData(3) + " ";
  }
  return { d: d.trim(), bb };
}
// "TrackTub" wordmark → {inner,width,height} at 0,0
function wordmark(trackColor, tubColor, fontSize = 100) {
  const { glyphs, positions } = layout("TrackTub", fontSize, -0.03);
  const track = slicePaths(glyphs, positions, fontSize, 0, 5);
  const tub = slicePaths(glyphs, positions, fontSize, 5, 8);
  const x1 = Math.min(track.bb.x1, tub.bb.x1), y1 = Math.min(track.bb.y1, tub.bb.y1);
  const x2 = Math.max(track.bb.x2, tub.bb.x2), y2 = Math.max(track.bb.y2, tub.bb.y2);
  const inner =
    `<g transform="translate(${(-x1).toFixed(3)} ${(-y1).toFixed(3)})">` +
    `<path d="${track.d}" fill="${trackColor}"/><path d="${tub.d}" fill="${tubColor}"/></g>`;
  return { inner, width: x2 - x1, height: y2 - y1 };
}
// single outlined text run → {inner,width,height} at 0,0
function textRun(text, color, fontSize = 100, trackingEm = -0.01) {
  const { glyphs, positions, advance } = layout(text, fontSize, trackingEm);
  const { d, bb } = slicePaths(glyphs, positions, fontSize, 0, glyphs.length);
  const inner =
    `<g transform="translate(${(-bb.x1).toFixed(3)} ${(-bb.y1).toFixed(3)})">` +
    `<path d="${d}" fill="${color}"/></g>`;
  return { inner, width: Math.max(advance, bb.x2 - bb.x1), height: bb.y2 - bb.y1 };
}
// place outlined text at (x,y) with cap-height h; returns {svg,w,h}
function label(text, x, y, h, color, trackingEm = -0.005) {
  const t = textRun(text, color, 100, trackingEm);
  const s = h / t.height;
  return { svg: `<g transform="translate(${x} ${y}) scale(${s.toFixed(4)})">${t.inner}</g>`, w: t.width * s, h };
}

/* ------------------------------- geometry --------------------------------- */
// full mark on the 64 grid (content ~x10..54, y16..48, centered)
// check rests ON the water surface (lifted above the wave — no piercing)
const markInner = (check, water) =>
  `<path d="M10 42 q5.5 -3.5 11 0 t11 0 t11 0 t11 0" stroke="${water}" stroke-width="2" fill="none"/>` +
  `<path d="M14 48 q5 -2.2 10 0 t10 0 t10 0 t10 0" stroke="${water}" stroke-width="1.2" fill="none" opacity="0.55"/>` +
  `<path d="M16 24 L26 34" stroke="${check}" stroke-width="5.5" stroke-linecap="square"/>` +
  `<path d="M26 34 L48 10" stroke="${check}" stroke-width="5.5" stroke-linecap="square"/>`;
const MARK = { l: 10, r: 54, t: 8, b: 52 };
// bold recut (one wave) for small sizes / tiles; check rests above the wave
const recutInner = (check, water) =>
  `<g transform="translate(-2 3.5)">` +
  `<path d="M10 44 q8 -5 16 0 t16 0 t16 0" stroke="${water}" stroke-width="4" fill="none"/>` +
  `<path d="M16 23 L27 34" stroke="${check}" stroke-width="8" stroke-linecap="square"/>` +
  `<path d="M27 34 L50 8" stroke="${check}" stroke-width="8" stroke-linecap="square"/></g>`;
const waterlinePath = (color) =>
  `<path d="M0 8 q8 -4 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0" stroke="${color}" stroke-width="1.6" fill="none"/>`;

/* ------------------------------- svg + io --------------------------------- */
const svg = (w, h, body, title = "TrackTub", vb) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${(+w).toFixed(2)}" height="${(+h).toFixed(2)}" viewBox="${vb || `0 0 ${(+w).toFixed(2)} ${(+h).toFixed(2)}`}" fill="none" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>\n`;
const framed = (w, h, body, title, padFrac = 0.08) => {
  const pad = h * padFrac, W = w + pad * 2, H = h + pad * 2;
  return svg(W, H, body, title, `${(-pad).toFixed(2)} ${(-pad).toFixed(2)} ${W.toFixed(2)} ${H.toFixed(2)}`);
};
function write(rel, content) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, content);
}
async function rasterize(svgStr, { width, height, flatten = null }, rel) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  let img = sharp(Buffer.from(svgStr), { density: 320 }).resize(width, height, {
    fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (flatten) img = img.flatten({ background: flatten });
  await img.png().toFile(out);
}
// emit an SVG + matching PNG into branding/
let count = 0;
async function emit(relNoExt, svgStr, png = {}) {
  write(`branding/${relNoExt}.svg`, svgStr);
  await rasterize(svgStr, png, `branding/${relNoExt}.png`);
  count += 2;
  console.log("  ✓", relNoExt, "(svg+png)");
}

/* ================================== RUN ==================================== */
const TREATMENTS = [
  { id: "color-dark", check: C.white, water: C.blue, track: C.white, tub: C.blue, onDark: true },
  { id: "color-light", check: C.ink, water: C.blue, track: C.ink, tub: C.blue, onDark: false },
  { id: "white", check: C.pureWhite, water: C.pureWhite, track: C.pureWhite, tub: C.pureWhite, onDark: true },
  { id: "black", check: C.black, water: C.black, track: C.black, tub: C.black, onDark: false },
];

// lockups
function lockH(check, water, trackC, tubC) {
  const wm = wordmark(trackC, tubC);
  const vMark = wm.height * 1.45, s = vMark / (MARK.b - MARK.t);
  const markW = (MARK.r - MARK.l) * s, gap = wm.height * 0.55;
  const H = vMark, W = markW + gap + wm.width;
  const boxLeft = -MARK.l * s, boxTop = H / 2 - ((MARK.t + MARK.b) / 2) * s;
  return { width: W, height: H, inner:
    `<g transform="translate(${boxLeft.toFixed(3)} ${boxTop.toFixed(3)}) scale(${s.toFixed(4)})">${markInner(check, water)}</g>` +
    `<g transform="translate(${markW.toFixed(3)} ${((H - wm.height) / 2).toFixed(3)})">${wm.inner}</g>` };
}
function lockS(check, water, trackC, tubC) {
  const wm = wordmark(trackC, tubC);
  const vMark = wm.height * 1.7, s = vMark / (MARK.b - MARK.t);
  const markW = (MARK.r - MARK.l) * s, gap = wm.height * 0.55;
  const W = Math.max(markW, wm.width), H = vMark + gap + wm.height;
  return { width: W, height: H, inner:
    `<g transform="translate(${(W / 2 - ((MARK.l + MARK.r) / 2) * s).toFixed(3)} ${(-MARK.t * s).toFixed(3)}) scale(${s.toFixed(4)})">${markInner(check, water)}</g>` +
    `<g transform="translate(${((W - wm.width) / 2).toFixed(3)} ${(vMark + gap).toFixed(3)})">${wm.inner}</g>` };
}

console.log("branding/logo (mark · wordmark · lockup):");
for (const t of TREATMENTS) {
  await emit(`logo/mark/tracktub-mark-${t.id}`, svg(64, 64, markInner(t.check, t.water), `TrackTub mark — ${t.id}`), { width: 512 });
  const wm = wordmark(t.track, t.tub);
  await emit(`logo/wordmark/tracktub-wordmark-${t.id}`, framed(wm.width, wm.height, wm.inner, `TrackTub wordmark — ${t.id}`), { width: 1024 });
  const h = lockH(t.check, t.water, t.track, t.tub);
  await emit(`logo/lockup/tracktub-horizontal-${t.id}`, framed(h.width, h.height, h.inner, `TrackTub horizontal lockup — ${t.id}`), { width: 1600 });
  const s = lockS(t.check, t.water, t.track, t.tub);
  await emit(`logo/lockup/tracktub-stacked-${t.id}`, framed(s.width, s.height, s.inner, `TrackTub stacked lockup — ${t.id}`), { width: 1024 });
}

console.log("branding/icon:");
const favicon = `<rect width="64" height="64" rx="14" fill="#08090A"/><g transform="translate(32 32) scale(0.8) translate(-32 -32)">${recutInner(C.white, C.blue)}</g>`;
const appIcon = favicon;
const maskable = `<rect width="64" height="64" fill="#08090A"/><g transform="translate(32 32) scale(0.62) translate(-32 -32)">${recutInner(C.white, C.blue)}</g>`;
const monochrome = `<g transform="translate(32 32) scale(0.62) translate(-32 -32)">${recutInner(C.pureWhite, C.pureWhite)}</g>`;
await emit("icon/favicon", svg(64, 64, favicon, "TrackTub favicon"), { width: 256 });
await emit("icon/app-icon", svg(512, 512, appIcon, "TrackTub app icon", "0 0 64 64"), { width: 512 });
await emit("icon/app-icon-maskable", svg(512, 512, maskable, "TrackTub app icon (maskable)", "0 0 64 64"), { width: 512 });
await emit("icon/app-icon-monochrome", svg(512, 512, monochrome, "TrackTub app icon (monochrome)", "0 0 64 64"), { width: 512 });

console.log("branding/social:");
const hDark = lockH(C.white, C.blue, C.white, C.blue);
const hLight = lockH(C.ink, C.blue, C.ink, C.blue);
const hBlack = lockH(C.black, C.black, C.black, C.black);
function card(W, H, lockup, tagline) {
  let ls = (W * 0.64) / lockup.width;
  if (lockup.height * ls > H * 0.3) ls = (H * 0.3) / lockup.height;
  const lw = lockup.width * ls, lh = lockup.height * ls;
  const tag = textRun(tagline, C.lo, 30, -0.01);
  const ts = Math.min(1.4, (W * 0.5) / tag.width), tw = tag.width * ts, th = tag.height * ts;
  const waveW = W * 0.26, ws = waveW / 256, wh = 16 * ws;
  const g1 = H * 0.08, g2 = H * 0.05, block = lh + g1 + th + g2 + wh, y = (H - block) / 2;
  return svg(W, H,
    `<rect width="${W}" height="${H}" fill="#08090A"/><rect width="${W}" height="${H}" fill="url(#g)"/>` +
    `<defs><radialGradient id="g" cx="50%" cy="0%" r="80%"><stop offset="0%" stop-color="#3B82F6" stop-opacity="0.10"/><stop offset="60%" stop-color="#3B82F6" stop-opacity="0"/></radialGradient></defs>` +
    `<g transform="translate(${((W - lw) / 2).toFixed(2)} ${y.toFixed(2)}) scale(${ls.toFixed(4)})">${lockup.inner}</g>` +
    `<g transform="translate(${((W - tw) / 2).toFixed(2)} ${(y + lh + g1).toFixed(2)}) scale(${ts.toFixed(4)})">${tag.inner}</g>` +
    `<g transform="translate(${((W - waveW) / 2).toFixed(2)} ${(y + lh + g1 + th + g2).toFixed(2)}) scale(${ws.toFixed(4)})">${waterlinePath(C.blue)}</g>`,
    "TrackTub");
}
const TAG = "Guest-ready hot tub proof for every turnover.";
const og = card(1200, 630, hDark, TAG);
const xh = card(1500, 500, hDark, TAG);
await emit("social/og-card", og, { width: 1200, height: 630 });
await emit("social/x-header", xh, { width: 1500, height: 500 });
await emit("social/avatar", svg(512, 512, appIcon, "TrackTub avatar", "0 0 64 64"), { width: 512 });

console.log("branding/print + device:");
await emit("print/tracktub-horizontal-color", framed(hLight.width, hLight.height, hLight.inner, "TrackTub print — color", 0.12), { width: 3000, flatten: { r: 255, g: 255, b: 255 } });
await emit("print/tracktub-horizontal-black", framed(hBlack.width, hBlack.height, hBlack.inner, "TrackTub print — black", 0.12), { width: 3000, flatten: { r: 255, g: 255, b: 255 } });
await emit("device/waterline", svg(256, 16, waterlinePath(C.blue), "TrackTub waterline device"), { width: 1024 });

/* ---- color swatches ---- */
{
  const SW = [
    ["Brand · water", "#3B82F6"], ["Verified", "#34D399"], ["Ink", "#08090A"],
    ["Paper", "#FFFFFF"], ["Lo text", "#8A8F98"],
  ];
  const cw = 240, ch = 150, gap = 20, pad = 40;
  const W = pad * 2 + SW.length * cw + (SW.length - 1) * gap, H = pad * 2 + ch + 64;
  let body = `<rect width="${W}" height="${H}" fill="#0E0F11"/>`;
  SW.forEach(([name, hex], i) => {
    const x = pad + i * (cw + gap);
    const border = hex === "#08090A" ? ' stroke="rgba(255,255,255,.14)"' : "";
    body += `<rect x="${x}" y="${pad}" width="${cw}" height="${ch}" rx="10" fill="${hex}"${border}/>`;
    const n = label(name, x, pad + ch + 22, 15, C.white);
    const v = label(hex.toUpperCase(), x, pad + ch + 44, 13, C.lo, 0.02);
    body += n.svg + v.svg;
  });
  await emit("color/swatches", svg(W, H, body, "TrackTub color"), { width: 1400 });
}

/* ----------------------------- brand board -------------------------------- */
console.log("branding/brand-board:");
{
  const W = 1600, P = 72, CW = W - 2 * P;
  let y = P, b = "";
  const sec = (t) => { b += label(t, P, y, 13, C.lo, 0.14).svg; y += 32; };

  // header lockup
  const ls = 66 / hDark.height;
  b += `<g transform="translate(${P} ${y}) scale(${ls.toFixed(4)})">${hDark.inner}</g>`;
  y += hDark.height * ls + 30;
  const ws = CW / 256;
  b += `<g transform="translate(${P} ${y}) scale(${ws.toFixed(4)})">${waterlinePath(C.blue)}</g>`;
  y += 16 * ws + 46;

  // the mark — 4 treatments on context tiles
  sec("THE MARK");
  const tile = 150, tgap = 22, ms = tile / 64;
  [[C.white, C.blue, "#131417"], [C.ink, C.blue, "#FFFFFF"], [C.pureWhite, C.pureWhite, "#131417"], [C.black, C.black, "#FFFFFF"]]
    .forEach(([ck, w, bg], i) => {
      const x = P + i * (tile + tgap);
      b += `<rect x="${x}" y="${y}" width="${tile}" height="${tile}" rx="16" fill="${bg}" stroke="rgba(255,255,255,.10)"/>`;
      b += `<g transform="translate(${x} ${y}) scale(${ms.toFixed(4)})">${markInner(ck, w)}</g>`;
    });
  y += tile + 48;

  // wordmark
  sec("WORDMARK");
  const wm = wordmark(C.white, C.blue);
  const wms = 50 / wm.height;
  b += `<g transform="translate(${P} ${y}) scale(${wms.toFixed(4)})">${wm.inner}</g>`;
  y += wm.height * wms + 48;

  // color
  sec("COLOR");
  const SW = [["Brand · water", "#3B82F6"], ["Verified", "#34D399"], ["Ink", "#08090A"], ["Paper", "#FFFFFF"], ["Lo text", "#8A8F98"]];
  const sw = 210, sgap = 18, sh = 92;
  SW.forEach(([name, hex], i) => {
    const x = P + i * (sw + sgap);
    const st = hex === "#08090A" || hex === "#FFFFFF" ? ' stroke="rgba(255,255,255,.14)"' : "";
    b += `<rect x="${x}" y="${y}" width="${sw}" height="${sh}" rx="10" fill="${hex}"${st}/>`;
    b += label(name, x, y + sh + 20, 14, C.white).svg;
    b += label(hex.toUpperCase(), x, y + sh + 42, 12, C.lo, 0.02).svg;
  });
  y += sh + 64 + 48;

  // type
  sec("TYPE");
  b += label("TrackTub 0123", P, y, 50, C.white, -0.03).svg;
  y += 50 + 18;
  b += label("Inter SemiBold — display & UI    ·    JetBrains Mono — proof metadata", P, y, 14, C.lo).svg;
  y += 14 + 44;

  // footer waterline
  b += `<g transform="translate(${P} ${y}) scale(${ws.toFixed(4)})">${waterlinePath(C.blue)}</g>`;
  y += 16 * ws + P;

  const board = svg(W, y, `<rect width="${W}" height="${y}" fill="#08090A"/>` + b, "TrackTub brand board");
  await emit("brand-board", board, { width: 2000 });
}

/* ----------------------------- app build icons ----------------------------- */
console.log("apps/web build icons:");
write("apps/web/src/app/icon.svg", svg(64, 64, favicon, "TrackTub favicon"));
await rasterize(svg(512, 512, appIcon, "icon", "0 0 64 64"), { width: 180, height: 180, flatten: { r: 8, g: 9, b: 10 } }, "apps/web/src/app/apple-icon.png");
await rasterize(svg(512, 512, appIcon, "icon", "0 0 64 64"), { width: 192, height: 192 }, "apps/web/public/icons/icon-192.png");
await rasterize(svg(512, 512, appIcon, "icon", "0 0 64 64"), { width: 512, height: 512 }, "apps/web/public/icons/icon-512.png");
await rasterize(svg(512, 512, maskable, "icon", "0 0 64 64"), { width: 192, height: 192 }, "apps/web/public/icons/icon-maskable-192.png");
await rasterize(svg(512, 512, maskable, "icon", "0 0 64 64"), { width: 512, height: 512 }, "apps/web/public/icons/icon-maskable-512.png");
await rasterize(svg(512, 512, monochrome, "icon", "0 0 64 64"), { width: 512, height: 512 }, "apps/web/public/icons/icon-monochrome-512.png");
await rasterize(og, { width: 1200, height: 630 }, "apps/web/src/app/opengraph-image.png");
await rasterize(og, { width: 1200, height: 630 }, "apps/web/src/app/twitter-image.png");
const tmp = path.join(__dirname, ".tmp");
fs.mkdirSync(tmp, { recursive: true });
const icoFiles = [];
for (const s of [16, 32, 48]) {
  const f = path.join(tmp, `f-${s}.png`);
  await sharp(Buffer.from(svg(64, 64, favicon, "f")), { density: 320 }).resize(s, s).png().toFile(f);
  icoFiles.push(f);
}
fs.writeFileSync(path.join(WEB, "src/app/favicon.ico"), await pngToIco(icoFiles));
// also drop PWA pngs + ico into branding/icon for completeness
for (const f of ["icon-192", "icon-512", "icon-maskable-192", "icon-maskable-512", "icon-monochrome-512"]) {
  fs.copyFileSync(path.join(WEB, "public/icons", `${f}.png`), (() => { const p = path.join(ROOT, "branding/icon/pwa", `${f}.png`); fs.mkdirSync(path.dirname(p), { recursive: true }); return p; })());
}
fs.copyFileSync(path.join(WEB, "src/app/favicon.ico"), path.join(ROOT, "branding/icon/favicon.ico"));
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`\nDone. ${count} files in branding/ (svg+png pairs) + app build icons.`);

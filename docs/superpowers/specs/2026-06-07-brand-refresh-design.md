# TrackTub brand refresh — design spec

> 2026-06-07. Full logo package + brand/marketing assets, built around a new
> hot-tub-aware mark. Supersedes the "never water/aqua" rule in the old
> `brand/brand-notes.md` (founder-directed). Surfaces to perfect:
> **mobile · design · web · print · X · marketing.**

## 1. Identity (locked with founder via visual brainstorm)

- **Mark** — white two-tone **check** (square caps) over **trust-blue `#3B82F6`
  wavy water** (medium wave + a fainter back ripple). One mark everywhere.
  A **bold favicon recut** (single strong wave, thick check) covers ≤32px.
- **Wordmark** — Inter 600, tight tracking (−0.03em). "Track" in ink/white +
  **"Tub" in blue `#3B82F6`**.
- **Lockups** — horizontal (mark + wordmark) and stacked (mark over wordmark).
- **Color system** — **blue `#3B82F6` = brand/water**; **green `#34D399` =
  verified/success ONLY** (freed from the logo); ink/white = record + text;
  `#E8A33D` pending, `#EF4444` urgent retained.
- **Type** — Inter (display/UI) + JetBrains Mono (proof metadata). Unchanged.

### Canonical geometry (viewBox `0 0 64 64`)
- Water front wave: `M10 40 q5.5 -3.5 11 0 t11 0 t11 0 t11 0` — stroke 2.0
- Water back ripple: `M14 46 q5 -2.2 10 0 t10 0 t10 0 t10 0` — stroke 1.2, opacity .55
- Check short arm: `M16 30 L26 40` — stroke 5.5, `square` cap
- Check long arm:  `M26 40 L48 16` — stroke 5.5, `square` cap
- **Favicon recut:** wave `M9 42 q8 -5.5 16 0 t16 0 t16 0` (stroke 4); check
  `M15 29 L27 41` + `M27 41 L50 14` (stroke 8).

### Color treatments
| Treatment | Check | Water |
|---|---|---|
| Full-color on dark | `#EDEDEF` | `#3B82F6` |
| Full-color on light | `#08090A` | `#3B82F6` |
| White knockout (dark/photo) | `#FFFFFF` | `#FFFFFF` |
| Black one-color (print/light) | `#000000` | `#000000` |

Print CMYK: ink `0/0/0/96`, trust-blue ≈ `76/52/0/4`, verified-green ≈ `66/0/45/0`.

## 2. Deliverables

### Logo package — `brand/logo/`
`mark/` `wordmark/` `lockup/` `favicon/` `app-icon/` `export/` + `README.md`.
Each of mark / wordmark / horizontal / stacked in **color-dark, color-light,
white, black**. Wordmark + lockups shipped **outlined to paths** (no font
dependency) via the export script. Favicon recut SVG. Clear-space + misuse note
in README, with HEX/RGB/CMYK, min sizes, don'ts.

### Other brand assets — `brand/`
- `tokens.css` rewritten: `--tt-brand` (blue) + dim/line, keep `--tt-verified`
  (green) verified-only, plus pending/urgent. Dark + light.
- `brand/device/waterline.svg` — the wave as a reusable divider/section device.
- Social avatar tile, default OG/share card (see Social).
- `brand-notes.md` rewritten to the new direction (records the rule change).

### Rasters (generated, committed) — `brand/scripts/export.mjs`
Dev tooling in `brand/scripts/` (own `package.json`, `node_modules` gitignored;
`sharp` + `opentype.js`). Outputs:
- **Web/mobile:** `favicon.ico` (16/32/48), `apple-icon.png` 180, PWA
  `icon-192/512`, `icon-maskable-192/512`, `icon-monochrome-512` → `apps/web/public/icons/`
  and `apps/web/src/app/`.
- **Social/X:** avatar 400², OG/Twitter card 1200×630, X header 1500×500.
- **Print:** 300-DPI PNG of primary lockup + mono black/white; SVG is the vector
  master (PDF too if a converter is available).
- **Logo package PNGs:** each lockup at 512 / 1024 (transparent).
- **Outlined wordmark** paths injected into the wordmark/lockup SVGs.

### App re-icon — `apps/web/`
- `src/app/icon.svg` → new favicon recut; `manifest.ts` → icons array + keep
  `#08090A` bg/theme; commit PWA PNGs to `public/icons/`; `apple-icon.png`.
- `globals.css`: add `--brand` (blue) + repoint legacy `--brand` from green→blue,
  keep `--verified` green; recolor the green `body::before` glow → faint blue.
- `Shell.tsx` topbar mark + wordmark → new mark + "Track"+blue "Tub".
- `Seal.tsx` / `Icon.tsx` reviewed for hardcoded brand color.

### Landing refresh — `apps/web/src/app/landing/page.tsx`
Styled **draft** (not deployed). Copy from `docs/validation/positioning.md`
(one-liner + 3 hooks). Code/SVG visuals only (no blocked AI imagery): hero with
the waterline device + a coded proof mockup; problem→proof; "how verification
works"; **waitlist CTA** = front-end-only form (localStorage + success state,
`TODO` for real capture). Responsive / mobile-first.

## 3. Build order
master SVGs → `brand/scripts` deps + `export.mjs` (rasters + outlined wordmark)
→ `tokens.css` → app re-icon (icon/manifest/public/Shell/globals) → landing
→ docs (`brand-notes.md`, logo `README.md`) → memory (`design-direction`).

## 4. Quality gate / process
`cd apps/web && npm run lint && npm run typecheck && npm run build` green.
Feature branch (this worktree) → PR to `main` → self-merge (CLAUDE.md). Brand
tooling deps stay in `brand/scripts` so CI/app stay lean.

## 5. Out of scope (deferred)
Sales deck, one-pager, sample-proof artifact, email signature, full social
banner kit beyond X, AI hero imagery, full demo re-skin, real waitlist backend.

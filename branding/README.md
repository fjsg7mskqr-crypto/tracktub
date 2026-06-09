# TrackTub — branding

The one place for TrackTub's brand assets. **Every asset ships as both SVG and
PNG.** The mark is a **verified check** (the record) sitting on a **hot-tub
waterline** (the tub) — white/ink check + one blue accent. Sharp, square-capped,
flat. It reads as *proof about a tub*, never a spa.

Start with **`brand-board.svg`** for the one-sheet overview.

## Regenerating

Everything here is generated from a single script — nothing is hand-edited in
this folder. To change the system, edit `../brand/scripts/export.mjs` and run:

```sh
cd ../brand/scripts && npm install && npm run export
```

That rewrites this `branding/` package **and** the app's build icons in
`apps/web`. Brand tokens (CSS variables) live in `../brand/tokens.css`; the full
written spec is `../brand/brand-notes.md`.

## File map

```
branding/
  brand-board.svg / .png         one-sheet overview (drop into Figma first)
  logo/
    mark/        tracktub-mark-{color-dark,color-light,white,black}.svg + .png
    wordmark/    tracktub-wordmark-{…}.svg + .png        (outlined to paths)
    lockup/      tracktub-horizontal-{…}.svg + .png
                 tracktub-stacked-{…}.svg + .png
  icon/
    favicon.svg/.png   app-icon.svg/.png
    app-icon-maskable.svg/.png   app-icon-monochrome.svg/.png
    favicon.ico        pwa/icon-{192,512,maskable-192,maskable-512,monochrome-512}.png
  social/        og-card.svg/.png   x-header.svg/.png   avatar.svg/.png
  print/         tracktub-horizontal-{color,black}.svg + -300dpi .png
  device/        waterline.svg/.png                     (reusable wave)
  color/         swatches.svg/.png
```

## Working in Figma

- **Import the SVGs.** Drag any `.svg` (or `brand-board.svg`) onto a Figma
  canvas — it lands as fully editable vector. Each file carries a `<title>`, so
  it names its layer/frame on import.
- **The mark uses strokes** (the check + waves), so in Figma you can adjust
  stroke weight live. The **wordmark is outlined to paths** — it renders
  identically with no font installed.
- **PNGs** are for places that don't take SVG (raster mockups, slide tools,
  email, app stores). Transparent where it makes sense; print PNGs are on white
  at 300 DPI.
- Match type with **Inter** (display/UI) and **JetBrains Mono** (proof metadata).

## Treatments — when to use which

| Variant | Use on |
|---|---|
| `color-dark` | dark UI / dark backgrounds (the default — TrackTub is dark-first) |
| `color-light` | white / light backgrounds (ink check, blue water) |
| `white` | photos, busy or colored backgrounds (one-color knockout) |
| `black` | single-ink print, stamps, engraving |

Favicon / app-icon are self-contained dark tiles (read on any background) and use
the **bold recut** (one strong wave + thicker check) so they stay legible below ~24px.

## Color

| Role | HEX | RGB | CMYK (approx) |
|---|---|---|---|
| Brand · water (blue) | `#3B82F6` | 59, 130, 246 | 76 / 52 / 0 / 4 |
| Verified · success (green) | `#34D399` | 52, 211, 153 | 66 / 0 / 45 / 0 |
| Ink | `#08090A` | 8, 9, 10 | 0 / 0 / 0 / 96 |
| Paper / white | `#FFFFFF` | 255, 255, 255 | 0 / 0 / 0 / 0 |
| Check on dark | `#EDEDEF` | 237, 237, 239 | — |

**Rule:** blue is the brand (the water); **green is reserved for
verified/success only** — never decoration. The logo check is ink/white, not
green, so green keeps its meaning in-product.

## Type

- **Inter** — display + UI. Headings tracked tight (−0.02 to −0.035em).
- **JetBrains Mono** — proof metadata (timestamps, IDs, the `✓ VERIFIED` tag).

## Construction

- **Clear space:** ≥ the height of the check's short arm on all sides (~25% of
  the mark height). The SVG lockups already include this.
- **Minimum size:** mark/favicon 16px · horizontal lockup 96px wide · stacked 40px tall.

## Don'ts

- Don't recolor outside the palette, or swap blue for teal/cyan/aqua (the spa/pool look this brand avoids).
- Don't make the check green — green means *verified*, not *brand*.
- Don't add gradients, shadows, gloss, or "liquid" 3D to the water.
- Don't round the square caps, rotate, stretch, or rearrange mark + wordmark.
- Don't re-typeset the wordmark in another font — use the outlined files.

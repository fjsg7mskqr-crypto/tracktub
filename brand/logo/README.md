# TrackTub — logo package

The mark is a **verified check** (the record) sitting on a **hot-tub waterline**
(the tub). White/ink check + one blue accent. Sharp, square-capped, flat — it
reads as *proof about a tub*, not a spa.

> All SVGs are the source of truth. PNG/ICO are generated from them by
> `brand/scripts/export.mjs` (`cd brand/scripts && npm install && npm run export`).
> Re-run that script after editing any master SVG.

## File map

```
brand/logo/
  mark/        tracktub-mark-{color-dark,color-light,white,black}.svg   ← symbol only
  wordmark/    tracktub-wordmark-{color-dark,color-light,white,black}.svg ← "TrackTub", outlined
  lockup/      tracktub-horizontal-{…}.svg   tracktub-stacked-{…}.svg     ← mark + wordmark
  favicon/     tracktub-favicon.svg          ← dark tile + bold recut (any tab color)
  app-icon/    app-icon.svg  app-icon-maskable.svg  app-icon-monochrome.svg
  export/      *.png          ← 512/1024 transparent PNGs for slides / Canva / email
brand/device/  waterline.svg  ← the wave as a reusable divider/footer device
brand/social/  avatar-400.png  og-card.(svg|png)  x-header.(svg|png)
brand/print/   *-300dpi.png + *.svg (vector masters for print)
```

Wordmarks and lockups are shipped **outlined to paths** (no font dependency) so
they render identically everywhere. The app header (`Shell.tsx`) uses live
Inter from `next/font` — that's intentional.

## Treatments (when to use which)

| Variant | Use on |
|---|---|
| `color-dark` | dark UI / dark backgrounds (the default — TrackTub is dark-first) |
| `color-light` | white / light backgrounds (ink check, blue water) |
| `white` | photos, busy or colored backgrounds (one-color knockout) |
| `black` | single-ink print, faxes, engraving, stamps |

The **favicon** and **app-icon** are self-contained dark tiles, so they read on
any background. The favicon/app-icon use the **bold recut** (one strong wave +
thicker check) because the full mark's fine ripples disappear below ~24px.

## Color

| Role | HEX | RGB | CMYK (approx) |
|---|---|---|---|
| Brand / water (blue) | `#3B82F6` | 59, 130, 246 | 76 / 52 / 0 / 4 |
| Verified / success (green) | `#34D399` | 52, 211, 153 | 66 / 0 / 45 / 0 |
| Ink | `#08090A` | 8, 9, 10 | 0 / 0 / 0 / 96 |
| Paper / white | `#FFFFFF` | 255, 255, 255 | 0 / 0 / 0 / 0 |
| Check on dark | `#EDEDEF` | 237, 237, 239 | — |

**Rule:** blue is the brand (the water). **Green is reserved for
verified/success states only** — never decoration. In the logo the check is
ink/white, not green, so green keeps its meaning in-product.

## Construction & usage

- **Clear space:** keep free space ≥ the height of the check's short arm on all
  sides (≈ 25% of the mark height).
- **Minimum size:** mark/favicon 16px; horizontal lockup 96px wide; stacked
  lockup 40px tall.
- **Backgrounds:** `color-*` on solid surfaces; `white` knockout on photos or
  color; never place the full color mark on a busy photo.

## Don'ts

- Don't recolor outside the palette, or swap blue for teal/cyan/aqua (that's the
  spa/pool look this brand avoids).
- Don't make the check green — green means *verified*, not *brand*.
- Don't add gradients, shadows, gloss, or "liquid" 3D to the water.
- Don't round the square caps, rotate, stretch, or rearrange mark + wordmark.
- Don't re-typeset the wordmark in another font — use the outlined files.

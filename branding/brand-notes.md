# TrackTub — Brand Notes

Single source of truth for TrackTub's visual identity. Dev consumes tokens + SVGs from this `brand/` dir. Mirrors the structure of a working brand spec — palette, type, logo, voice.

> **Status:** updated 2026-06-07. Direction: **minimal & sharp** (Linear/Vercel register), dark-first — now with a **hot-tub identity** carried by the mark and a **blue "water" brand color**. The mark is a verified check on a waterline; the wordmark sets "Tub" in blue. See `branding/README.md` for the full package + usage rules.
>
> **Change note:** earlier notes said "never aqua/water." That is superseded. We now embrace the hot tub as **subject matter** — a measured vessel of water, drawn sharp and technical — while still avoiding the **spa/wellness/relaxation mood**. Subject: yes. Candlelit-spa vibe: no.

## Identity at a glance

- **Name:** TrackTub (kept through PMF; platform rename is a post-PMF question per PRD §6).
- **What it is:** the **dispute-grade evidence layer** for short-term-rental hot-tub turnovers. B2B SaaS.
- **One-liner:** *Guest-ready hot tub proof for every turnover.*
- **Tone:** technical, credible, calm-confident. A trustworthy field/record tool. The hot tub is the *thing we measure*, not a relaxation experience we sell.
- **Register:** minimal & sharp. Dark-first. Near-monochrome + a blue accent (the water) + a reserved green (verified). Square caps, flat geometry, fine borders, monospace metadata. The look says "proof / verified / on the record."

## Color palette

Dark-first (the product presents dark, like Linear). Light mode is fully supported. Tokens: `brand/tokens.css`.

### The two-color system
- **Blue `#3B82F6` — brand / the hot-tub water.** Logo water, brand accents, links, primary UI accents.
- **Green `#34D399` — verified / success ONLY.** The `✓ VERIFIED` tag, success states. Never decoration. Freeing the logo of green is what keeps a green "VERIFIED" meaningful.

### Dark (primary)
| Role | Hex | Use |
|---|---|---|
| Black | `#08090A` | App background |
| Surface | `#131417` | Cards, panels |
| Surface 2 | `#191B20` | Raised elements |
| Border | `rgba(255,255,255,.09)` | Hairline dividers |
| Hi text | `#EDEDEF` | Primary text + the check on dark |
| Lo text | `#8A8F98` | Secondary text, mono metadata |
| **Brand (water)** | `#3B82F6` | Blue — the brand accent / the tub |
| **Verified** | `#34D399` | Green — verified/success only |

### Light
| Role | Hex |
|---|---|
| Background | `#FFFFFF` |
| Surface | `#F6F7F8` |
| Hi text / check | `#08090A` |
| Lo text | `#5A5F6A` |
| Border | `rgba(8,9,10,.10)` |
| Brand (water), accessible | `#2563EB` |
| Verified text, accessible | `#0A7A55` |

### Semantic
| State | Hex | Meaning |
|---|---|---|
| Verified | `#34D399` | Turnover confirmed / proof valid |
| Pending / cloudy | `#E8A33D` | Awaiting submission; water-clarity flag (§8.8) |
| Urgent | `#EF4444` | Urgent flag, failed geofence |

**Do not** add teal/cyan/aqua as a second blue, or use green as decoration. Blue = water/brand; green = verified.

## Typography

- **Display + UI:** **Inter** (400/500/600/700), tight tracking on headings (−0.02 to −0.035em).
- **Proof metadata:** **JetBrains Mono** (400/500) — timestamps, IDs, geofence, and the signature `✓ VERIFIED` tag. The mono is the "machine record" tell.
- Production wordmark = Inter 600 **outlined to paths** (shipped in `branding/logo/wordmark/`; the app header uses live `next/font`).

## Logo & mark

Files in `branding/` (see `branding/README.md`).

- **Primary mark:** a **verified check on a waterline** — white/ink check (the record) over a trust-blue `#3B82F6` wavy water (the tub). Square caps, two-tone by role (check vs water), no green.
- **Favicon / app-icon recut:** one bold wave + a thicker check, because the fine ripples wash out below ~24px. Self-contained dark tile so it reads on any background.
- **Wordmark:** `TrackTub`, Inter 600 — "Track" in ink/white, **"Tub" in blue**.
- **Lockups:** horizontal (mark + wordmark) and stacked (mark over wordmark), four treatments each.
- **Reusable device:** the waterline wave (`branding/device/waterline.svg`) for dividers, footers, section breaks.
- **Clear space:** ≥ the height of the check's short arm on all sides. **Min size:** mark 16px; horizontal wordmark 96px wide.
- **Don't:** recolor outside the palette, make the check green, add gradients/shadows/gloss, round the caps, or place the full-color mark on a busy photo.

### The "Verified" pattern (signature device)
A monospace tag — `✓ VERIFIED` in **green** on a dim green fill — plus a metadata line (`2026-06-07 14:22 UTC · submitter ✓ · geofence ✓`). The brand's most reusable element: cockpit, proof link, and (fast-follow) the signed PDF + badge. It carries the SaaS look and the proof differentiator at once — and it's the one place green belongs.

## Voice

- Proof over hype: *"Show the tub was ready"* beats *"premium peace of mind."*
- Plain and technical. Operators and cleaners, not spa guests.
- Let the record speak — timestamps, names, status. Credibility comes from specifics.

## Imagery

- **Subject, not spa.** Reference the hot tub as the measured object: clean, controlled, mid-turnover scenes; top-down or sectioned views; the waterline device. Avoid candlelit-spa, steam-and-wine, wellness-glow imagery.
- **Hero / marketing imagery:** Nano Banana Pro (`nano-banana --model pro`) when available. Until then, coded/SVG visuals and real product UI are preferred (and more credible for a proof product).
- **Ethics (hard rule):** never present AI-generated tub photos as *real customer proof*. The brand promise is human-confirmed proof; illustrative imagery must be clearly illustrative and swapped for real pilot photos ASAP.

## Production approach

| Asset class | Tool | Owner |
|---|---|---|
| Logo, mark, wordmark, lockups, icons | Hand-authored **SVG** + `brand/scripts/export.mjs` | Claude |
| Wordmark/lockup outlining + all rasters (PNG/ICO) | `brand/scripts/export.mjs` (sharp + opentype.js) | Claude |
| Color + type tokens | **Code** (`brand/tokens.css`, app `globals.css`) | Claude |
| App / PWA UI | **Code** | Claude + app agents |
| OG / social / X cards | Generated SVG → PNG (`branding/social/`) | Claude |
| Hero / marketing imagery | **Nano Banana Pro** | Claude (needs key) |
| Social posts, one-pagers, slides | **Canva** (import the SVG/PNG, never Canva stock) | Founder |

## Still open

- **Light vs dark default for the public proof link** (light reads document-credible to a daytime owner; honor `prefers-color-scheme`).
- **Name "TrackTub"** — revisit at PMF before trademark-bearing assets proliferate.
- **Gemini key** for Nano Banana hero imagery (gates marketing renders only).

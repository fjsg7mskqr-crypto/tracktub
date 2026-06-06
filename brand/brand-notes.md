# TrackTub — Brand Notes

Single source of truth for TrackTub's visual identity. Dev consumes tokens + SVGs from this `brand/` dir. Mirrors the structure of a working brand spec — palette, type, logo, voice.

> **Status:** working draft, 2026-06-04. Direction chosen with the founder: **minimal & sharp** (Linear/Vercel register). Mark + accent are provisional pending final sign-off (see end). Isolated from `apps/web` so it never collides with the app scaffold.

## Identity at a glance

- **Name:** TrackTub (kept through PMF; platform rename is a post-PMF question per PRD §6).
- **What it is:** the **dispute-grade evidence layer** for short-term-rental hot-tub turnovers. B2B SaaS.
- **One-liner:** *Guest-ready hot tub proof for every turnover.*
- **Tone:** technical, credible, calm-confident. A trustworthy field/record tool — **never** spa, wellness, aqua, or relaxation.
- **Register:** minimal & sharp. Dark-first. Near-monochrome + one accent. Square caps, flat geometry, fine borders, monospace metadata. The look *is* the differentiator: "proof / verified / on the record."

## Color palette

Dark-first (the product presents dark, like Linear). Light mode is fully supported.

### Dark (primary)
| Role | Hex | Use |
|---|---|---|
| Black | `#08090A` | App background |
| Surface | `#131417` | Cards, panels |
| Surface 2 | `#191B20` | Raised elements |
| Border | `rgba(255,255,255,.09)` | Hairline dividers |
| Hi text | `#EDEDEF` | Primary text |
| Lo text | `#8A8F98` | Secondary text, mono metadata |
| **Verified (accent)** | `#34D399` | The single accent — verified/success ONLY |

### Light
| Role | Hex |
|---|---|
| Background | `#FFFFFF` |
| Surface | `#F6F7F8` |
| Hi text | `#08090A` |
| Lo text | `#5A5F6A` |
| Border | `rgba(8,9,10,.10)` |
| Verified text (accessible) | `#0A7A55` |

### Semantic
| State | Hex | Meaning |
|---|---|---|
| Verified | `#34D399` | Turnover confirmed / proof valid |
| Pending / cloudy | `#E8A33D` | Awaiting submission; water-clarity flag (§8.8) |
| Urgent | `#EF4444` | Urgent flag, failed geofence |
| Indigo (alt accent) | `#5E6AD2` | One-line swap if we move off green |

**Rule:** green is reserved for *verified/success*. It never appears as decoration — that's what makes a green "VERIFIED" tag mean something.

## Typography

- **Display + UI:** **Inter** (400/500/600/700), tight tracking on headings (−0.02 to −0.035em).
- **Proof metadata:** **JetBrains Mono** (400/500) — timestamps, IDs, geofence, and the signature `✓ VERIFIED` tag. The mono is the "machine record" tell.
- Production wordmark = Inter 600 **outlined to paths** (don't ship font-dependent `<text>`).

## Logo & mark

Files in `brand/logo/` and `brand/icons/`.

- **Primary mark:** **Sharp check** (`logo/mark-check.svg`) — two-tone, square caps. Green short arm `#34D399` + ink long arm `#08090A` on light; ink→white inverse on dark.
- **Alternates (saved so you can swap by eye):** `mark-record.svg` (isometric "immutable record" stack), `mark-monogram.svg` (geometric T with one accent facet).
- **Wordmark:** `TrackTub`, Inter 600, mostly monochrome. Optional accent on "Tub".
- **App icon:** `icons/app-icon.svg` — ink tile, white/green check.
- **Clear space:** ≥ the height of the check's short arm on all sides.
- **Min size:** mark 16px (favicon); wordmark 96px wide.
- **Don't:** recolor outside the palette, add gradients/shadows, round the caps (kills the "sharp"), or place the mark on a busy photo.

### The "Verified" pattern (signature device)
A monospace tag — `✓ VERIFIED` in accent on a dim accent fill — plus a metadata line (`2026-06-04 14:22 UTC · submitter ✓ · geofence ✓`). This is the brand's most reusable element: it appears in the cockpit, on the shareable proof link, and (fast-follow) on the signed PDF + badge. It carries both the SaaS look and the proof differentiator at once.

## Voice

- Proof over hype: *"Show the tub was ready"* beats *"premium peace of mind."*
- Plain and technical. Operators and cleaners, not spa guests.
- Let the record speak — timestamps, names, status. Credibility comes from specifics.

## Imagery

- **Hero / marketing imagery:** Nano Banana Pro (`nano-banana --model pro`). Operator-asset hot-tub scenes — clean, controlled, mid-turnover — **not** candlelit spa.
- **Ethics (hard rule):** never present AI-generated tub photos as *real customer proof*. The brand promise is human-confirmed proof; fabricated "proof" imagery must be clearly illustrative and swapped for real pilot photos ASAP.
- ⚠️ **All imagery is blocked until a working Gemini key replaces the suspended one in `~/.nano-banana/.env`.** Everything else (SVG, tokens, UI) proceeds now.

## Production approach

| Asset class | Tool | Owner |
|---|---|---|
| Logo, mark, badge, icons | Hand-authored **SVG** | Claude |
| Color + type tokens | **Code** (Tailwind `@theme` / `tokens.css`) | Claude |
| App / PWA UI | **Code** (shadcn available) | Claude + app agents |
| Hero / marketing imagery | **Nano Banana Pro** | Claude (needs key) |
| Social posts, one-pagers, lead-magnet, slides | **Canva** | Founder |

## Phasing (mirrors PRD §13)

- **v1 face (build now):** wordmark, app icon/favicon, color/type tokens, capture-PWA UI, operator cockpit, **shareable proof-link page** (v1's only public proof surface).
- **Fast-follow (after activation gate):** "Verified by TrackTub" badge, signed-PDF template, owner portal, AI-assist UI, landing page + marketing imagery, chemistry-aware UI.

See `brand/asset-plan.md` (being assembled) for the full per-asset inventory and build order.

## Still open

- **Final look sign-off** — minimal/sharp confirmed in concept; needs your eyes on the rendered `review.html`.
- **Mark** — Sharp check (default) vs record vs monogram.
- **Accent** — verified-green `#34D399` (default) vs Linear indigo `#5E6AD2`.

# TrackTub — Branding Asset Plan

## 1. Executive summary

TrackTub's brand is a single, cohesive **MINIMAL & SHARP** system (Linear/Vercel register): dark-first, near-monochrome, one Verified-green accent (#34D399), Inter + JetBrains Mono, and a Sharp two-tone check mark that means *verified record*. The brand exists to make hot-tub turnover evidence look **dispute-grade** to skeptical owners/guests/Airbnb while being instantly usable by high-churn, low-tech cleaning staff (adoption is the existential risk). Phasing strictly mirrors the PRD: **v1** ships only what the thin MVP needs — the capture PWA, operator cockpit, and the public read-only proof link with its thin proof primitives (server timestamp + immutable-after-submit) — while the signed PDF, "Verified by TrackTub" integrity badge, geofence, owner portal, AI vision assist, and the entire marketing landing page are **fast-follow**, built only after the activation gate. A critical cross-cutting issue: the already-scaffolded `apps/web` ships a contradictory "Field Record" theme (warm paper, Fraunces serif, verdigris/aqua droplet) that must be reconciled to this canonical brief — every domain below flags it but does not silently overwrite other agents' work. Almost everything is buildable **now** as hand-authored SVG or code tokens; **only Nano Banana Pro marketing imagery is blocked** on the suspended Gemini key.

## 2. Production approach

| Asset class | Tool | Owner |
|---|---|---|
| Logo, mark, lockups, badges, icons, favicons, app icons | Hand-authored SVG (vector, optimized, viewBox-normalized) | Claude |
| Color / type / spacing tokens, Tailwind `@theme`, theming runtime, manifest/metadata | Code tokens | Claude |
| OG / share cards needing per-record data | Code (`next/og` ImageResponse) | Claude |
| Static OG / social fallback cards | Hand-authored SVG → PNG export | Claude |
| PNG/ICO exports from SVG masters | Code (sharp-based export script) | Claude |
| Hero / section / launch marketing imagery | Nano Banana Pro (`nano-banana` CLI, `--model pro`) | Claude (blocked on key) |
| Marketing layouts: social posts, one-pagers, lead-magnet, slides, staff board | Canva (trademark mark imported as SVG/PNG, never Canva stock) | Founder |
| Real turnover photos (proof + showcase) | Camera (user-captured) / pilot | Staff / operators |

## 3. Asset inventory by domain

### Logo system
| Name | Format | Variants | Sizes | Location | Phase |
|---|---|---|---|---|---|
| Primary mark — Sharp two-tone check (master) | svg | two-tone-accent, mono-currentColor, padded | 24×24 grid, viewBox 0 0 24 24 | `brand/logo/mark/tracktub-mark.svg` | v1 |
| Wordmark — "TrackTub" (Inter, outlined) | svg | dark, light, mono, accent-split (dark-only) | cap-height 24u, ~150u wide, min 88px | `brand/logo/wordmark/tracktub-wordmark.svg` | v1 |
| Horizontal lockup — mark + wordmark | svg | dark, light, mono, inverse | ~196×24u, min 18px tall | `brand/logo/lockup/tracktub-horizontal.svg` | v1 |
| Stacked lockup — mark over wordmark | svg | dark, light, mono, inverse-knockout | ~150×96u, min 40px | `brand/logo/lockup/tracktub-stacked.svg` | v1 |
| App icon / PWA icon (maskable + any) | svg, png | dark plate, maskable, light/mono | 512 master; 192/256/384/512 + 180 | `brand/logo/app-icon/` | v1 |
| Favicon set (hinted) | svg, ico, png | dark, light, prefers-color-scheme | 32 master; ico 16/32/48; 180 | `brand/logo/favicon/` | v1 |
| Clear-space & construction guide | svg, md | clear-space, min-size ladder, misuse sheet | 1200×800 artboards | `brand/logo/guidelines/` + `brand/logo/README.md` | v1 |
| Inverse / knockout & social-channel logos | svg, png | knockout-white/black, social-square-dark/accent | 400×400, PNG 400/800 | `brand/logo/inverse/` + `brand/logo/social/` | v1 |
| OG / share-card logo placement template | svg | proof-link OG, landing OG | 1200×630 frame | `brand/logo/og/og-logo-template.svg` | fast-follow |

### App icon, favicon & PWA icons
| Name | Format | Variants | Sizes | Location | Phase |
|---|---|---|---|---|---|
| Canonical app-icon master | svg | dark, light, mono | 1024×1024, r≈180 | `brand/icons/app-icon-master.svg` | v1 |
| Browser favicon (light/dark aware) | svg | light, dark, accent leg | viewBox 0 0 32 32 | `apps/web/src/app/icon.svg` | v1 |
| Legacy favicon.ico (multi-res) | ico | dark-tile | 16/32/48 packed | `apps/web/src/app/favicon.ico` | v1 |
| Apple touch icon | png | dark tile, opaque | 180×180 | `apps/web/src/app/apple-icon.png` | v1 |
| PWA install icon 192 (any) | png | dark tile | 192×192 | `apps/web/public/icons/icon-192.png` | v1 |
| PWA install icon 512 (any) | png | dark tile | 512×512 | `apps/web/public/icons/icon-512.png` | v1 |
| PWA maskable 192 + 512 | png | dark full-bleed, 80% safe zone | 192, 512 | `apps/web/public/icons/icon-maskable-{192,512}.png` | v1 |
| PWA monochrome icon | png | white silhouette on transparent | 512×512 | `apps/web/public/icons/icon-monochrome-512.png` | v1 |
| PWA splash screen | png, svg | dark only, optional wordmark | Android auto; iOS optional matrix | `brand/icons/splash/` + `apps/web/public/splash/` | v1 |
| manifest.ts rewrite (dark-first) | ts | green default, indigo alt | config | `apps/web/src/app/manifest.ts` | v1 |
| Icon system README + sync note | md | n/a | n/a | `brand/icons/README.md` | v1 |
| Verified-state install icon overlay | svg, png | accent notch/ring | matches 192/512 | `brand/icons/app-icon-verified.svg` | fast-follow |

### Color tokens
| Name | Format | Variants | Sizes | Location | Phase |
|---|---|---|---|---|---|
| Primitive palette (raw scale) | css/json/ts | dark-source, light-source | ~48 primitives (W3C DTCG) | `brand/tokens/primitives.*` | v1 |
| Dark semantic token set (default) | css/json/ts | accent-green, accent-indigo-alt | full semantic layer | `brand/tokens/semantic.dark.*` | v1 |
| Light semantic token set (proof link) | css/json/ts | accent-green, accent-indigo | full semantic layer | `brand/tokens/semantic.light.*` | v1 |
| Proof-state tokens (verified/pending/urgent) | css/json/ts | dark, light, subtle, solid | per-state fg/bg/border/fill/on-fill | `brand/tokens/state.*` | v1 |
| Geofence-fail + integrity-badge accent tokens | css/json/ts | pass, fail, unknown, badge dark/light | per-state | `brand/tokens/state-trust.*` | fast-follow |
| Tailwind v4 `@theme` mapping | css | green build, indigo build | `@theme inline` | `brand/tokens/tailwind/theme.css` | v1 |
| Theming runtime (switch + meta) | css, ts | app-shell, proof-link, user-toggle | `:root` / `[data-theme=light]` | `brand/tokens/index.css` + `theme.ts` | v1 |
| WCAG contrast matrix + usage README | md/json/html | dark-matrix, light-matrix, colorblind notes | N×M matrix | `brand/tokens/CONTRAST.md` + `contrast.json` + `preview.html` | v1 |

### Type system
| Name | Format | Variants | Sizes | Location | Phase |
|---|---|---|---|---|---|
| `type.ts` — Inter + JetBrains Mono loader | ts (next/font) | --font-inter, --font-jbmono | Inter 400/500/600/700; JBMono 400/500/600 | `brand/tokens/type.ts` → `apps/web/.../layout.tsx` | v1 |
| `tokens.type.css` — type CSS vars | css | dark (default), light (color only) | display→caption scale + mono recipes | `brand/tokens/tokens.type.css` | v1 |
| `type.theme.css` — Tailwind v4 `@theme` | css | dark default | font-sans/mono, text-display→caption | `brand/tokens/type.theme.css` | v1 |
| VERIFIED tag + proof-metadata recipe | css | tag-verified/neutral/pending, proof-meta inline/block | tag 11px/0.12em; meta 12px tnum+zero | `brand/tokens/type.proof.css` | v1 |
| Type specimen sheet | html, svg | dark, light | 1440×var; SVG 1200×1600 | `brand/tokens/specimen/type-scale.*` | v1 |
| Responsive-type rules | md | PWA-capture, cockpit, proof/PDF/email | breakpoints 640/1024 | `brand/tokens/responsive-type.md` | v1 |
| Marketing display type tier | css, pdf | web (clamp), Canva (fixed-px) | hero/section clamps, weight 700 | `brand/tokens/type.display.css` + specimen PDF | fast-follow |

### Iconography set
| Name | Format | Variants | Sizes | Location | Phase |
|---|---|---|---|---|---|
| Icon-system contract + base template | svg, md | dark, light, stroke 1.5/1.6 | 24 grid, 20 live area | `brand/icons/_system/` | v1 |
| Icon.tsx (regenerated sharp sprite) | tsx | dark, light, filled-state | size 18, stroke 1.6, 24 viewBox | `apps/web/src/components/Icon.tsx` | v1 |
| proof / server-timestamp | svg | dark, light, 16-opt, accent | 24 + 16 hinted | `brand/icons/proof/server-timestamp.svg` | v1 |
| proof / immutable-locked | svg | dark, light, 16-opt, accent, lo-text | 24 + 16 hinted | `brand/icons/proof/immutable-locked.svg` | v1 |
| capture-slot / wide-tub | svg | captured, required-empty, error | 24 + 16 hinted | `brand/icons/capture/slot-wide.svg` | v1 |
| capture-slot / waterline | svg | captured, cloudy-flag | 24 + 16 hinted | `brand/icons/capture/slot-waterline.svg` | v1 |
| capture-slot / control-panel | svg | captured, error-flag | 24 + 16 hinted | `brand/icons/capture/slot-panel.svg` | v1 |
| capture-slot / cover-filter | svg | captured, damage-flag | 24 + 16 hinted | `brand/icons/capture/slot-cover.svg` | v1 |
| capture-flow status overlays | svg | required, captured, error | 12–14 overlay; 16 standalone | `brand/icons/capture/state-*.svg` | v1 |
| favicon / app icon (sharp re-cut) | svg, png, ico | dark, light, maskable, mono | 16/32/48; 180; 512 | `apps/web/src/app/icon.svg` + `brand/icons/app/` | v1 |
| `index.json` icon manifest | json | n/a | n/a | `brand/icons/index.json` | v1 |
| proof / geofence (pin + radius) | svg | pin-filled, pin-outline-dashed | 24 + 16 hinted | `brand/icons/proof/geofence.svg` | fast-follow |
| proof / verified-submitter | svg | verified-filled, unverified-outline | 24 + 16 hinted | `brand/icons/proof/verified-submitter.svg` | fast-follow |
| proof / audit-log | svg | dark, light, 16-opt | 24 + 16 hinted | `brand/icons/proof/audit-log.svg` | fast-follow |
| verified / integrity badge glyph (icon-grade) | svg | dark, light, accent | 24 + 16 hinted | `brand/icons/proof/verified-badge-glyph.svg` | fast-follow |
| sprite.svg (non-React surfaces) | svg | currentColor, fill-fallback | 24 viewBox symbols | `brand/icons/sprite.svg` | fast-follow |

### PWA capture UI kit (staff)
| Name | Format | Variants | Sizes | Location | Phase |
|---|---|---|---|---|---|
| Capture flow design tokens | css, ts | dark, light, high-contrast | tap-min 56px, body 17px | `brand/tokens/capture.tokens.css` (`--tt-` namespace) | v1 |
| 4-step capture progress stepper | svg, tsx | dot+label, compact bar, per-segment states | 360×48 / 768×56 | `brand/icons/capture/progress-stepper.svg` + `.../capture/Stepper.tsx` | v1 |
| Photo-slot guidance icons + framing ghosts | svg, tsx | instructional, ghost overlay, captured, retake | 24 grid; ghosts 1024×768 (4:3) | `brand/icons/capture/slots/` + `.../framing/` | v1 |
| Camera / upload control cluster | svg, tsx | shutter states, upload fallback, retake, flip/flash | shutter 72px, secondary 56px | `brand/icons/capture/controls/` + `.../CaptureControls.tsx` | v1 |
| Photo confirm / retake review card | svg, tsx | keep/retake (v1), suggested-vs-confirmed (FF) | full-width, 4:3 region | `apps/web/.../capture/PhotoReviewCard.tsx` + `tag-chip.svg` | v1 |
| Notes field + urgent flag toggle | svg, tsx | urgent off/on, notes empty/filled | textarea 96px, toggle 56px | `brand/icons/capture/urgent-flag.svg` + `.../NotesAndUrgent.tsx` | v1 |
| Submit / lock confirmation sheet | svg, tsx | all-captured, missing, urgent, submitting/locked | sheet ≤88vh, submit 64px | `apps/web/.../capture/SubmitSheet.tsx` + `lock-stamp.svg` | v1 |
| Verified success + proof-link handoff | svg, tsx, json | static, animated draw-in, copied, share, reduced-motion | check 96–120px hero | `brand/icons/capture/verified-check.svg` + `verified-check.lottie.json` + `SuccessHandoff.tsx` | v1 |
| Offline / sync & permission status | svg, tsx | offline-queued, syncing, sync-error, camera-blocked | chip 28px; modal full-screen | `brand/icons/capture/status/` + `.../SyncStatus.tsx` | v1 |
| Install-to-homescreen prompt + maskable icon | svg, png, ts | standard, maskable, monochrome, iOS apple-touch | 192/512, maskable, 180 | `brand/app-icon/` → `apps/web/public/icons/` + `InstallPrompt.tsx` | v1 |
| Onboarding / first-run coachmarks (wordless) | svg, tsx | 3 frames, skip+pager, dark/light | ~360×480 art | `brand/illustration/coachmarks/` + `FirstRun.tsx` | v1 |
| Capture empty / loading / error states | svg, tsx | empty slot, skeleton, upload/file errors | tiles 4:3 | `apps/web/.../capture/states/` + `empty-slot.svg` | v1 |
| Capture-time geofence indicator | svg, tsx | at-property, near, off-site, permission-denied | chip 28px, mini-viz 120×120 | `brand/icons/capture/geofence/` + `GeofenceChip.tsx` | fast-follow |
| AI vision-assist tag-suggestion UI | svg, tsx | suggested, confirmed, dismissed, analyzing | chips 36px, targets 44px | `apps/web/.../capture/SuggestedTags.tsx` + `sparkle-suggest.svg` | fast-follow |
| Light chemistry-aware capture layer | svg, tsx | clarity scale, bather-load stepper, skipped | targets 56px | `apps/web/.../capture/ChemistryHints.tsx` + `clarity-scale.svg` | later |

### Operator cockpit UI kit
| Name | Format | Variants | Sizes | Location | Phase |
|---|---|---|---|---|---|
| Cockpit color + type tokens (re-skin) | css, json | dark, light | ~120 lines; **fixes undefined --ok/--warn/--danger bug** | `brand/tokens/cockpit.tokens.css` + `.json` | v1 |
| Property card spec | css, mdx, tsx-ref | guest-ready, needs-turnover, urgent, bather-load, owner, hover, focus | row min-h 92px, pad 20px | `brand/cockpit/property-card.spec.mdx` + `apps/web/src/app/page.tsx` | v1 |
| Last-turnover summary block | css, mdx | with-turnover, none, draft (later) | single line 13px + lock 13px | `brand/cockpit/last-turnover.spec.mdx` | v1 |
| Turnover gallery / photo-plate grid | css, tsx-ref | with-image, placeholder, has-issue, loading | grid minmax(124px,1fr) | `brand/cockpit/gallery.spec.mdx` + `PhotoThumb.tsx` | v1 |
| Open-issue chips + status badge set | svg, css, mdx | ok/warn/danger/brand/neutral + 5 issue tags | chip 20px, 4px radius | `brand/cockpit/chips/` | v1 |
| Cockpit stat tiles (KPI row) | css, mdx | neutral, open-issues, awaiting, loading | grid minmax(160px,1fr) | `brand/cockpit/stat-tile.spec.mdx` | v1 |
| Cockpit alert / note banners | svg, css, mdx | info, warn/danger, bather-load, dismissible (later) | pad 11/13px, 3px edge | `brand/cockpit/banners.spec.mdx` | v1 |
| Cockpit empty states | svg, css, mdx | no-properties, no-turnovers, no-issues, search (later) | illustration ~96×96 | `brand/cockpit/empty/` | v1 |
| Cockpit loading / skeleton states | css, mdx | full-page, card, tile, gallery shimmer | matches real geometry | `brand/cockpit/skeleton.spec.mdx` | v1 |
| Cockpit icon subset (dark UI glyphs) | svg | slot + proof/status + chrome glyphs | 24 viewBox, 1.6 stroke | `brand/icons/` (extracted from Icon.tsx) | v1 |
| Verified-by-TrackTub integrity badge (cockpit) | svg, css | verified, timestamp-only "Locked", geofence-confirmed | chip 20px + seal 64/128px | `brand/cockpit/verified-badge.svg` | fast-follow |
| AI-suggested-tag "pending review" chip | svg, css | suggested-pending, confirmed, dismissed | chip 20px, dashed | `brand/cockpit/chips/suggested.css` | fast-follow |

### Shareable proof-link page (v1 public surface)
| Name | Format | Variants | Sizes | Location | Phase |
|---|---|---|---|---|---|
| Proof-page token set (`proof-link.css`) | css, ts | dark, light (public default), `@theme` | h1 26px, body 14px, mono 11px | `brand/tokens/proof-link.css` → `apps/web/.../proof/proof.css` | v1 |
| Proof-page brand lockup (header) | svg, tsx | dark-on-light, light-on-dark, mark-only, horizontal | mark 26px, full ~140×28 | `brand/logo/tracktub-lockup.svg` + `ProofHeader.tsx` | v1 |
| Locked / immutable status chip | svg, tsx | locked (neutral), locked-accent | chip 22px, glyph 14px | `brand/icons/lock.svg` + `StatusChip.tsx` | v1 |
| Photo plate frame + slot captions | tsx, svg | with-photo, issue-flagged, loading, missing | tile 4:3, radius 8px | `apps/web/.../PhotoThumb.tsx` (re-skin) + `brand/icons/slot-*.svg` | v1 |
| Record metadata block (proof facts) | tsx, css | dark, light, mobile, issues/no-issues | kv 150px/1fr | `apps/web/.../proof/[token]/page.tsx` | v1 |
| OG / social share-preview card | png, tsx (next/og) | default, issue-flagged, dark-only | 1200×630, 600×315 | `apps/web/.../proof/[token]/opengraph-image.tsx` | v1 |
| Favicon / app icon for proof tab | svg, ico, png | light, dark, maskable | 16/32/48; 180; 192/512 | `apps/web/src/app/icon.svg` + `apple-touch-icon.png` | v1 |
| Proof-link invalid / expired empty-state | tsx, svg | invalid, loading skeleton, revoked (FF copy) | glyph 40px, card 420px | `apps/web/.../proof/[token]/page.tsx` + `link-broken.svg` | v1 |
| Verified-by-TrackTub integrity badge | svg, tsx, pdf-vector | on-link, on-PDF, verified+geofenced, light/dark | 96px hero / 28px inline | `brand/badges/verified-by-tracktub.svg` + `VerifiedBadge.tsx` | fast-follow |
| Signed-PDF certificate template | pdf, svg-ref | single, issues-flagged, Letter + A4 | 8.5×11 + A4 | `apps/web/src/lib/pdf/turnover-certificate.tsx` | fast-follow |
| Proof-link share-flow marketing mockup | png, webp | phone-in-hand, iMessage unfurl, owner-on-laptop | 1600×1000, 1080², 1200×630 | `brand/imagery/proof-share-hero.png` | fast-follow · **blocked** |

### Verified badge + signed-PDF template (fast-follow)
| Name | Format | Variants | Sizes | Location | Phase |
|---|---|---|---|---|---|
| Verified-by-TrackTub integrity badge (master) | svg | dark, light/paper, horizontal, stacked, mono | 320×88 / 120×120, min 88–120px | `brand/badge/verified-badge.svg` | fast-follow |
| Integrity badge state set | svg | verified, verified-no-geofence, pending, superseded, invalid | 320×88 / 120×120 | `brand/badge/states/` | fast-follow |
| JetBrains-Mono VERIFIED tag component | tsx, css | solid dim-fill, outline, sm/md, state-driven | 20/26px tag | `apps/web/src/components/VerifiedTag.tsx` | fast-follow |
| Signed-PDF proof export template | html, react-pdf, ref-pdf | clean, issues-flagged, with/without geofence | Letter + A4, photos 2×2 @300dpi | `apps/web/src/pdf/ProofCertificate.tsx` + `brand/pdf/` | fast-follow |
| PDF header/footer lockup + watermark | svg | header lockup, footer rule, watermark tile | header ~2in, tile ~2.5in | `brand/pdf/chrome/` | fast-follow |
| `/verify/[token]` integrity-check page styling | tsx, css | verified, pending, superseded, invalid, dark/light | column max-w 560px, badge 120px | `apps/web/src/app/verify/[token]/page.tsx` | fast-follow |
| Email/share integrity badge (raster + inline) | png, svg, data-uri | 1x/2x/3x, dark/light, transparent/solid | 144/240px wide | `brand/badge/email/` | fast-follow |

### Landing page visual system + hero/marketing imagery
| Name | Format | Variants | Sizes | Location | Phase |
|---|---|---|---|---|---|
| Proof-link social unfurl card + meta (`/p/[token]`) | png, tsx (next/og), meta | verified, pending, light, no-image | 1200×630, 1200×600 | `apps/web/.../p/[token]/opengraph-image.tsx` + `twitter-image.tsx` | v1 |
| Landing layout system + section grid tokens | css, tsx | section dark/surface/light, full-bleed hero | container 1120px | `brand/landing/layout.css` → `(marketing)/_components/` | fast-follow |
| Hero composition (dark, headline + proof mockup) | tsx, css, svg | dark, light, reduced-motion, mobile | min-h 640px | `apps/web/.../(marketing)/_components/Hero.tsx` | fast-follow |
| Hero backdrop scene — operator turnover | png, webp, svg-placeholder | dark/light-graded, 16:9, 4:5, blurred | 2400×1350 @2x | `brand/imagery/hero/` → `apps/web/public/marketing/hero/` | fast-follow · **blocked** |
| Benefit-trio section visuals | svg, tsx, css | dark, light, mono print | spot 320×200, icon 48px | `brand/landing/benefits/` | fast-follow |
| Proof-link demo section (phone mockup) | svg, tsx, png | phone, browser, dark/light, verified/pending | phone 390×844, desktop 1280×800 | `brand/landing/devices/` + `DeviceShowcase.tsx` | fast-follow |
| Section imagery set — feature scenes | png, webp, svg-placeholder | capture-field, cockpit-review, proof-received | 1600×1000 @2x | `brand/imagery/sections/` | fast-follow · **blocked** |
| Trust / credibility strip | tsx, svg, css | light, dark, logos-pending, with/without badge | logo row 28px, badge 96px | `apps/web/.../(marketing)/_components/TrustStrip.tsx` | fast-follow |
| Final CTA section | tsx, css | dark, light, post-submit success | CTA 48px | `apps/web/.../(marketing)/_components/FinalCTA.tsx` | fast-follow |
| Marketing meta + favicon/manifest wiring | tsx (Metadata), json-ld, png | landing OG, light/dark theme-color | OG 1200×630 | `apps/web/.../(marketing)/layout.tsx` + `brand/social/landing-og.png` | fast-follow |

### OG/social cards + lead-magnet art
| Name | Format | Variants | Sizes | Location | Phase |
|---|---|---|---|---|---|
| Default OG / Twitter card (static brand) | svg, png | dark, light, twitter-crop | 1200×630, 600×315 | `brand/social/og-default.svg` → `apps/web/public/og/` | v1 |
| Proof-link OG card (dynamic per-turnover) | tsx (next/og) | verified, verified-with-flags, invalid fallback | 1200×630 | `apps/web/.../proof/[token]/opengraph-image.tsx` + `src/og/` | v1 |
| OG/social asset README + alt-text + cache contract | md | n/a | n/a | `brand/social/README.md` | v1 |
| Social card template set (announcement/quote/metric) | svg, canva, png | announcement, pull-quote, metric, dark/light | 1080², 1080×1350, 1200×675 | `brand/social/templates/` + `brand/social/canva-kit/` | fast-follow |
| Launch / waitlist social card | tsx/static, png | dark hero, text-only fallback | 1200×630, 1080² | `brand/social/launch/` → `apps/web/public/og/og-launch.png` | fast-follow · **blocked** (hero) |
| Turnover SOP lead-magnet PDF cover + interior | pdf, svg, canva | screen/dark cover, print/light interior, A4 + Letter | A4/Letter @150dpi | `brand/lead-magnet/` → `apps/web/public/lead-magnet/turnover-sop.pdf` | fast-follow |

### Photography & AI-imagery style + ethics
| Name | Format | Variants | Sizes | Location | Phase |
|---|---|---|---|---|---|
| Photography & AI-imagery + Ethics Style Guide | md | full doc, TL;DR ethics block | doc | `brand/imagery/PHOTOGRAPHY.md` | v1 |
| Real-photo capture style guide (4-shot set) | md, svg | wide, waterline, panel, cover | framing SVGs 4:3, ref 1200×900 | `brand/imagery/capture-style/` | v1 |
| AI-image provenance + ethics enforcement system | md, json, ts | sidecar schema, filename convention, runtime guard, CI lint | n/a | `brand/imagery/ethics/` + `apps/web/src/lib/imageProvenance.ts` | v1 |
| Pilot/real-photo treatment + dark-frame spec | md, json | proof-context, marketing-context | proof 1080×810, thumb 320×240, mktg 1600×1200 | `brand/imagery/treatment/` | fast-follow |
| Nano Banana prompt library + house-style preamble | md, sh | preamble, negative block, scene bodies | CLI wrapper (`--model pro`) | `brand/imagery/ai/prompts.md` + `gen.sh` | fast-follow |
| Hero / marketing AI image set (rendered outputs) | png, webp, avif | hero dark/light, sections, abstract, OG bg | hero 2560×1440, section 1600×1200 | `brand/imagery/ai/renders/` → `apps/web/public/marketing/` | fast-follow · **blocked** |
| Capture do/don't reference board (staff) | pdf, png | wide, waterline, panel, cover, summary | A4/Letter + 1080×1920 | `brand/imagery/staff-reference/` | fast-follow |

## 4. Phasing (mirrors PRD §13 build order)

### v1 — THIN MVP (capture PWA + cockpit + public proof link with thin proof primitives)

**Foundation (consumed by every surface):**
- Color tokens: primitives, dark + light semantic, proof-state (verified/pending/urgent), Tailwind `@theme`, theming runtime, WCAG contrast matrix.
- Type system: Inter + JetBrains Mono loader, type CSS vars, Tailwind type `@theme`, VERIFIED/proof-meta recipe, specimen, responsive-type rules.
- Logo system: master mark, wordmark, horizontal + stacked lockups, clear-space guide, inverse/knockout, social squares.
- Icon system: contract + template, regenerated sharp `Icon.tsx`, slot glyphs (wide/waterline/panel/cover), capture status overlays, proof server-timestamp + immutable-locked, `index.json`, cockpit icon subset.
- Imagery ethics: `PHOTOGRAPHY.md`, capture-style guide, **provenance enforcement system** (`assertProofSafe` wired into proof routes) — must exist *before* the public proof link ships.

**Build step (a) — Turnover capture PWA (staff):** capture tokens (`--tt-`), 4-step stepper, slot guidance + framing ghosts, camera/upload cluster, photo review card, notes + urgent toggle, submit/lock sheet, verified success + proof-link handoff, offline/sync status, install prompt + maskable app-icon set, wordless coachmarks, empty/loading/error states. App icon master, favicon (light/dark + ico), apple-touch, PWA 192/512/maskable/monochrome PNGs, splash, **manifest.ts rewrite** (theme_color → #08090A), icon README.

**Build step (b) — Operator cockpit:** cockpit token re-skin (**fixes the undefined `--ok/--warn/--danger` bug**), property card, last-turnover block, gallery grid, open-issue chips + status badges, KPI stat tiles, alert banners, empty + skeleton states.

**Build step (c) — Thin proof primitives (public read-only proof link):** proof-page token set (light default), proof header lockup, Locked/immutable status chip (NOT "Verified"), photo plate frame, record metadata block, invalid/expired empty-state, proof favicon, **proof-link OG card** (`next/og`, real data only) + default static OG card + OG README/cache contract + `/p/[token]` unfurl card.

### Fast-follow — only after the activation gate

- **Signed PDF + integrity badge:** verified-badge master + state set, VERIFIED tag component, signed-PDF certificate template, PDF chrome + watermark, `/verify/[token]` page, email/share raster badge; cockpit + proof-link integrity-badge surfacing; trust accent tokens; verified-state install-icon overlay; verified-submitter / audit-log / integrity-badge-glyph icons; sprite.svg.
- **Capture-time geofence:** geofence icon, geofence chip UI, geofence-fail tokens, geofence rows on proof/PDF/cockpit.
- **Owner read-only portal:** light semantic tokens (already v1) + owner banner styling, read-only cockpit treatment.
- **AI vision assist:** suggested-tag UI (capture), "pending review" chip (cockpit), sparkle glyph.
- **Recurring email reminders:** email integrity badge, sprite-based icons for email.
- **Light chemistry-aware layer:** chemistry hints (capture) — tagged **later**; bather-load/water-clarity status ramp.
- **Marketing landing page:** landing layout system, hero composition + backdrop, benefit-trio visuals, device showcase, section imagery, trust strip, final CTA, marketing meta; OG logo template; marketing display type tier; social card template set + Canva kit; launch/waitlist card; lead-magnet SOP PDF; staff do/don't board; photo treatment spec; Nano Banana prompt library + rendered hero/section image set.

## 5. Blocked on Gemini key (Nano Banana Pro — key suspended)

Only these **imagery render** assets are blocked; everything else proceeds now. All are **fast-follow** and each ships a deterministic SVG/CSS/screenshot placeholder so layouts are buildable headless today.

- **Hero backdrop scene — operator turnover** (`brand/imagery/hero/`) — landing hero.
- **Section imagery set — feature scenes** (`brand/imagery/sections/`) — cleaner / cockpit / owner scenes.
- **Hero / marketing AI image set (rendered outputs)** (`brand/imagery/ai/renders/`) — the canonical render outputs + abstract proof textures.
- **Launch / waitlist social card — hero version** (`brand/social/launch/`) — text-only fallback ships now; swap to hero on key restore.
- **Proof-link share-flow marketing mockup** (`brand/imagery/proof-share-hero.png`) — sales one-pager hero; real product screenshots substitute meanwhile.

> Note: The **proof-link OG card** and **`/p/[token]` unfurl card** are *not* blocked — they render via `next/og` from real submitted data (code, not generated imagery). The Nano Banana **prompt library + `gen.sh` wrapper** are authored now (unblocked); only the render step waits on the key.

## 6. Recommended build order

1. **Resolve the Field Record ↔ canonical-brief fork with the founder** (gates all `apps/web` wiring; see Open Questions). Author brand-side assets to the canonical brief regardless.
2. **Color tokens** (primitives → dark/light semantic → state → theming runtime → Tailwind `@theme` → WCAG matrix). Source of truth nothing else can proceed without.
3. **Type system** (loader → CSS vars → `@theme` → VERIFIED/proof-meta recipe → specimen).
4. **Logo master mark + wordmark + lockups**, then **clear-space guide** (every other domain derives geometry from the mark).
5. **Icon system** (contract + template → regenerate `Icon.tsx` → slot + proof + status glyphs → `index.json`). Mark-derived check must rhyme with the logo.
6. **App icon / favicon / PWA set + manifest.ts rewrite** (export PNG/ICO via sharp script; validate on maskable.app + real iOS Add-to-Home-Screen).
7. **Imagery ethics + provenance system** (`assertProofSafe` wired into proof routes) — must land before any public proof surface.
8. **Cockpit token re-skin** (immediately fixes the live `--ok/--warn/--danger` bug) → cockpit components.
9. **PWA capture UI kit** (tokens → stepper → slot guidance → controls → review → notes/urgent → submit/lock → success/handoff → offline/install/onboarding/states). The existential-adoption surface.
10. **Proof-link page** (token set → header → status chip → photo frame → metadata → empty-state → favicon → OG cards + README). v1's only public surface and wedge driver.
11. **Default + dynamic OG cards** and OG README/cache contract (self-host Inter + JBMono buffers for Satori; inline hex).
12. *(Gate clears →)* **Fast-follow:** badge + signed-PDF + `/verify` → geofence → owner portal → AI assist → reminders.
13. **Marketing landing system** (layout → sections → placeholders), then **batch-generate Nano Banana imagery** once the key returns and drop into pre-cut slots. Canva kit + lead-magnet + social templates in parallel (founder).

## 7. Open questions for the founder

1. **Field Record vs canonical brief — the central fork.** The shipped `apps/web` (globals.css, layout.tsx, `icon.svg`, `manifest.ts`, `Seal.tsx`) implements a contradictory warm-paper / Fraunces-serif / verdigris-aqua identity. This plan is authored 100% to the MINIMAL & SHARP canonical brief. **Confirm the demo theme is a throwaway prototype to be replaced** (recommended) — this unblocks the manifest/layout/icon/globals rewrites that multiple agents touch.
2. **Accent lock: Verified-green #34D399 vs Linear-indigo #5E6AD2.** Tokens are built so the swap is one variable. Green is more on-brand ("verified") but **fails contrast as text/white-on-fill** (mandating near-black `accent-contrast` labels and a darker `#047857`/`#0A7A55` for green text on white); indigo is a safer white-label fill. Lock green for v1, or hold a flag?
3. **Light vs dark default for the public proof link.** This plan defaults the proof link to **light** (skeptical owner/guest on a daylight phone, no theme pref → light reads as document-credible) while honoring `prefers-color-scheme`. Confirm light-default is acceptable given the dark-first brand.
4. **Name "TrackTub"** — kept per brief, revisit at PMF. Any earlier trigger to revisit before trademark-bearing assets (mark, badge, lead-magnet) proliferate?
5. **iOS splash matrix** — ship the tedious per-device `apple-touch-startup-image` PNG set in v1, or defer (Android auto-splash + `background_color` is the cheap correct path)? Recommend defer.
6. **Gemini key timeline.** Restoration ETA? It gates only fast-follow marketing imagery, but determines whether the launch/sales hero uses Nano Banana or interim real screenshots.
7. **Verified-state honesty.** Confirm v1 records show only a neutral **"Locked"** chip (server timestamp + immutable), and the **"Verified by TrackTub"** badge / "taken at property" geofence line appear **only** once signed-PDF + geofence ship — so v1 never over-claims cryptographic proof.
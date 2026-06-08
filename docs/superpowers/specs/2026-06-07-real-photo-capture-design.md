# Demo: Real photo capture — design

> **Status:** Approved 2026-06-07. Scope: extend the `apps/web` thin-MVP **demo**
> (localStorage, no backend) per CLAUDE.md — UX/design reference, not the v1 build.
> **Branch:** `worktree-feat+demo-real-photo-capture` → PR to `main`.

## Goal

Replace the placeholder gradients with **real device-captured photos**, end to end
(capture wizard → turnover record → public proof → property gallery), staying 100%
client-side. The existing gradient remains the graceful fallback when no image is
present, so historical seed turnovers are unaffected.

This is the single highest-leverage demo upgrade: it makes every photo surface feel
real, which strengthens the core "dispute-grade evidence" story without any backend.

## Context (verified in code)

- `Photo.dataUrl: string | null` already exists (`lib/types.ts`); the comment promises
  "null => render a generated placeholder" but **nothing populates or renders it yet**.
- `PhotoThumb` is the **single** photo renderer, used on all four surfaces:
  `/t/[id]`, `/proof/[token]`, `/p/[id]`, and the wizard `/p/[id]/new`. Today it
  **always** draws the gradient and ignores `dataUrl`.
- The capture wizard fabricates a `Photo` with `dataUrl: null` on a button click.
- `store.write()` does a bare `localStorage.setItem` with no quota handling.
- No existing image/canvas/file-input code — clean slate.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Capture mechanism | Native `<input type="file" accept="image/*" capture="environment">` | Rear camera on mobile, file picker on desktop; zero permission edge cases; desktop-demo-friendly (pick a real tub photo). |
| Compression | Long edge ≤ **1280px**, **JPEG quality 0.72** | ~100–200 KB/photo; sharp on phone + laptop; ~6–7 captured turnovers fit under the ~5 MB localStorage budget. |
| Quota overflow | **Warn + offer reset** | On `QuotaExceededError`, keep the user on the review screen with photos intact, show "Storage full — reset the demo." Never silently loses or mutates a locked record (preserves the immutability story). |
| Evidence viewing | **Click-to-enlarge (lightbox)** on record + proof + gallery | Real photos you can't inspect are a half-measure for an evidence product; zoom is what settles a dispute. |
| Seed data | **Keep placeholders** | Zero asset sourcing; reads as a natural before/after (live capture = real, history = placeholder). |
| Format | JPEG (not WebP) | Universal, predictable size. |
| EXIF rotation | `createImageBitmap(file, {imageOrientation:"from-image"})` | Auto-corrects phone orientation before drawing. |
| HEIC that won't decode | Inline error: "couldn't read this image, try another" | iOS `capture` usually yields JPEG; gallery HEIC may not decode everywhere — fail gracefully. |
| `alt` text | Slot label (e.g. "Waterline photo") | Accessibility. |

## Changes

**1. `src/lib/image.ts`** *(new)* — `fileToCompressedDataUrl(file, {maxEdge=1280, quality=0.72}): Promise<string>`.
Decode with `createImageBitmap` (orientation-corrected) → draw to an offscreen canvas
scaled so the long edge ≤ `maxEdge` (aspect preserved) → `canvas.toDataURL("image/jpeg", quality)`.
Throws a tagged decode error the caller can surface. Pure, dependency-free.

**2. `src/components/PhotoThumb.tsx`** — when `photo.dataUrl` is non-null, render
`<img src={dataUrl} alt="{label} photo">` filling the 4:3 frame (`object-fit: cover`),
keeping the issue badge + figcaption; null → unchanged gradient. New opt-in
`enlargeable?: boolean` prop: when set and a real image is present, the tile is a button
that opens the lightbox.

**3. `src/components/Lightbox.tsx`** *(new)* — controlled full-screen dimmed overlay
showing the uncropped photo. Close on backdrop click and `Esc`; `role="dialog"` +
`aria-label`; restores nothing heavyweight (no focus-trap dependency).

**4. `src/app/p/[id]/new/page.tsx`** — hidden single-file
`<input type="file" accept="image/*" capture="environment">` per step. The viewfinder box
and Capture button trigger it; on select → `fileToCompressedDataUrl` (button shows
"Processing…", disabled) → build the `Photo` with the real `dataUrl` → preview via
`PhotoThumb`. **Retake** re-opens the picker; cancelling the picker is a no-op. `submit()`
wraps the save in try/catch → on the tagged quota error, stay on the review step with
photos intact and show the storage-full message instead of navigating. The AI-mock
"Simulate an issue" checkbox and the suggest/confirm flow are **unchanged**.

**5. `src/lib/store.ts`** — `write()` wraps `setItem` in try/catch and rethrows a tagged
`QuotaError` (detected via `e.name === "QuotaExceededError"` / name fallbacks) so the
wizard can distinguish it. `addTurnover` propagates the throw.

**Enlargeable enabled on:** `/t/[id]`, `/proof/[token]`, `/p/[id]`. Wizard preview stays
non-enlargeable (avoids clashing with Retake).

## Out of scope (this PR)

Live `getUserMedia` camera, multiple photos per slot, server upload, GPS/EXIF location,
real AI inference. All consistent with the demo's existing mock boundaries.

## Verification

- `npm run lint && npm run typecheck && npm run build` clean (from `apps/web`).
- Manual: capture a turnover on desktop (pick a hot-tub image) → the image shows on the
  record, the public proof link, and the property gallery; click-to-enlarge works on each;
  Retake replaces the image; `Reset demo` restores gradient placeholders.
- Quota path: not expected in a normal session; verified by the try/catch and message.

## Risks

- **HEIC decode** varies by browser; mitigated by the graceful inline error.
- **localStorage budget** is finite; mitigated by compression + the warn-and-reset path.
  Neither affects the v1 Supabase build, where photos live in Storage.

# TrackTub — brand motion

Short brand-reveal motion video for TrackTub, built with
[Remotion](https://remotion.dev). Dark-first, minimal/sharp — matching the rest
of `branding/` (see `../brand-notes.md`).

**Composition `BrandReveal`** — 1920×1080, 30 fps, 15 s.

## Develop / render

```bash
npm install
npm run studio    # live preview in the Remotion studio
npm run render    # renders to out/ (git-ignored)
```

The current export is committed at `tracktub-brand-reveal.mp4` (the deliverable).
`npm run render` writes to the git-ignored `out/`; copy the result up to the
project root to refresh the committed video. `node_modules/` is also ignored.

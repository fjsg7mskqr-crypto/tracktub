# UI + Brand Track — agent brief

> **You are the UI/brand agent.** You work in this worktree only:
> `.claude/worktrees/ui-brand` on branch `ui-brand`. A second agent is building
> the backend in parallel (`worktree-v1-rebuild`). **Read `CLAUDE.md` first** —
> the branch/PR rules are non-negotiable.

## Your mission
Build TrackTub's **design system + visual language + branding** for the v1 app:
Tailwind v4 + shadcn/ui themed to the brand, a reusable component library, the
app shell, and refined brand assets. The existing demo (`apps/web/src`) is your
**visual reference** — re-implement its look properly in Tailwind/shadcn; don't
just copy the hand-rolled CSS.

## Source of truth for the look
- `brand/brand-notes.md` — the spec: **minimal & sharp, dark-first (Linear/Vercel
  register)**, near-monochrome + ONE accent (**verified green `#34D399`**, used for
  verified/success ONLY — never decoration), **Inter** (UI/display) + **JetBrains
  Mono** (metadata). Sharp-check logo mark. The `✓ VERIFIED` mono tag is the
  signature device.
- `brand/tokens.css` — exact color/type/radius tokens to port into Tailwind `@theme`.
- `brand/logo/*`, `brand/icons/app-icon.svg`, `brand/review.html` — the rendered identity.

## File ownership — STAY IN YOUR LANE
**You own (edit freely):**
- `apps/web/src/app/globals.css`, `tailwind`/`postcss.config.mjs`, `components.json`
- `apps/web/src/components/**` (shadcn `ui/` + app components)
- `apps/web/src/app/layout.tsx` (fonts + shell)
- `brand/**` (logo/mark/icon SVG refinement, tokens)

**Do NOT touch (the backend agent owns these — editing them causes merge conflicts):**
- `apps/web/supabase/**`, `apps/web/src/lib/**`, `apps/web/src/middleware.ts`
- `apps/web/src/app/auth/**`, `apps/web/tests/**`

**Shared, coordinate before editing:** page files (`src/app/**/page.tsx`). The
backend wires data into pages using YOUR components — so build great components;
let pages compose them. If you must restyle a page, keep the data-fetching code
untouched and PR small.

## Workflow (every change)
1. First time: `cd apps/web && npm install` (this worktree needs its own deps). Run dev on a **non-default port** so it doesn't clash with the demo on :3000 → `npm run dev -- -p 3002`.
2. Work in small commits on branch `ui-brand`.
3. Before a PR: `npm run lint && npm run typecheck && npm run build` (all green).
4. `git push -u origin ui-brand` → `gh pr create --base main`. CI must pass; self-merge once green.
5. Keep PRs small and **rebase on `main` often** (`git fetch origin && git rebase origin/main`) so you stay in sync with the backend agent's merges.
6. **Do not promote to test/prod** — that's the founder's call.

## Task order

### Task 1 — Foundation (do this first; it unblocks the backend's pages)
- Install Tailwind v4 (`tailwindcss @tailwindcss/postcss postcss`) + `postcss.config.mjs`.
- Rewrite `globals.css`: `@import "tailwindcss";` + an `@theme` block porting `brand/tokens.css` (dark-first values: bg `#08090A`, surface `#131417`, border `rgba(255,255,255,.09)`, text-hi `#EDEDEF`, text-lo `#8A8F98`, verified `#34D399`, pending `#E8A33D`, urgent `#EF4444`; `--font-sans` Inter, `--font-mono` JetBrains Mono; `--radius` 12px). `:root { color-scheme: dark; }`.
- `npx shadcn@latest init` (neutral base, CSS variables), then `npx shadcn@latest add button input card label`.
- Keep `layout.tsx` on Inter + JetBrains Mono via `next/font`.
- PR: "feat(ui): design-system foundation (Tailwind v4 + shadcn + brand tokens)".

### Task 2 — Brand primitives as components
- `Mark` (sharp-check SVG, two-tone green/white), `Wordmark`, `VerifiedTag` (mono `✓ VERIFIED` on dim-green), `Badge` (ok/warn/danger/brand variants), `StatTile`, `PhotoPlate`, `Eyebrow`/`Label` (mono uppercase), `Toast`. Match the demo's components but Tailwind/shadcn-native.

### Task 3 — App shell
- `AppShell`/topbar: sharp-check mark + wordmark, mono uppercase nav, sticky blurred header, hairline border. A slot for the (later) role switcher. Mobile-first.

### Task 4 — Brand asset polish
- Tidy `brand/logo/*` + `brand/icons/app-icon.svg` + `apps/web/src/app/icon.svg` to final. Ensure favicon/PWA manifest colors are `#08090A`.
- NOTE: hero/marketing imagery is **blocked** until a working Gemini key exists (`brand/brand-notes.md`). Skip imagery; do everything else.

### Task 5 — Component showcase page (optional, helpful)
- A `/_design` route rendering every component + token swatch, so you (and the founder) can review the whole system on one page. Mark it dev-only.

## Definition of done (foundation PR)
Tailwind + shadcn installed, brand tokens live, the 4 base components themed, `npm run lint && typecheck && build` green, and the app renders dark/minimal-sharp matching `brand/review.html`. Then iterate Tasks 2–5 as separate PRs.

# TrackTub — agent & contributor guide

> Read this before doing any work. These rules exist because past iterations
> broke when agents committed to shared branches. Follow them exactly.

## What this is
TrackTub — the dispute-grade **evidence layer for short-term-rental hot-tub
turnovers** (B2B SaaS). Source of truth for product decisions: `docs/PRD.md`.
Brand/visual spec: `brand/` (minimal/sharp, dark-first, Inter + JetBrains Mono).

**Current phase (build-first):** the app in `apps/web` is a clickable thin-MVP
**demo** (Next.js 15, localStorage, no backend) — it is the **UX/design
reference only**. v1 is a **fresh schema-first rebuild on Supabase**
(Postgres + RLS + Auth + Storage + server timestamps + audit log), built on a
feature branch. Do not treat the demo as the real codebase.

## Repo layout
- `apps/web` — Next.js app (the only app today).
- `brand/` — identity spec, tokens, logo/icon SVGs.
- `docs/` — PRD, design specs, validation collateral.
- `vault/` — local Obsidian "second brain" (git-ignored; agent working memory — see below).
- `.github/workflows/ci.yml` — CI: install → lint → typecheck → build.

## Agent working memory — the Obsidian vault (`vault/`)
A local Obsidian vault lives at `vault/` (git-ignored — your private operating + thinking
layer; synced to its **own** private repo, not this one). It's a founder "second brain"
(domain hubs + Maps of Content). See `vault/README.md` and `vault/AGENTS.md`.

**Rule — every agent, both directions:**
1. **Read it for context** before planning/designing/researching — start at `vault/Home.md`,
   then the relevant hub MOC (Strategy/Validation/Build/Brand/GTM/Operations).
2. **Write planning there, not as loose files.** Any non-code artifact (plans, design
   iterations, brainstorming, research, decisions, interview/meeting notes) goes in the right
   `vault/` hub (or `vault/00 Inbox/` if unsure), from a template, linked from the hub MOC.
   Do **not** scatter planning markdown across the repo.
3. **Code + graduated specs stay in the repo.** Code, configs, and matured canonical specs
   live in `apps/`, `docs/`, etc. Graduate a vault draft to `docs/` via the normal worktree→PR flow.

The vault is local context (not in CI or fresh clones). A curator agent, **Hermes**, runs
off-machine to keep it tidy (`vault/_hermes/`). Tool scratch (`.superpowers/`) stays put.

## Branch & deploy model — code flows ONE direction
```
feature branch (in a worktree)
   │  PR · CI green · review
   ▼
 main   integration trunk — newest reviewed code (DEFAULT branch)
   │  promote (PR, fast-forward)
   ▼
 test   staging — deploys to the test URL + test Supabase
   │  promote (PR, fast-forward) after QA
   ▼
 prod   production — live site + live Supabase
```
- **main** — everything lands here via PR. Never edited directly.
- **test** — staging mirror; receives `main` via promotion PR; auto-deploys.
- **prod** — production; receives `test` via promotion PR; auto-deploys.

## GOLDEN RULES (non-negotiable)
1. **Never commit or push directly to `main`, `test`, or `prod`.** GitHub
   rulesets enforce this — direct pushes are rejected. Work only on feature
   branches.
2. **One worktree = one branch = one task.** Use the `EnterWorktree` tool (or
   `git worktree add`) so each task is an isolated folder. Never run two agents
   in the same working tree.
3. **All changes reach `main` through a Pull Request** with green CI. Solo dev:
   0 approvals required, so you self-merge once CI passes.
4. **Promote, don't rewrite.** main→test→prod move only via fast-forward
   promotion PRs. No force-pushes, no direct edits to environment branches.

## Worktree lifecycle ("how to complete one")
1. Create — `EnterWorktree` (branches off main) → isolated folder.
2. Work — build + commit on the feature branch.
3. Setup — in the worktree: `cd apps/web && npm install`; run dev on a free
   port: `npm run dev -- -p 3001` (main's demo holds :3000).
4. PR — `git push -u origin <branch>` then `gh pr create --base main`. CI must
   pass; review (`/code-review` runs CodeRabbit).
5. Merge — `gh pr merge --squash`.
6. **Complete** — remove the worktree: `ExitWorktree` (remove), or
   `git worktree remove <path> && git branch -d <branch>`. No leftover state.

## Promotion (deploy)
```
gh pr create --base test --head main --title "Promote to test"   # → merge → staging deploys
# QA the test URL, then:
gh pr create --base prod --head test --title "Promote to prod"   # → merge → production deploys
```

## Quality gate
Before opening a PR, locally: `npm run lint && npm run typecheck && npm run build`
(from `apps/web`). CI runs the same on every PR; the `web (lint · typecheck ·
build)` check is required to merge to any protected branch.

## Conventions
- Strict TypeScript; keep `tsc --noEmit` clean.
- Prettier-formatted (`npm run format`); ESLint `next/core-web-vitals`.
- Match existing code style; green only goes to verified/success states
  (brand rule — see `brand/brand-notes.md`).

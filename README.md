# TrackTub

The dispute-grade **evidence layer for short-term-rental hot-tub turnovers** (B2B SaaS).
TrackTub captures tamper-evident proof of each turnover — server-timestamped photos and an
audit log — so operators can resolve guest disputes and prove the tub was serviced.

## Status

Build-first. The app in [`apps/web`](apps/web) is a clickable thin-MVP **demo**
(Next.js 15, localStorage, no backend) that serves as the **UX/design reference**.
v1 is a schema-first rebuild on **Supabase** (Postgres + RLS + Auth + Storage + server
timestamps + audit log), built on feature branches.

## Repo layout

| Path | What |
|------|------|
| `apps/web` | Next.js 15 app (the demo today; v1 backend lands here) |
| `brand/` | Identity spec, tokens, logo/icon SVGs |
| `docs/` | PRD (product source of truth), design specs, validation collateral |
| `.github/workflows/ci.yml` | CI: install → lint → typecheck → build |

## Development

```bash
cd apps/web
npm install
npm run dev          # http://localhost:3000
```

Quality gate (run before opening a PR; CI runs the same):

```bash
npm run lint && npm run typecheck && npm run build
```

## Branch & deploy model

Code flows one direction via pull requests — never push directly to a protected branch:

```
feature branch → main (trunk) → test (staging) → prod (production)
```

`main → test → prod` move only via fast-forward promotion PRs.

## Contributing

Read [`CLAUDE.md`](CLAUDE.md) first — it holds the contributor/agent guide, the golden
rules (one worktree = one branch = one task), and the full worktree → PR → promotion
workflow. Product decisions live in [`docs/PRD.md`](docs/PRD.md); the visual spec lives
in [`brand/`](brand).

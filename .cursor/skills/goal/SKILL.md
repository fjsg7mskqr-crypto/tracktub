---
name: goal
description: >-
  TrackTub go-to-market workflow: ship a local-viewable rough draft, then SEO and
  a correlated marketing plan (posting channels, content, growth), interview
  recruitment for 15–20 STR operators with go/no-go gates, and enterprise MVP
  standards. Use when the user invokes /goal, asks for marketing plan, SEO,
  interview outreach, validation before build, or local draft before launch.
disable-model-invocation: true
---

# /goal — Draft, SEO, marketing, interviews, MVP gates

End-to-end workflow for **TrackTub** (STR-operator beachhead: guest-ready hot tub proof). Do not edit plan files in `.cursor/plans/`.

## Phase 0 — Read context (5 min)

1. Read [`docs/validation/positioning.md`](../../docs/validation/positioning.md) and [`docs/validation/interview-script.md`](../../docs/validation/interview-script.md).
2. If `apps/web` exists, skim landing routes and `package.json` for stack alignment.
3. Copy progress checklist into your reply and update as you go.

## Phase 1 — Local rough draft (do this first)

**Goal:** Something the user can open in a browser **before** SEO polish or paid ads.

1. If no web app yet, scaffold minimal Next.js under `apps/web` (or extend existing).
2. Build a **single-route marketing draft** at `/draft` or root `/` with:
   - Headline from positioning: guest-ready hot tub proof for STR operators
   - 3 benefit bullets (compliance, dispute trail, multi-property cockpit)
   - Placeholder hero + CTA (“Book a pilot” / waitlist form stub)
   - Footer: privacy + “photos are human-confirmed” trust line
3. Run `npm install` and `npm run dev` in `apps/web`; confirm URL (default `http://localhost:3000`).
4. Tell the user exactly how to view locally and what is still placeholder.

**Do not** claim SEO-complete until Phase 2.

## Phase 2 — SEO assessment and marketing plan

Produce or update **`docs/marketing/seo-and-growth-plan.md`** using the template in [marketing-reference.md](marketing-reference.md).

### SEO minimum (technical + content)

| Area | Requirement |
|------|-------------|
| Metadata | Unique `title`, `description`, canonical per public page |
| Structure | One `h1`, logical `h2`/`h3`, semantic HTML |
| Keywords | Primary: STR hot tub turnover / guest-ready documentation; avoid generic “maintenance app” |
| Performance | LCP-friendly images, no blocking scripts on landing |
| Schema | `Organization` + `SoftwareApplication` JSON-LD on landing |
| Indexing | `sitemap.xml`, `robots.txt`; noindex on `/app`, `/dashboard`, auth |
| Local | Optional `LocalBusiness` only if real address; else skip |
| Analytics | Plausible/PostHog/GA4 events: `cta_click`, `pilot_request`, `waitlist_submit` |

### Marketing plan must include

- **Positioning** tied to product (not generic wellness)
- **Where to post** (ranked channels with audience fit)
- **How to post** (format, frequency, CTA, compliance)
- **What to include** per channel (hooks, proof, Loom demo link)
- **Follower/attention** tactics that fit B2B STR (not consumer viral)
- **Metrics** and kill criteria aligned with validation playbook
- **Correlation table**: marketing message → app feature → interview question

Deliver the plan file path and a 1-paragraph executive summary in chat.

## Phase 3 — Find 15–20 interview targets (critical)

Full playbook: [interview-recruitment.md](interview-recruitment.md).

### Go/no-go rule (user-defined gate)

| Outcome after 20 outreach + 15 completed interviews | Action |
|-----------------------------------------------------|--------|
| ≥5 with `pilot_yes` or `pain_high` + workaround | Proceed: concierge pilot → MVP |
| 3–4 weak maybes | Narrow niche or change channel; 2 more weeks |
| &lt;3 interested, no pain | **Pivot** beachhead (service companies) or **shutdown** |

Log every contact in [`docs/validation/interview-log.csv`](../../docs/validation/interview-log.csv).

### Airbnb / listing outreach — mandatory policy

**Do not** use Airbnb guest messaging, host inbox scraping, or listing-page email harvest for cold outreach. That violates [Airbnb Terms](https://www.airbnb.com/help/article/2908) (unsolicited commercial contact), harms deliverability, and burns trust.

**Allowed research use of listings:** identify markets/properties that **advertise hot tubs** → find the **operator** off-platform (company site, LinkedIn, Google Business, state STR registry where public).

**Preferred outreach:** LinkedIn connection note, business email from public site, STR Facebook/Discord groups, BiggerPockets, local host meetups, PM associations. Templates: [outreach-templates.md](outreach-templates.md).

## Phase 4 — Enterprise MVP alignment

When moving from validation to build, enforce:

- **Monorepo:** `apps/web`, `packages/shared`, `supabase/` migrations + RLS
- **Security:** RLS per org; staff see assigned properties only; audit log for tag changes
- **AI:** Vision labels are **suggestions**; human confirm required
- **Roles:** owner/manager, staff, viewer (optional)
- **Observability:** structured logs, error boundary, env-based secrets
- **Scope:** ship turnover + dashboard + reminders before native app or integrations

Cross-check against TrackTub plan todos; do not expand scope until pilots renew.

## Phase 5 — Handoff checklist

Before marking work complete:

- [ ] User can view rough draft locally
- [ ] `docs/marketing/seo-and-growth-plan.md` exists and is actionable
- [ ] Interview sourcing doc read; outreach templates ready
- [ ] Airbnb-DM anti-pattern explicitly communicated to user
- [ ] `interview-log.csv` has header + example row if empty
- [ ] Go/no-go thresholds restated in summary

## Additional resources

- [marketing-reference.md](marketing-reference.md) — SEO checklist, channel matrix, content calendar
- [interview-recruitment.md](interview-recruitment.md) — 15–20 targets, quotas, scripts
- [outreach-templates.md](outreach-templates.md) — DM/email copy (compliant)

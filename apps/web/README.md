# TrackTub — thin-MVP demo (local)

A clickable demo of the TrackTub **thin MVP** (PRD §8.0): guided hot-tub turnover
capture → operator cockpit → shareable, tamper-evident **proof link**, plus a
founder **Insights** dashboard and the **$12/mo WTP fake-door**.

No backend, no accounts, no secrets — all state is seeded mock data in your
browser's `localStorage`. Built to demo, not to ship.

## Run it

```bash
cd apps/web
npm install        # already done if you see node_modules/
npm run dev
# open http://localhost:3000
```

> The dev server may already be running from this session on port 3000.

## 60-second demo script

1. **Cockpit** (`/`) — see 3 properties, statuses, alerts, open issues.
2. **Switch role** (top-right) to **Maria — Cleaner**. You now see only her
   assigned properties.
3. Open a property that **needs a turnover** → **New turnover** → walk the
   4-shot guided flow (Wide → Waterline → Panel → Cover). On the Waterline or
   Panel step, tick **"Simulate an issue"** to see the AI flow.
4. On **Review**: the photo-completeness check passes; confirm or ignore the
   **AI-suggested** tags (AI suggests, human confirms); add notes; **Submit &
   lock**.
5. You land on the **locked turnover record**. Switch back to **Operator**,
   then **Share with owner** / **Guest** and **Copy** the **proof link**.
6. Open the **proof link** (`/proof/...`) — the public, no-login,
   "Verified by TrackTub" view a disputing owner/guest would see. Opening it
   logs a **recipient open** (the wedge signal).
7. **Insights** (`/insights`) — activation, **proof-share rate**, opens, and
   **WTP intents** mapped to the PRD gates, live from what you just did.
8. **Add property** (`/add-property`) — the **$12/mo fake-door**; submitting
   logs willingness-to-pay intent (shows on Insights).
9. **Reset** (top-right) restores the seed any time.

## What's real vs. mocked

| Real in the demo | Mocked / flagged in-UI |
|---|---|
| Guided capture, cockpit, locked records, shareable proof link, share + open tracking, role-scoped views, WTP fake-door, live insights | Photos (generated placeholders), AI tag-suggest + completeness, chemistry bather-load reminder, signed PDF, geofence badge — all labeled `roadmap mock` / `fast-follow` |

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · hand-rolled CSS design system.
Data layer: `src/lib/{types,store,seed,selectors}.ts`. The real build swaps the
localStorage store for Supabase (Postgres + Auth + RLS) per the PRD.

See [`../../docs/PRD.md`](../../docs/PRD.md) and the design spec in
[`../../docs/superpowers/specs/`](../../docs/superpowers/specs/).

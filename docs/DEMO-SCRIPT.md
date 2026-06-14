# TrackTub — demo script

A one-page click-through for the local, seeded demo. Runs entirely against the
**local** Supabase stack — no prod data is touched. Total time: ~5 minutes.

> The seed builds the **Cascade Stays** workspace (3 Big Bear properties) with
> before/after photo sets, water-chemistry trends, shared proof links with
> recipient opens, and an unread "ready" notification waiting for the host. The
> dashboard is designed to tell a story at a glance — see the badge legend below.

## 0 · Boot the demo

```bash
bash apps/web/scripts/tt-demo.sh reset
```

This wipes the local DB, re-applies migrations, re-seeds, and serves at
**http://localhost:3001**. Wait for `✓ Demo ready`. Open the URL.

> Sign-in uses the **"Local demo"** buttons on `/login` (`Host` / `Cleaner`) —
> no Google needed. They post to `/dev/login?as=host|cleaner` with the
> generated demo password (dev-only).

## 1 · The cleaner does a turnover

1. `/login` → **Local demo → Cleaner** (Maria). You land on the cleaner home —
   a tap-a-tub list scoped to her assigned property.
2. Tap **Ridgeline A-Frame** → **Capture** (`/p/<id>/new`). Walk the wizard in order:
   - **Before** — the single "as found" shot. *Point out:* this is the honest
     baseline; one photo, no staging.
   - **Water check** — enter pH `7.4`, sanitizer `4`, temp `101`. *Point out:*
     chemistry is captured live, in range.
   - **After** — the 4-slot guided set (wide / waterline / panel / cover).
   - **Review & submit** → submit. *Point out:* the turnover **locks** —
     server-timestamped, tamper-evident, with a shareable **proof link**.

## 2 · The host gets notified

3. Sign out → `/login` → **Local demo → Host** (Ethan). On the dashboard (`/`),
   the **"… turned over — guest-ready"** banner is already waiting (seeded
   unread `turnover_ready` notification). *Point out:* the host never had to be
   on-site — they just got told the tub is ready.
4. Click into that turnover (`/t/<id>`). *Point out:* before-vs-after side by
   side, the locked seal, water reading, and the **proof link**.
5. Hit **Copy proof link** — this is the deliverable they'd send a guest or owner.

## 3 · The recipient opens the proof

6. Paste the copied `/proof/<token>` link into an **incognito window** (no login).
   *Point out:* a guest/owner sees the evidence — photos, timestamp, chemistry —
   with no account. Opening it is recorded (feeds Insights "opens").

## 4 · Tour the cockpit (as host)

7. **Dashboard** (`/`) — read the badges across the 3 properties:
   - **Ridgeline A-Frame** → `● Guest-ready` (clean, healthy chemistry).
   - **Lakeview Cabin 4** → `Urgent` + open issue (`water_cloudy`) +
     `Shock due` (back-to-back recent stays drove bather load).
   - **Pine Chalet** → `Low sanitizer` (a single dip; re-dosing).
8. **Chemistry** (`/chemistry`) — multi-point pH / sanitizer / temp trends per
   property. *Point out:* Ridgeline steady in range, Lakeview sanitizer trending
   down into shock-due.
9. **Team** (`/team`) — coverage strip + recent activity. *Point out:* Maria is
   assigned to Ridgeline and her capture shows in this week's activity; invites
   are self-serve.
10. **Insights** (`/insights`) — non-zero tiles: turnovers logged, 4-photo
    complete rate, proof links **shared**, recipient **opens**, open issues.
    *Point out:* every metric is live from the records you just walked.

## Reset between runs

Re-run `bash apps/web/scripts/tt-demo.sh reset` for a clean slate. `tt-demo stop`
stops the local stack and reverts dev to `.env.local`.

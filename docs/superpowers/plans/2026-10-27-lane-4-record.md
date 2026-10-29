# Lane 4 — Record + Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build screens 9 (the record: operator `/records/[id]`, owner `/proof/[token]`) and 10 (Reports: history report + Sent list) from one shared `RecordView`.

**Architecture:** A pure `buildRecord()` turns one turnover query row into a `RecordModel` (all formatting, ranges, partial status decided there, unit-tested). `RecordView({ visit, audience })` only renders a model. Both record routes load with the same select string from `load-record.ts`. Reports gets two more pure helpers (`buildSentList`, `historyVisits`) over plain query rows. All signed-in pages stay dynamic (they read the session).

**Tech Stack:** Next.js 16.3 App Router (server components), React 19, Supabase JS, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-27-app-rebuild-design.md` §9, §10, Visual system. Master plan: `docs/superpowers/plans/2026-10-27-app-rebuild.md` (Global Constraints, Route contract, Lane 4). Mockup screens: `Record.dc.html`, `Reports.dc.html` (vault `40 Brand/App mockup 2026-10/`).

## Global Constraints

- Everything in the master plan's Global Constraints applies (PR flow, D23 copy, colours, Archivo, 44px taps, dynamic pages).
- Lane 4 never edits `supabase/migrations/`, `src/lib/supabase/types.ts`, `AppShell`, `TabBar`, `Shell`, `app-tokens.css` or `csp.ts`. Needs there go to the coordinator.
- Banned in any rendered copy (D23): `verified`, `tamper-proof`, `dispute-grade`, `immutable` (case-insensitive).
- Owner record is white: page `#FFFFFF`, text `#08090A`, secondary `#5A5F6A`, body `#2B2F36`, panel `#F6F7F8`, out-of-range found value `#9A5B00`, tick/locked `#0A7A55` on `#E6F6EF`, owner-flag panel `#FDF3E1` with heading `#7A4A00`, brand `#1D4ED8`.
- Footer copy, verbatim: "Photos taken live in the TrackTub camera. Times stamped by TrackTub's server; the record was locked when submitted and can't be edited."
- Times: every displayed time goes through `src/lib/time.ts` (`APP_TIME_ZONE` = `process.env.TRACKTUB_TIME_ZONE ?? "America/Detroit"`). Server rendering on Vercel is UTC; never call `toLocaleString` without the zone.
- Decisions from the coordinator (2026-10-27):
  - **Sent** = a `proof_event` row with `kind = 'share_copied'` exists for the turnover (inserted by Send/Copy via `recordProofShare`); sent time = its earliest `occurred_at`. **Opened** = any `share_view` row.
  - **For the owner** = `turnover.owner_flag` (text, null = render nothing), added by a Lane 1 follow-up (migration `20261028120500`). Until it is in `types.ts`, the loader doesn't select it.
  - Client name for anon (`/proof`) is on hold for founder sign-off of an anon `client` policy; the owner view renders without it when the embed is null.
  - `/t/[id]` is deleted in Lane 4's last PR, once `/visits/[id]` is on `main` and nothing links to `/t/`.

## Review Focus

1. **A record with nothing logged** (no reading, no photos, no work): renders "—" cells, "No photos", "Partial" with the missing list, never `NaN`, "Invalid Date" or a crash. Test: `buildRecord` `empty visit` + RecordView `empty visit renders`.
2. **Times near midnight UTC:** a visit at 23:30 Detroit time shows that date and time, not tomorrow's UTC. Test: `time.ts` `formats in APP_TIME_ZONE across UTC midnight`.
3. **Share sheet missing or cancelled** (desktop Safari, user taps Cancel): Send falls back to copying; a cancel (`AbortError`) is silent and does not count as sent. Test: `RecordShareActions` `falls back to copy` + `cancel does not record a send`.
4. **`record_share_view` failing** (network, RLS): the owner page still renders. Test: proof page `renders when the view RPC errors`.
5. **Locked visit with no share token yet** (Lane 2 sets it at lock; older rows may not): operator view shows "No link yet" and disables Send/Copy. Test: `/records/[id]` page `no share token`.

---

## File structure

| File | Responsibility |
|---|---|
| `src/lib/time.ts` | Shared (all lanes): `APP_TIME_ZONE`, `formatTime`, `formatDate`, `formatShortDate` |
| `src/components/record/record-model.ts` | `RecordRow` → `RecordModel`; partial detection; work/added lines |
| `src/components/record/load-record.ts` | `RECORD_SELECT`, `loadRecordById`, `loadRecordByToken`, `nextDueLine` input query |
| `src/components/record/RecordView.tsx` | Renders a `RecordModel` for `operator` or `owner` |
| `src/components/record/RecordShareActions.tsx` | Client: Send to owner (share sheet) / Copy link |
| `src/components/record/record.css` | White record + `@media print` (hides operator bar and tab bar area) |
| `src/app/records/[id]/page.tsx` + `error.tsx` | Operator record |
| `src/app/proof/[token]/page.tsx` | Owner record + `record_share_view` |
| `src/app/reports/page.tsx` | Reports: history picker + Sent list |
| `src/app/reports/history/page.tsx` + `error.tsx` | History report page |
| `src/components/record/reports-model.ts` | `buildSentList`, `historyVisits` |
| tests | `tests/time.test.ts`, `tests/record/*.test.ts(x)` |

---

### Task 1: Shared time helpers (PR 1, with this plan)

**Files:** Create `src/lib/time.ts`, `tests/time.test.ts`.

**Produces:**
```ts
export const APP_TIME_ZONE: string;                    // env TRACKTUB_TIME_ZONE ?? "America/Detroit"
export function formatTime(d: Date | string | null, tz?: string): string;      // "9:42 AM"; "—" for null/invalid
export function formatDate(d: Date | string | null, tz?: string): string;      // "Mon Oct 26, 2026"; "—"
export function formatShortDate(d: Date | string | null, tz?: string): string; // "Oct 26"; "—"
```

- [ ] **Step 1: Failing tests:** `formatTime("2026-10-26T13:42:00Z") === "9:42 AM"`; `formatDate("2026-10-26T13:42:00Z") === "Mon Oct 26, 2026"`; `formats in APP_TIME_ZONE across UTC midnight` (`"2026-10-27T03:30:00Z"` → date `"Mon Oct 26, 2026"`, time `"11:30 PM"`); `formatShortDate` → `"Oct 26"`; null and `"nope"` → `"—"` for all three; explicit `tz = "UTC"` → `"1:42 PM"`.
- [ ] **Step 2:** `npx vitest run tests/time.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement with `Intl.DateTimeFormat("en-US", { timeZone, ... })`; build the date string from `formatToParts` so the comma placement is exactly `Mon Oct 26, 2026` (weekday, no comma after it).
- [ ] **Step 4:** Tests pass; `npm run lint && npm run typecheck`.
- [ ] **Step 5:** PR "lane 4: plan + shared time helpers", green, squash-merge; comment "src/lib/time.ts merged" on #325 and #326; tick "Lane plan written" on #327.

### Task 2: Record model

**Files:** Create `src/components/record/record-model.ts`, `tests/record/record-model.test.ts`.

**Consumes:** `READING_FIELDS`, `READING_TARGETS`, `inRange` (`src/lib/readings.ts`); `CLEANING_STEPS` (`src/lib/types.ts`); `treatmentLabel` (`src/lib/chemistry.ts`); `photoPublicUrl`; Task 1 formatters.

**Produces:**
```ts
export type RecordRow = {            // one turnover with embeds, normalised (arrays → first)
  id: string; status: string; created_at: string; submitted_at_server: string | null;
  share_token: string | null; notes: string | null; cleaning_steps: string[];
  owner_flag?: string | null;
  property: { id: string; name: string; address: string | null; client: { name: string } | null } | null;
  submitter: { full_name: string | null; email: string } | null;
  photos: { slot: string; phase: string; storage_path: string | null; captured_at: string | null; created_at: string }[];
  water: (WaterRow) | null;          // found columns + left_* + found_recorded_at, left_recorded_at, recorded_at, treatments, treatment_note
};
export type WaterLine = { field: ReadingField; label: string; found: string; left: string; target: string; foundInRange: boolean | null; leftInRange: boolean | null };
export type RecordModel = {
  id: string; recordId: string;                 // "TT-" + first 8 hex of id, uppercased
  tub: string; client: string | null; address: string | null;
  date: string; operator: string; span: string; // "9:42 – 10:58 AM" style via formatTime pair; "—" parts when missing
  locked: boolean; lockedAt: string | null;     // formatTime(submitted_at_server) when status = submitted_locked
  water: { foundAt: string | null; leftAt: string | null; lines: WaterLine[]; any: boolean };
  photos: { label: string; time: string; url: string }[];
  added: string[]; work: { label: string; done: boolean }[];
  ownerFlag: string | null; notes: string | null;
  partial: string[];                            // missing items; [] = complete
  shareToken: string | null;
};
export const WORK_LABELS: Record<string, string>;          // done labels: "Cleaned filter", "Wiped down", "Replaced filter", "Drained & refilled", "Topped off", "Cleaned cover"
export function buildRecord(row: RecordRow): RecordModel;
```
Decisions: operator = `full_name` → first name + last initial ("Ethan N."), else email, else "—". Short labels `Alk`, `pH`, `Hard`, `Cl`; values with `READING_TARGETS[f].decimals`, "—" when null; target `"80–120"` (en dash). Photos: before/full_frame → "Before", after/full_frame → "After", after/cover → "Cover on", others → `PHOTO_SLOT_LABELS`; ordered before → after → cover → rest; time from `captured_at ?? created_at`; rows without `storage_path` skipped. Work: ticked steps in `CLEANING_STEPS` order with `WORK_LABELS`, then `{ label: "Not drained", done: false }` when `drained_refilled` isn't ticked. Added: `treatmentLabel` per code, then non-empty `treatment_note` lines. Partial missing list, in order: "Reading as found" (all found values null), "Reading as left" (all left null), "Before photo", "After photo", "Cover photo".

- [ ] **Step 1: Failing tests** (fixture = the mockup visit): span `"9:42 – 10:58 AM"`, `lockedAt "10:58 AM"`, pH line `{ found: "8.0", left: "7.5", foundInRange: false, leftInRange: true, target: "7.2–7.8" }`, Cl `found "0.5"`, photos labels `["Before","After","Cover on"]` with times, work `["Cleaned filter","Wiped down","Not drained"]` (last `done: false`), `recordId` format `/^TT-[0-9A-F]{8}$/`, `partial` `[]`; `empty visit` → all lines "—", `photos []`, `partial` lists all five, `span` contains no "Invalid"; `drained visit has no "Not drained"`; operator name formats; `draft is not locked` (`locked false`, `lockedAt null`).
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** pass. **Step 5:** commit (ships with Task 3).

### Task 3: RecordView + operator page `/records/[id]` (PR 2)

**Files:** Create `src/components/record/RecordView.tsx`, `RecordShareActions.tsx`, `record.css`, `load-record.ts`, `src/app/records/[id]/page.tsx`, `src/app/records/[id]/error.tsx`; tests `tests/record/record-view.test.tsx`, `tests/record/share-actions.test.tsx`, `tests/record/records-page.test.tsx`.

**Produces:**
```ts
export function RecordView(props: { visit: RecordModel; audience: "operator" | "owner"; shareUrl?: string | null; backHref?: string; nextDue?: string | null }): JSX.Element;
export function RecordShareActions(props: { turnoverId: string; url: string | null; tub: string }): JSX.Element; // "use client"
export const RECORD_SELECT: string;
export async function loadRecordById(supabase, id: string): Promise<RecordRow | null>;
export async function loadRecordByToken(supabase, token: string): Promise<RecordRow | null>; // status = submitted_locked only
export function proofUrl(origin: string, token: string): string;   // `${origin}/proof/${token}`
```
Layout per `Record.dc.html`: operator gets the dark bar (back link to `tubPath(property.id)` labelled with the tub name; Send to owner `#2563EB` + Copy link `#191B20` pills, 48px; "Below is exactly what the owner sees."). Then the white record: "Track**Tub** record" masthead, h1 tub, "client · date", "Serviced by X · span", Locked badge (or "Draft" grey badge when not locked), Partial note (amber panel listing missing items) when `partial.length`, Water table (header "Found h:mm" / "Left h:mm" / "Target"; ✓ in `#0A7A55` after an in-range left value; out-of-range found in `#9A5B00`; "No reading logged" when `!water.any`), Photos grid (3 cols, `<img>` + "Label · time"), Added | Work two-column, For the owner panel (only when `ownerFlag`), Notes (only when set), footer (copy above; then "Next due … · Record TT-… · host/proof/token" omitting missing parts). `record.css`: `@media print { .tt-record-operator { display: none } }` and white page background for print.
Send to owner: `navigator.share({ title: "<tub> record", url })`; no `navigator.share` → copy instead; `AbortError` → nothing. Copy link: `navigator.clipboard.writeText(url)`, toast "Link copied" (or "Copy failed — long-press the link" on error). Each successful send/copy calls `recordProofShare(turnoverId)`. `url === null` → both buttons disabled and "No link yet".
Page: `getCurrentMembership()` → redirect `/login`; `loadRecordById`; null → `notFound()`; origin from `getURL()`; `nextDue` = null for now (filled in Task 6).

- [ ] **Step 1: Failing tests:**
  - `record-view`: operator renders Send/Copy and "Below is exactly what the owner sees."; owner renders neither; footer copy verbatim; `For the owner` absent when `ownerFlag` null and present with text; Partial note lists missing items; `empty visit renders`; **`no banned words`** — `renderToStaticMarkup` of operator and owner views for full + empty fixtures, lower-cased, contains none of the four D23 words.
  - `share-actions`: share called with `{ url }` and `recordProofShare` called; `falls back to copy` when `navigator.share` undefined; `cancel does not record a send` (share rejects `DOMException AbortError` → `recordProofShare` not called); `url null` → buttons disabled.
  - `records-page` (mock `@/lib/supabase/server`, `@/lib/auth`, `next/navigation`): renders tub name for a found row; `no share token` → "No link yet"; missing row → `notFound` called.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** `npm test && npm run lint && npm run typecheck && npm run build`.
- [ ] **Step 5:** PR "lane 4: RecordView + /records/[id]"; tick RecordView + /records on #327.

### Task 4: Owner record on `/proof/[token]` (PR 3)

**Files:** Modify `src/app/proof/[token]/page.tsx`; test `tests/record/proof-page.test.tsx`.

Page: `loadRecordByToken` (anon client); null → `notFound()`; `await supabase.rpc("record_share_view", { p_token: token })` once inside try/catch, result error ignored; keep the existing `record_proof_open` call the same way; render `<main className="tt-record-page">` + `RecordView audience="owner"`. Metadata: `robots: { index: false }`. No imports from `src/app/t/`.

- [ ] **Step 1: Failing tests:** `records a view once for a locked turnover` (rpc called exactly once with `("record_share_view", { p_token: "tok" })`, page shows tub name and "TrackTub record"); `renders when the view RPC errors` (rpc rejects → still renders); `unknown token → notFound` (and rpc not called); `no banned words` on the rendered page.
- [ ] **Step 2–4:** fail → implement → pass + full gate.
- [ ] **Step 5:** PR "lane 4: owner record on /proof"; tick on #327.

### Task 5: Reports (PR 4)

**Files:** Create `src/components/record/reports-model.ts`, modify `src/app/reports/page.tsx`, create `src/app/reports/history/page.tsx` + `error.tsx`; tests `tests/record/reports-model.test.ts`, `tests/record/reports-page.test.tsx`.

**Produces:**
```ts
export type SentEventRow = { turnover_id: string; occurred_at: string; turnover: { submitted_at_server: string | null; property: { name: string; client: { name: string } | null } | null } | null };
export type SentItem = { turnoverId: string; title: string; to: string | null; sentAt: string; opened: boolean };  // title "Cedar Cabin · Oct 26", sentAt formatTime(first occurred_at)
export function buildSentList(events: SentEventRow[], openedIds: Set<string>): SentItem[]; // one item per turnover, newest first
export type HistoryPeriod = "last6" | "season";
export function parsePeriod(v: string | undefined): HistoryPeriod;          // default "last6"
export function historyVisits<T extends { submitted_at_server: string | null }>(visits: T[], period: HistoryPeriod, now: Date): T[]; // locked visits newest first; last6 = first 6; season = since Jan 1 of now's year in APP_TIME_ZONE
```
Reports page per `Reports.dc.html`: h1 "Reports"; History card (copy from mockup) with tub chips (`?tub=`), period chips "Last 6 visits" / "This season" (`?period=`), all links (no client JS), selected chip `#1E3A6B`; "Build report" → `/reports/history?tub=&period=` (disabled look with "Add a tub first" when no tubs). Sent section: rows link to `recordPath(id)`; right side "Opened" `#34D399` or "Sent" `#8A8F98`; empty → "Nothing sent yet." Queries: properties (id, name) for the picker; `proof_event` kind `share_copied` with turnover embed, newest 100; `share_view` `turnover_id` `in` those ids.
History page: white printable page (reuses `record.css`), header "TrackTub history report", tub, client, period label, then one row per visit (date, span, found → left pH and Cl, work done, photo count, "Partial" tag) linking to `recordPath`; empty → "No locked visits in this period." Rows come from `RECORD_SELECT` with `property_id = tub` and `status = submitted_locked`, run through `buildRecord`.

- [ ] **Step 1: Failing tests:** `buildSentList` dedupes to earliest `occurred_at`, marks opened, sorts newest first, `to` null when no client; `parsePeriod` default/garbage → "last6"; `historyVisits` last6 caps at 6 and drops drafts (null submitted); `season` excludes Dec 31 of last year (Detroit) and includes Jan 1; reports page renders "Nothing sent yet." with no events and an Opened row when a view exists.
- [ ] **Step 2–4:** fail → implement → pass + full gate.
- [ ] **Step 5:** PR "lane 4: Reports — history + sent"; tick on #327.

### Task 6: Owner flag, next due, retire `/t/[id]` (PR 5, gated)

Gate: `turnover.owner_flag` in `types.ts` on `main` (watch #327), and `/visits/[id]` on `main`.

- [ ] **Step 1: Failing tests:** record-model `owner_flag text shows`; `nextDueLine` (`{ drainedAt, drainDays, filterAt, filterDays }` → earliest of drain/filter due, e.g. "Drain due Jan 24"; null inputs → null); a test that no file under `src/` references `"/t/"` routes.
- [ ] **Step 2:** add `owner_flag` to `RECORD_SELECT`; compute next due in both record pages from the tub's locked visits (`cleaning_steps` contains `drained_refilled` / `filter_replaced`) with `CARE_DEFAULTS` fallbacks; delete `src/app/t/` and move anything still imported from it (`TurnoverGallery`) out or drop it.
- [ ] **Step 3:** full gate, PR "lane 4: owner flag + next due; retire /t/[id]"; tick the last boxes on #327.

# D29 — Logins and property access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Everyone who logs in can do everything on the account; only the account creator (operator) adds, narrows and removes logins; a new login sees every property unless the admin narrows it.

**Architecture:** Two migrations — one additive (`all_properties` flags), one redefining the shared access functions/policies (founder sign-off before it touches the shared DB). The app gets a `/people` screen reached from the Home header avatar, server actions for invite/narrow/remove, and an `/invite/[token]` page that understands "all properties".

**Tech Stack:** Next.js 16 App Router (server components + server actions), Supabase Postgres/RLS, Vitest + Testing Library, local Supabase CLI for the RLS suite.

**Spec:** GitHub issue #362; vault decision `95 Decisions/D29 — One kind of user, the account creator manages logins.md`; app rebuild spec `docs/superpowers/specs/2026-10-27-app-rebuild-design.md`; the coordinator brief (data model + UI section) is the operative detail and is copied into Global Constraints below.

## Global Constraints

- Roles unchanged: `operator` = admin (account creator), `staff` = team login, `owner` untouched and unused. No enum changes.
- Migrations: `20261028120800_login_property_access.sql` (additive) and `20261028120900_one_kind_of_login.sql` (redefinitions), additive first.
- `membership.all_properties boolean not null default true`; `invite.all_properties boolean not null default true` (`property_ids` used only when false). Operators always see everything regardless of the flag.
- Staff get operator-equal writes on `client`, `property`, `org_note`, `task`, `issue_tag`, scoped to properties they can see (client/org_note: any team member of the org). `invite`, `membership`, `org` update, `audit_log`, billing stay operator-only.
- First Google sign-in still self-creates an org + operator membership (untouched).
- DO NOT apply anything to the shared Supabase DB (`slkxwpiiludisrnwnxlg`). Local: `supabase migration up --local` only; no `db reset`.
- D23 copy: never "verified", "tamper-proof", "dispute-grade", "immutable". Plain words: "login", "person", "property/tub".
- Signed-in pages stay dynamic (read the session via `getCurrentMembership()`); every new route segment gets an `error.tsx` (error-boundary-coverage test).
- Match `app-tokens.css` (`--tt-*`) inline-style idiom of Home/Tubs; green (`--tt-ok`) only for success.

## Review Focus

1. A narrowed staff login adds a tub → they must see it afterwards (RLS `insert … returning` would hide it). Covered: AFTER INSERT trigger assigns the creator + the add-tub action inserts with a client-side id and no `returning`; RLS test "narrowed staff adds a tub and then sees it".
2. Admin removes themselves / the last admin → blocked in the action (`removePersonAction` refuses `userId === membership.userId` and operator targets); unit test.
3. Admin narrows a person to zero properties → refused with "Pick at least one property, or turn on All properties"; unit test on `parseAccess`.
4. Re-opening an already-accepted invite as the same user → no-op success (existing idempotency kept); staff of org A gets nothing in org B; RLS tests.
5. A staff login opening `/people` → sees the list, no Add/Edit/Remove controls; and the actions reject non-operators even if called directly; render test + action guard.

---

### Task 1: Migrations + RLS suite

**Files:**
- Create: `apps/web/supabase/migrations/20261028120800_login_property_access.sql`
- Create: `apps/web/supabase/migrations/20261028120900_one_kind_of_login.sql`
- Modify: `apps/web/src/lib/supabase/types.ts` (add `all_properties` to membership + invite Row/Insert/Update; `app_is_team` Function)
- Modify: `apps/web/tests/rls.test.ts`

**Interfaces — Produces (SQL):**
- `app_is_team(p_org uuid) returns boolean` — security definer; caller has an `operator` or `staff` membership in `p_org`.
- `app_can_see_property(p_property)` — operator of org, OR staff of org with `all_properties`, OR a `staff_assignment` row, OR a `property_owner` row.
- `app_can_capture_property(p_property)` — same minus the owner clause.
- Policies (drop old → create new): `client_team_write` (ALL, `app_is_team(org_id)`), `org_note_team_write` (same), `property_team_insert` (check `app_is_team(org_id)`), `property_team_update` (using `app_can_capture_property(id)`, check `app_is_team(org_id)`), `property_team_delete` (using `app_can_capture_property(id)`), `task_write` (using/check `app_can_capture_property(property_id)`), `issue_write` (turnover's property `app_can_capture_property` AND draft).
- Trigger `property_assign_narrowed_creator` AFTER INSERT on `property`: when `auth.uid()` is staff (not operator) of the org with `all_properties = false`, insert `staff_assignment(new.id, auth.uid())`.
- `accept_invite(p_token)` — copies `invite.all_properties` to the new staff membership; inserts `staff_assignment` rows only when it is false; owner path unchanged.
- `get_invite_preview(p_token)` — adds `'all_properties'` to the jsonb.

- [ ] **Step 1: Write failing RLS tests.** Existing setup: insert `staffA` with `all_properties: false` (keeps the "assigned only" cases meaningful as the narrowed mode). Replace "org member (staff) can read org_note but not write" with "staff can write org_note". New `describe("Logins and property access (D29)")`:
  - `staff with all properties sees and can run visits on every org property` — new user + membership staff default; selects both org-A props; `app_can_capture_property` true for both; turnover draft insert on `propUnassigned` succeeds.
  - `narrowed staff sees only assigned` — `staffA` sees `propAssigned`, not `propUnassigned`.
  - `staff can add a tub and a client` — all-props staff inserts client + property (returning) in org A.
  - `narrowed staff adds a tub and then sees it` — insert with explicit id, no returning; then select by id returns 1 row.
  - `staff cannot insert invite or membership` — both error.
  - `staff of org A sees nothing in org B` — property/client select in org B empty; insert property in org B errors.
  - `accept_invite all-properties mode` — invite `all_properties: true, property_ids: []` → membership `all_properties` true, zero staff_assignment rows, sees both props.
  - `accept_invite narrowed mode` — the existing "staff invitee" test with `all_properties: false`; also assert membership flag false.
  - `get_invite_preview reports all_properties`.
  - `operator unaffected` — existing operator tests stay green.
- [ ] **Step 2: Run** `npm run test:rls` against the local stack (env from `supabase status -o env`). Expected: new cases FAIL (column missing).
- [ ] **Step 3: Write both migrations** per Interfaces. Redefinition file starts with a header comment listing every changed shared object (for sign-off).
- [ ] **Step 4: Apply locally** `supabase migration up --local`; update `types.ts` by hand to match.
- [ ] **Step 5: Run** `npm run test:rls` → all PASS; `npm run typecheck` clean.
- [ ] **Step 6: Commit** `feat(db): one kind of login + property access flags (D29)`.

### Task 2: People model + server actions

**Files:**
- Create: `apps/web/src/lib/people.ts` (pure)
- Create: `apps/web/src/lib/actions/people.ts` ("use server")
- Modify: `apps/web/src/lib/actions/invite.ts` (`createInviteAction` gains `allProperties: boolean`)
- Modify: `apps/web/src/app/tubs/new/actions.ts` (insert property with `id: randomUUID()`, no `.select()`)
- Test: `apps/web/tests/people/people-model.test.ts`, `apps/web/tests/people/people-actions.test.ts`

**Interfaces — Produces:**
- `type Person = { userId: string; name: string; email: string; isAdmin: boolean; allProperties: boolean; propertyIds: string[] }`
- `accessLabel(p: Person): string` → `"All properties"` for admin or allProperties, else `"1 property"` / `"N properties"`.
- `parseAccess(fd: FormData): { ok: true; allProperties: boolean; propertyIds: string[] } | { ok: false; error: string }` — reads `all` (`"on"`) and repeated `property`; narrowed with none → `"Pick at least one property, or turn on All properties."`
- `addPersonAction(prev: AddPersonState, fd: FormData): Promise<AddPersonState>`; `AddPersonState = { error: string | null; link: string | null }` — operator-only; email required (simple `@` check → "Enter their email."); creates invite (role staff) and returns `${getURL()}/invite/${token}`.
- `updateAccessAction(userId: string, prev: ActionState, fd: FormData): Promise<ActionState>`; `ActionState = { error: string | null; done: boolean }` — operator-only; target must be staff of the org; sets `membership.all_properties`, deletes the user's `staff_assignment` rows on org properties, inserts chosen ones when narrowed.
- `removePersonAction(userId: string): Promise<{ error: string | null }>` — operator-only; refuses self ("You can't remove yourself.") and operator targets; deletes staff_assignment rows then the membership.
- `revokeInviteAction` (existing) reused for pending invites.

- [ ] **Step 1: Failing tests** — model: `accessLabel` cases (admin, all, 1, 3); `parseAccess` (all on → all true ignoring picks; narrowed with 2 picks; narrowed with none → error). Actions (mock `@/lib/auth`, `@/lib/supabase/server`, `next/cache`): non-operator → `"Only the admin can …"` and no `from` call; remove self refused; add person with bad email refused; add person ok returns a link ending `/invite/<token>`.
- [ ] **Step 2: Run** `npx vitest run tests/people` → FAIL.
- [ ] **Step 3: Implement.** `revalidatePath("/people")` after writes.
- [ ] **Step 4: Run** → PASS; existing `tests/tub/add-tub.test.ts` still PASS.
- [ ] **Step 5: Commit** `feat(people): access model + admin actions (D29)`.

### Task 3: /people screen + Home entry

**Files:**
- Create: `apps/web/src/app/people/page.tsx`, `apps/web/src/app/people/error.tsx`
- Create: `apps/web/src/components/people/load.ts` — `loadPeople(supabase, orgId): Promise<{ people: Person[]; invites: PendingInvite[]; properties: { id: string; name: string }[] }>`; `PendingInvite = { id: string; email: string | null; token: string; allProperties: boolean; propertyIds: string[] }`
- Create: `apps/web/src/components/people/PersonRow.tsx`, `AddPerson.tsx` (client), `EditAccess.tsx` (client), `AccessPicker.tsx` (client), `RemovePerson.tsx` (client), `InviteLink.tsx` (client: copy + share sheet)
- Create: `apps/web/src/lib/copy-text.ts` — `copyText(text: string): Promise<boolean>` moved from `RecordShareActions.tsx` (which imports it)
- Modify: `apps/web/src/app/page.tsx` — header avatar becomes `<Link href="/people" aria-label="People and account">`
- Modify: `apps/web/src/lib/app-routes.ts` — `peoplePath = "/people"` (literal `href` so nav coverage checks it)
- Test: `apps/web/tests/people/people-page.test.tsx`

UI copy: title "People"; subtitle "Everyone here can see tubs, run visits and send records."; admin tag "Admin"; "You" after own name; buttons "Add person", "Edit access", "Remove", confirm "Remove {name}? They lose access right away." with "Remove" / "Cancel"; add form: label "Email", toggle "All properties" (default on), property checkboxes when off, submit "Create invite link"; result: "Send this link to {email}. It works once and expires in 14 days." + "Share" / "Copy link"; pending section "Invited" with "Copy link" / "Cancel invite". Single-login account: just the user's row + quiet "Add person" text button, no "Invited" section when empty.

- [ ] **Step 1: Failing render tests** (fake supabase + mocked auth): single-login operator → one row "Admin", "All properties", button "Add person", no "Remove"; operator with a narrowed staff → "2 properties", "Edit access" + "Remove" on staff row only; staff viewer → sees both rows, no "Add person"/"Edit access"/"Remove"; signed out → redirect.
- [ ] **Step 2: Run** `npx vitest run tests/people` → FAIL.
- [ ] **Step 3: Implement** page + components; Home avatar link.
- [ ] **Step 4: Run** full `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build` → PASS.
- [ ] **Step 5: Commit** `feat(people): People screen from the Home avatar (D29)`.

### Task 4: /invite/[token] for all-properties

**Files:**
- Modify: `apps/web/src/app/invite/[token]/page.tsx`
- Test: `apps/web/tests/people/invite-page.test.tsx`

Preview gets `all_properties: boolean`. Staff copy: badge "Team login"; can-list "See the tubs and run visits" / "Send records to owners"; `all_properties` → "You'll see every property on {org_name}."; narrowed → label "Properties you'll see" + names; footer for narrowed only: "You'll see the properties listed above." Owner branch unchanged.

- [ ] **Step 1: Failing tests** — all-properties preview renders "You'll see every property on Cascade Stays" and no property list; narrowed renders the names.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(invite): invite page shows all-properties access (D29)`.

### Task 5: PR

- [ ] Full quality gate from `apps/web`; push branch; `gh pr create --base main` with the changed-policy list; wait for `web` + `rls` green. Do not merge; do not touch the shared DB.

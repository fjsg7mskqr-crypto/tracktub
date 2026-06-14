# Prod schema changed ahead of reviewed UI (shared DB, via MCP)

| | |
|---|---|
| **Date** | 2026-06-14 |
| **Severity** | Low (no outage, no data loss) |
| **Status** | Mitigated (rule added); cure tracked in #45 |
| **Customer impact** | None (pre-launch) |
| **Data loss** | None |

## Summary
While building the Operations → Maintenance Schedule module (#150 / PR #154), an
agent applied — **directly to the live shared Supabase database via the Supabase
MCP** — both the new `maintenance_task` / `maintenance_log` tables **and a
redefinition of the shared `log_evidence_change()` audit-trigger function**,
ahead of the UI being promoted to test/prod. The change smoke-tested clean and
advisors showed no new findings. Recorded because it's the *class* of change
that can affect live behavior: a redefined audit function runs on **every
turnover submit**, and the schema moved ahead of the reviewed UI.

## Why it happened
All tiers (main/test/prod) **share ONE Supabase database** — there is no staging
DB yet (#45). `main` and `prod` are literally the same database, so any schema a
`main` feature needs *is* a change to the live DB. Migrations don't replay 1:1
from empty, so the established practice is to apply schema to that shared DB via
MCP. There was **no rule distinguishing low-risk additive changes** (new tables)
**from higher-risk changes to shared objects** (functions/triggers/policies on
existing tables).

## Root cause
- Single shared database across all tiers (#45 open — the structural cause).
- The original `log_evidence_change()` assumed every non-turnover table carries
  `turnover_id`; the new maintenance tables carry `property_id`, so inserts would
  have errored. The fix (route `property_id`-carrying tables through a property
  lookup) was **correct** — but it was applied to the live DB with no rule
  requiring sign-off for a shared-object change.

## Impact
None. Pre-launch, no users, change tested clean (local + CI `rls` replay +
Supabase advisors). Logged for the audit trail, not because anything broke.

## Resolution
- The audit-fn fix is correct and live on local + the shared DB; CI `rls` suite
  and advisors are green.

## Prevention — rule added to `CLAUDE.md`
1. Validate **every** schema change on the **local** stack + the **CI `rls`
   replay** before it touches the shared DB.
2. **Additive** changes (new tables/columns, defaulted) may be applied to the
   shared DB via MCP — current practice, low risk.
3. **Changes to SHARED objects** — functions, triggers, RLS policies on existing
   tables, or any `drop`/`alter` of existing schema — must be **flagged to the
   founder for sign-off BEFORE being applied to the shared/prod DB.** These can
   change live behavior.
4. The structural cure is a **separate staging/prod database — #45**
   (launch-blocker). Until then, this rule is the mitigation.

## Follow-ups
- **#45** — staging DB separation (the real fix).

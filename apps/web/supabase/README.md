# Supabase (TrackTub v1 backend)

The **live remote database** is the source of truth — project ref
`slkxwpiiludisrnwnxlg` (`https://slkxwpiiludisrnwnxlg.supabase.co`). It is managed
**via the Supabase MCP**, not the CLI (the CLI pops a macOS Keychain prompt on every
call). The files here mirror what is already applied to that project.

## Migrations

The files in `migrations/` are named with the **exact remote migration versions**,
so this directory matches the cloud's applied history one-to-one:

| File | Remote version · name | Contents |
|---|---|---|
| `20260607022815_core_schema.sql` | `core_schema` | 12 tables + 3 enums + indexes (PRD §10) |
| `20260607022847_rls_policies.sql` | `rls_policies` | RLS helper fns + `enable row level security` + policies (PRD §9) |
| `20260607022901_triggers.sql` | `triggers` | profile-on-signup + turnover immutability lock |
| `20260607023127_harden_functions.sql` | `harden_functions` | pin `search_path`, revoke PUBLIC execute on helpers |
| `20260607031214_immutability_child_guards.sql` | `immutability_child_guards` | extend the locked-turnover immutability to `photo` + `issue_tag` writes |
| `20260608022343_server_authoritative_turnover.sql` | `server_authoritative_turnover` | force `submitter_id`/`submitted_at_server` from the request for end users; `submitter_id = auth.uid()` in the insert policy |
| `20260608022512_audit_log_writer.sql` | `audit_log_writer` | AFTER trigger writes `audit_log` for `turnover`/`issue_tag`/`photo` insert+update; UPDATE-deny makes it append-only |
| `20260608022607_hardening_billing_and_profile.sql` | `hardening_billing_and_profile` | block client writes to `org.plan`/`billing_ref`; coalesce null email on signup |
| `20260608023717_lock_trigger_function_execute.sql` | `lock_trigger_function_execute` | revoke `anon`/`authenticated` EXECUTE on trigger-only functions (clears advisors 0028/0029 for them) |
| `20260608193153_workspace_on_signup.sql` | `workspace_on_signup` | extend `handle_new_user` to also create an `org` + `operator` membership (self-serve signup); backfill existing users; re-lock EXECUTE |
| `20260614140000_scheduled_item.sql` | `scheduled_item` | Operations Schedule backend (#157): scheduled-work table + RLS (capturer-write) + audit-trigger extension + `fulfill_scheduled_turnover` RPC |
| `20260614140100_scheduled_assignment_notifications.sql` | `scheduled_assignment_notifications` | #157: `notification_type 'assigned'` + `notification.scheduled_item_id` + `notify_scheduled_assignment` writer |

To re-apply to a *fresh* project, run them in version order.

## Generating types

Types live in `src/lib/supabase/types.ts`. Regenerate via the MCP
`generate_typescript_types` tool (project `slkxwpiiludisrnwnxlg`) and overwrite that
file — do **not** hand-edit it.

## Notes / known state

- **`ensure_rls` event trigger.** The live DB also has an `ensure_rls` event trigger
  (function `public.rls_auto_enable()`, owner `postgres`) that auto-enables RLS on any
  newly created table — a defense-in-depth measure added outside the tracked migrations.
  It is intentionally **not** reproduced in these files: every M1 table already calls
  `enable row level security` explicitly in `20260607022847_rls_policies.sql`, so the
  schema is fully secured without it.
- **`profile` SELECT is self-only in M1** (`profile_self_select`: `id = auth.uid()`).
  Resolving other people's names (e.g. "submitted by …", an operator's staff roster)
  needs a co-member read path — a `SECURITY DEFINER` `app_shares_org()` helper plus a
  widened policy. That is deferred to M2 (no M1 screen joins `profile`, so nothing is
  broken today). Tracked so it isn't forgotten when M2 cockpit screens land.
- **Remaining security-advisor WARNs** are low-risk and expected: the `app_*` RLS
  helper functions are `SECURITY DEFINER` and callable by the `authenticated` role
  (required for policy evaluation). They are all `auth.uid()`-scoped. A full fix
  (moving helpers to a private schema) is deferred.

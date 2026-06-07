# Supabase (TrackTub v1 backend)

The **live remote database** is the source of truth — project ref
`slkxwpiiludisrnwnxlg` (`https://slkxwpiiludisrnwnxlg.supabase.co`). It is managed
**via the Supabase MCP**, not the CLI (the CLI pops a macOS Keychain prompt on every
call). The files here mirror what is already applied to that project.

## Migrations

The four files in `migrations/` are named with the **exact remote migration versions**,
so this directory matches the cloud's applied history one-to-one:

| File | Remote version · name | Contents |
|---|---|---|
| `20260607022815_core_schema.sql` | `core_schema` | 12 tables + 3 enums + indexes (PRD §10) |
| `20260607022847_rls_policies.sql` | `rls_policies` | RLS helper fns + `enable row level security` + policies (PRD §9) |
| `20260607022901_triggers.sql` | `triggers` | profile-on-signup + turnover immutability lock |
| `20260607023127_harden_functions.sql` | `harden_functions` | pin `search_path`, revoke PUBLIC execute on helpers |

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
- **Remaining security-advisor WARNs** are low-risk and expected: the `app_*` RLS
  helper functions are `SECURITY DEFINER` and callable by the `authenticated` role
  (required for policy evaluation). They are all `auth.uid()`-scoped. A full fix
  (moving helpers to a private schema) is deferred.

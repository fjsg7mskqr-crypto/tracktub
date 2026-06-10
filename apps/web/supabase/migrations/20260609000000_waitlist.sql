-- Public waitlist signups captured from the marketing landing (/landing).
--
-- Anonymous (and signed-in) visitors may INSERT a signup with a basic
-- email-shape check; there is intentionally NO select/update/delete policy, so
-- RLS returns zero rows for the API and the email list can only be read via the
-- Supabase dashboard / service role. Keeps leads private while letting the
-- public page capture them. Applied to the remote project via the Supabase MCP;
-- this file keeps a fresh local stack (`supabase start`) in sync.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'landing',
  created_at timestamptz not null default now()
);

-- one signup per email, case-insensitive
create unique index if not exists waitlist_email_key on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

drop policy if exists "waitlist_insert" on public.waitlist;
create policy "waitlist_insert" on public.waitlist
  for insert to anon, authenticated
  with check (
    char_length(email) between 3 and 320
    and position('@' in email) > 1
    and position('.' in split_part(email, '@', 2)) > 0
  );

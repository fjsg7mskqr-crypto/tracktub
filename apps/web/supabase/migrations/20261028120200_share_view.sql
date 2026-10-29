-- share_view: when a record's share link was opened (app rebuild, Lane 1 task
-- 1.3). A separate append-only table because turnover_lock_guard rejects every
-- update to a locked turnover, and only locked records are shared.
-- ADDITIVE ONLY: a new table, its policy, and a new function. Nothing existing
-- changes.
create table share_view (
  id          uuid primary key default gen_random_uuid(),
  turnover_id uuid not null references turnover(id) on delete cascade,
  opened_at   timestamptz not null default now()
);
create index on share_view (turnover_id, opened_at);

alter table share_view enable row level security;

-- Read: whoever can see the turnover's property (same gate as turnover_select).
-- No insert/update/delete policy for anyone — rows are written only by
-- record_share_view below.
create policy share_view_select on share_view for select to authenticated
  using (
    exists (
      select 1 from turnover t
      where t.id = turnover_id and app_can_see_property(t.property_id)
    )
  );

-- Called by /proof/[token] on each page load. Records an open only for a token
-- anon can actually view (locked + shared, as turnover_public_proof); an
-- unknown or draft token is a no-op. Repeat opens of the same record within a
-- minute collapse into one row, so a reload loop can't flood the table.
create or replace function record_share_view(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turnover uuid;
begin
  select t.id into v_turnover
  from turnover t
  where t.share_token = p_token
    and t.status = 'submitted_locked';

  if v_turnover is null then
    return;
  end if;

  if exists (
    select 1 from share_view sv
    where sv.turnover_id = v_turnover
      and sv.opened_at > now() - interval '1 minute'
  ) then
    return;
  end if;

  insert into share_view (turnover_id) values (v_turnover);
end;
$$;

revoke execute on function public.record_share_view(text) from public;
grant execute on function public.record_share_view(text) to anon, authenticated;

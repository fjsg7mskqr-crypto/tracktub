-- Record server times (#389): a server receive time on every photo, and the
-- real moment a visit was locked.
--
-- WHY: photo.captured_at is the phone's clock (client-sent), and photo.created_at
-- keeps the FIRST shot's time after a retake. The record's "Locked" badge read
-- turnover.submitted_at_server, which is stamped on INSERT — i.e. when the visit
-- STARTED, not when it was locked.
--
-- WHAT:
--   photo.received_at    — server time the current shot reached us. Default
--                          now(); restamped whenever storage_path changes (a
--                          retake). End users cannot set it.
--   turnover.locked_at   — server time status became submitted_locked. End
--                          users cannot set it.
-- Same server-authority rule as set_turnover_server_fields()
-- (20260608022343): only override when a real end user is acting (JWT sub);
-- trusted server-side callers (service_role / no JWT) keep control so
-- backfills, imports and the test harness can set these explicitly.
-- submitted_at_server is NOT changed (proof_events / scheduled_item use it).
--
-- SHARED OBJECTS: adds BEFORE triggers on the existing photo and turnover
-- tables, and briefly disables audit_photo / audit_turnover /
-- turnover_lock_guard inside this transaction for the one-off backfill (so the
-- backfill neither spams audit_log nor trips the lock guard on locked visits).
-- Founder sign-off required before applying to the shared DB.

-- ── photo.received_at ──────────────────────────────────────────────────────
alter table photo add column received_at timestamptz;

alter table photo disable trigger audit_photo;
update photo set received_at = created_at where received_at is null;
alter table photo enable trigger audit_photo;

alter table photo
  alter column received_at set default now(),
  alter column received_at set not null;

comment on column photo.received_at is
  'Server time this shot was received; restamped on retake (storage_path change). Not client-writable.';

create or replace function set_photo_received_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null or new.received_at is null then
      new.received_at := now();
    end if;
  elsif new.storage_path is distinct from old.storage_path then
    -- A retake: a new file arrived. Trusted callers may still set it explicitly.
    if auth.uid() is not null or new.received_at is not distinct from old.received_at then
      new.received_at := now();
    end if;
  elsif auth.uid() is not null then
    new.received_at := old.received_at;
  end if;
  return new;
end;
$$;

revoke execute on function public.set_photo_received_at() from public;

create trigger photo_received_at
  before insert or update on photo
  for each row execute function set_photo_received_at();

-- ── turnover.locked_at ─────────────────────────────────────────────────────
alter table turnover add column locked_at timestamptz;

comment on column turnover.locked_at is
  'Server time the visit became submitted_locked. Not client-writable.';

-- Backfill: the earliest audit_log row showing the turnover as locked is the
-- lock moment (audit_log records every turnover insert/update since
-- 20260608022512, and a locked turnover can't be updated again). Visits with no
-- such row (locked before the audit writer existed) fall back to the latest
-- evidence we hold for them — the newest photo row, or the visit start — a
-- lower bound on the real lock time.
alter table turnover disable trigger turnover_lock_guard;
alter table turnover disable trigger audit_turnover;
update turnover t
set locked_at = coalesce(
  (select min(a.at) from audit_log a
    where a.entity = 'turnover'
      and a.entity_id = t.id
      and a.diff -> 'new' ->> 'status' = 'submitted_locked'),
  greatest(
    t.submitted_at_server,
    (select max(p.created_at) from photo p where p.turnover_id = t.id)
  )
)
where t.status = 'submitted_locked';
alter table turnover enable trigger audit_turnover;
alter table turnover enable trigger turnover_lock_guard;

create or replace function set_turnover_locked_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'submitted_locked'
     and (tg_op = 'INSERT' or old.status is distinct from 'submitted_locked') then
    if auth.uid() is not null or new.locked_at is null then
      new.locked_at := now();
    end if;
  elsif auth.uid() is not null then
    new.locked_at := case when tg_op = 'INSERT' then null else old.locked_at end;
  end if;
  return new;
end;
$$;

revoke execute on function public.set_turnover_locked_at() from public;

create trigger turnover_locked_at
  before insert or update on turnover
  for each row execute function set_turnover_locked_at();

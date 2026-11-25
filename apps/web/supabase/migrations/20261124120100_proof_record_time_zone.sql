-- proof_record(p_token) also returns the zone the visit happened in.
--
-- SHARED OBJECT — FOUNDER SIGN-OFF REQUIRED before this is applied to the
-- shared/prod DB (CLAUDE.md schema-change rule: redefines an existing
-- function). NOT applied. Apply 20261124120000_turnover_time_zone.sql first
-- (this reads turnover.time_zone), and after 20261116130000_proof_record_token_only.sql.
--
-- The only change from that migration's definition is the added key
-- 'time_zone', t.time_zone. Same signature, same security definer +
-- set search_path = '', same grants; every other field is identical. Until
-- this is applied the public report simply has no time_zone and falls back to
-- America/Detroit.

create or replace function public.proof_record(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id,
    'status', t.status,
    'created_at', t.created_at,
    'submitted_at_server', t.submitted_at_server,
    'locked_at', t.locked_at,
    'time_zone', t.time_zone,
    'share_token', t.share_token,
    'notes', t.notes,
    'cleaning_steps', to_jsonb(t.cleaning_steps),
    'owner_flag', t.owner_flag,
    'property', (
      select jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'address', p.address,
        'drain_interval_days', p.drain_interval_days,
        'filter_interval_days', p.filter_interval_days
      )
      from public.property p
      where p.id = t.property_id
    ),
    -- The report prints the first name + last initial, or the email only when
    -- the profile has no name. Expose the email in that case only.
    'submitter', (
      select jsonb_build_object(
        'full_name', pr.full_name,
        'email', case when nullif(btrim(pr.full_name), '') is null
                      then pr.email end
      )
      from public.profile pr
      where pr.id = t.submitter_id
    ),
    'photos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slot', ph.slot,
        'phase', ph.phase,
        'storage_path', ph.storage_path,
        'captured_at', ph.captured_at,
        'received_at', ph.received_at,
        'created_at', ph.created_at
      ) order by ph.created_at)
      from public.photo ph
      where ph.turnover_id = t.id
    ), '[]'::jsonb),
    'water', (
      select jsonb_build_object(
        'total_alkalinity', w.total_alkalinity,
        'ph', w.ph,
        'calcium_hardness', w.calcium_hardness,
        'sanitizer_ppm', w.sanitizer_ppm,
        'left_total_alkalinity', w.left_total_alkalinity,
        'left_ph', w.left_ph,
        'left_calcium_hardness', w.left_calcium_hardness,
        'left_sanitizer_ppm', w.left_sanitizer_ppm,
        'recorded_at', w.recorded_at,
        'found_recorded_at', w.found_recorded_at,
        'left_recorded_at', w.left_recorded_at,
        'treatments', to_jsonb(w.treatments),
        'treatment_note', w.treatment_note
      )
      from public.water_reading w
      where w.turnover_id = t.id
      limit 1
    ),
    -- Care history for the footer's "next due": this tub's locked visits,
    -- timestamps and cleaning steps only.
    'tub_visits', coalesce((
      select jsonb_agg(jsonb_build_object(
        'submitted_at_server', v.submitted_at_server,
        'cleaning_steps', to_jsonb(v.cleaning_steps)
      ))
      from public.turnover v
      where v.property_id = t.property_id
        and v.status = 'submitted_locked'
    ), '[]'::jsonb)
  )
  from public.turnover t
  where p_token is not null
    and char_length(p_token) >= 16
    and t.share_token = p_token
    and t.status = 'submitted_locked'
  limit 1;
$$;

revoke all on function public.proof_record(text) from public;
grant execute on function public.proof_record(text) to anon, authenticated;

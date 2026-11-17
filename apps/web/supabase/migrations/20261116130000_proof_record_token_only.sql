-- Shared reports load only with their exact token.
--
-- THE HOLE: the *_public_proof anon SELECT policies check "has a share_token
-- and is locked", never the token the visitor holds. Anyone with the public
-- anon key could `select * from turnover` and read every locked visit, its
-- share_token, and from there every full report.
--
-- THE FIX: one token-checked SECURITY DEFINER function returns exactly the
-- record the report page prints, for exactly the visit whose share_token
-- matches; the anon policies are dropped so anon can read none of these tables.
--
-- SHARED-OBJECT CHANGE (drops RLS policies on existing tables): needs founder
-- sign-off before it is applied to the shared DB (CLAUDE.md schema-change rule).
-- Left unchanged: record_share_view, record_proof_open, proof_client_name,
-- the waitlist insert policy.

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

-- Drop every anon read policy on the six tables: turnover_public_proof,
-- photo_public_proof, water_reading_public_proof, issue_public_proof (the
-- issue_tag one), and the dead profile_/property_public_proof. Matched by
-- pattern so a name that drifted between migrations and the live DB still goes.
do $$
declare pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('turnover','photo','water_reading','issue_tag','profile','property')
      and 'anon' = any (roles)
      and policyname like '%public_proof'
  loop
    execute format('drop policy %I on %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

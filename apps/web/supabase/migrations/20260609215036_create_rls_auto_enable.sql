-- Capture the rls_auto_enable() event-trigger function + its `ensure_rls`
-- trigger. These were applied to the live project directly via the Supabase MCP
-- and never written as a migration, so a clean replay (the CI RLS gate) failed
-- when the next two migrations (20260609215037 / 20260609215836) revoke EXECUTE
-- on a function no migration created.
--
-- Definition pulled verbatim from prod (ref slkxwpiiludisrnwnxlg) for fidelity.
-- Placed immediately before its first reference: by this point every table is
-- already created with RLS explicitly enabled, so the trigger never fires during
-- replay — it only needs to EXIST for the subsequent revokes. The CREATE OR
-- REPLACE + guarded trigger make this safe to (re)apply to prod, which already
-- has both objects.

create or replace function public.rls_auto_enable()
 returns event_trigger
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
as $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

do $$
begin
  if not exists (select 1 from pg_event_trigger where evtname = 'ensure_rls') then
    create event trigger ensure_rls
      on ddl_command_end
      when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      execute function public.rls_auto_enable();
  end if;
end$$;

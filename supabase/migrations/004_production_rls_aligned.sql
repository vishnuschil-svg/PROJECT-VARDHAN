-- DEPENDS_ON: 002_production_rls.sql
-- Compatibility checkpoint retained for environments that recorded migration 004.
-- Canonical RLS is defined by 002; this checkpoint deliberately performs no schema change.
do $$
begin
  perform 1;
end $$;

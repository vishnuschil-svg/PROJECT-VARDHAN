# Sprint 1 Supabase runbook

Apply `001_production_schema.sql`, the existing versioned migrations required by the target project, then `003_production_rls.sql` in a disposable staging project first. Run `supabase/verification/rls_isolation.sql` with two real authenticated test users and memberships. Confirm same-tenant reads and all four cross-tenant denial cases before production.

Required frontend variables are `VITE_APP_MODE=production`, `VITE_REPOSITORY_BACKEND=supabase`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`. Never expose the service-role key. Production configuration blocks local fallback.

The local migration workflow is preview → validate → backup → dry run → dependency-ordered import → reconciliation → owner review. It never clears local data. Clear it only after successful reconciliation and explicit owner confirmation. Failed imports retain a rollback manifest and can resume from completed repositories.

Platform-owner access is explicit in `user_profiles.is_platform_owner`. Every privileged application command must create a `security_audit_logs` row with `created_by = auth.uid()`; review those rows during RLS verification.

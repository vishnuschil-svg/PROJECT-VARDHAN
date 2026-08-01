-- RLS Policy Verification Script
-- This script verifies that RLS policies are correctly configured on all tables

-- ============================================================================
-- RLS STATUS CHECK
-- ============================================================================

-- Check which tables have RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  forcerowsecurity AS rls_forced
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'workspaces', 'licenses', 'notifications', 'security_audit_logs', 'academy_progress',
    'chit_groups', 'chit_members', 'chit_collections', 'chit_receipts', 'chit_auctions',
    'chit_finance_entries', 'chit_documents', 'chit_settings', 'support_tickets',
    'communication_templates', 'communication_jobs', 'chit_schedule_rows', 'chit_payouts',
    'chit_dividends', 'lucky_draws', 'chit_templates', 'organizer_preferences',
    'payment_settings', 'month_closing', 'manual_overrides', 'expenses', 'activity_logs'
  )
ORDER BY tablename;

-- ============================================================================
-- POLICY EXISTENCE CHECK
-- ============================================================================

-- Check policies for each table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'workspaces', 'licenses', 'notifications', 'security_audit_logs', 'academy_progress',
    'chit_groups', 'chit_members', 'chit_collections', 'chit_receipts', 'chit_auctions',
    'chit_finance_entries', 'chit_documents', 'chit_settings', 'support_tickets',
    'communication_templates', 'communication_jobs', 'chit_schedule_rows', 'chit_payouts',
    'chit_dividends', 'lucky_draws', 'chit_templates', 'organizer_preferences',
    'payment_settings', 'month_closing', 'manual_overrides', 'expenses', 'activity_logs'
  )
ORDER BY tablename, policyname;

-- ============================================================================
-- HELPER FUNCTION VERIFICATION
-- ============================================================================

-- Check if helper functions exist
SELECT
  routine_name,
  routine_type,
  security_type,
  is_definer
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_platform_owner',
    'can_access_tenant_scope',
    'get_user_tenant_scopes',
    'set_updated_at'
  )
ORDER BY routine_name;

-- ============================================================================
-- TENANT ISOLATION VERIFICATION
-- ============================================================================

-- Verify that all tables have tenant_id and data_scope columns
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'workspaces', 'licenses', 'notifications', 'security_audit_logs', 'academy_progress',
    'chit_groups', 'chit_members', 'chit_collections', 'chit_receipts', 'chit_auctions',
    'chit_finance_entries', 'chit_documents', 'chit_settings', 'support_tickets',
    'communication_templates', 'communication_jobs', 'chit_schedule_rows', 'chit_payouts',
    'chit_dividends', 'lucky_draws', 'chit_templates', 'organizer_preferences',
    'payment_settings', 'month_closing', 'manual_overrides', 'expenses', 'activity_logs'
  )
  AND column_name IN ('tenant_id', 'data_scope')
ORDER BY table_name, column_name;

-- ============================================================================
-- INDEX VERIFICATION FOR TENANT ISOLATION
-- ============================================================================

-- Check if tenant isolation indexes exist
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (indexname LIKE '%tenant_id%' OR indexname LIKE '%data_scope%')
  AND tablename IN (
    'workspaces', 'licenses', 'notifications', 'security_audit_logs', 'academy_progress',
    'chit_groups', 'chit_members', 'chit_collections', 'chit_receipts', 'chit_auctions',
    'chit_finance_entries', 'chit_documents', 'chit_settings', 'support_tickets',
    'communication_templates', 'communication_jobs', 'chit_schedule_rows', 'chit_payouts',
    'chit_dividends', 'lucky_draws', 'chit_templates', 'organizer_preferences',
    'payment_settings', 'month_closing', 'manual_overrides', 'expenses', 'activity_logs'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- TRIGGER VERIFICATION
-- ============================================================================

-- Check if updated_at triggers exist
SELECT
  trigger_name,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'set_%_updated_at'
  AND event_object_table IN (
    'workspaces', 'licenses', 'notifications', 'security_audit_logs', 'academy_progress',
    'chit_groups', 'chit_members', 'chit_collections', 'chit_receipts', 'chit_auctions',
    'chit_finance_entries', 'chit_documents', 'chit_settings', 'support_tickets',
    'communication_templates', 'communication_jobs', 'chit_schedule_rows', 'chit_payouts',
    'chit_dividends', 'lucky_draws', 'chit_templates', 'organizer_preferences',
    'payment_settings', 'month_closing', 'manual_overrides', 'expenses', 'activity_logs'
  )
ORDER BY event_object_table;

-- ============================================================================
-- SECURITY FUNCTION PERMISSIONS
-- ============================================================================

-- Check security function permissions
SELECT
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_platform_owner',
    'can_access_tenant_scope',
    'get_user_tenant_scopes'
  )
ORDER BY routine_name, grantee, privilege_type;

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================

-- Generate summary report
WITH rls_status AS (
  SELECT
    tablename,
    rowsecurity AS rls_enabled,
    forcerowsecurity AS rls_forced
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'workspaces', 'licenses', 'notifications', 'security_audit_logs', 'academy_progress',
      'chit_groups', 'chit_members', 'chit_collections', 'chit_receipts', 'chit_auctions',
      'chit_finance_entries', 'chit_documents', 'chit_settings', 'support_tickets',
      'communication_templates', 'communication_jobs', 'chit_schedule_rows', 'chit_payouts',
      'chit_dividends', 'lucky_draws', 'chit_templates', 'organizer_preferences',
      'payment_settings', 'month_closing', 'manual_overrides', 'expenses', 'activity_logs'
    )
),
policy_count AS (
  SELECT
    tablename,
    COUNT(*) AS policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'workspaces', 'licenses', 'notifications', 'security_audit_logs', 'academy_progress',
      'chit_groups', 'chit_members', 'chit_collections', 'chit_receipts', 'chit_auctions',
      'chit_finance_entries', 'chit_documents', 'chit_settings', 'support_tickets',
      'communication_templates', 'communication_jobs', 'chit_schedule_rows', 'chit_payouts',
      'chit_dividends', 'lucky_draws', 'chit_templates', 'organizer_preferences',
      'payment_settings', 'month_closing', 'manual_overrides', 'expenses', 'activity_logs'
    )
  GROUP BY tablename
)
SELECT
  r.tablename,
  r.rls_enabled,
  r.rls_forced,
  COALESCE(p.policy_count, 0) AS policy_count,
  CASE
    WHEN r.rls_enabled = true AND COALESCE(p.policy_count, 0) >= 4 THEN 'PASS'
    WHEN r.rls_enabled = true AND COALESCE(p.policy_count, 0) > 0 THEN 'PARTIAL'
    ELSE 'FAIL'
  END AS status
FROM rls_status r
LEFT JOIN policy_count p ON r.tablename = p.tablename
ORDER BY r.tablename;

# Canonical migration rollback guidance

The executable chain is intended for a new, disposable staging project. Take a verified database backup before either migration and record its recovery point. Never run these down steps automatically against production data.

## 000_legacy_reference_keys.sql

This additive compatibility bridge may add missing UUID reference columns and unique indexes to legacy tables. Do not remove populated ID columns after later migrations reference them. If an index must be replaced, first prove that no foreign key depends on it and use a forward migration. The bridge never drops or recreates legacy tables.

## 005_enterprise_production_infrastructure.sql

Disable the enterprise API routes before rollback. Export and retain notification delivery, subscription, license, invoice, webhook, backup, restore-audit, and production-event rows. Drop the `005` policies and immutable-scope triggers first. Drop the eight additive tables only in an empty environment or after signed data-retention approval; otherwise use a forward migration. Never remove canonical tenant membership helpers or disable RLS as a rollback technique.

## 002_production_rls.sql

This migration changes authorization and grants but does not delete application rows.

Rollback order:

1. Revoke authenticated DML grants if the application must be immediately isolated.
2. Drop policies from the 36 canonical tables.
3. Drop each `prevent_<table>_scope_change` trigger.
4. Drop `prevent_tenant_scope_change()`, `can_access_tenant(text,text)`, `has_tenant_role(text,text,text[])`, `has_active_membership(text,text)`, and `is_platform_owner()`.
5. Restore the previous RLS migration only after validating that its table and column model matches the restored schema.

Rollback must be rehearsed with owner, admin, operator, viewer, auditor, subscriber, disabled, and cross-tenant users. Disabling RLS is not an acceptable rollback strategy.

## 001_production_schema.sql

This is the structural root migration. Its down migration is destructive because all 36 application tables contain business data.

For an empty disposable staging project only, drop tables in reverse foreign-key order, ending with `workspace_memberships`, `user_profiles`, and `workspaces`. For any populated environment, restore the pre-migration backup instead of dropping tables. Reconcile row counts and financial totals before reopening writes.

The composite workspace-scope foreign keys and membership role/status constraints must not be removed in place. If a future model replaces them, use an additive migration, validate existing rows, add new constraints as `not valid`, validate them, and only then retire superseded constraints with a documented recovery point.

# MITRA NIDHI CHITI PRO - Supabase Schema and RLS Plan

Priority Fix Batch 4  
Status: Draft only. Do not apply automatically.

## Files

- SQL draft: `supabase/drafts/004_chiti_pro_production_schema_rls_draft.sql`
- This document: `docs/CHITI_PRO_SUPABASE_SCHEMA_RLS_PLAN.md`

## Scope

This prepares the production database shape for MITRA NIDHI CHITI PRO without connecting the frontend and without applying SQL. The current application should continue using the local repository layer until a later Supabase integration batch replaces the repository implementation.

## Tables Included

The SQL draft defines:

- `chit_groups`
- `chit_members`
- `chit_collections`
- `chit_receipts`
- `chit_auctions`
- `chit_finance_entries`
- `chit_documents`
- `chit_settings`

Every table includes:

- `id`
- `tenant_id`
- `data_scope`
- `created_by`
- `created_at`
- `updated_at`
- `status`

## Index Plan

The draft adds indexes for tenant isolation and high-frequency lookups:

- `tenant_id`
- `data_scope`
- `member_id` where the table owns member-linked records
- `group_id` where the table owns group-linked records
- `collection_date` on `chit_collections`
- `receipt_no` where receipt lookup/export is expected

The schema also adds tenant-scope uniqueness for important business identifiers such as group code, member number, receipt number, and setting key.

## RLS Policy Plan

The RLS draft assumes Supabase JWT `app_metadata` will eventually include:

- `platform_role`: `platform_owner`, `customer`, or `employee`
- `tenant_id`: active tenant identifier
- `data_scope`: `own_business`, `real_tenant`, or `demo_sandbox`

Access rules:

- Platform Owner can access all tenant and scope rows.
- My Business users can access only rows where `tenant_id` matches and `data_scope = own_business`.
- Customer users can access only rows where `tenant_id` matches and `data_scope = real_tenant`.
- Demo users can access only rows where `tenant_id` matches and `data_scope = demo_sandbox`.

The SQL draft centralizes this through `public.can_access_chit_scope(row_tenant_id, row_data_scope)` and applies one table-level policy per table. Before applying this in production, confirm the final auth claims and profile model.

## Rollout Notes

1. Review table names, field types, and constraints against the repository layer.
2. Confirm the final Supabase auth claims or profile lookup strategy.
3. Convert the draft into a numbered migration only after review.
4. Apply migrations in a staging Supabase project first.
5. Replace local repositories with Supabase repositories behind the existing repository contract.
6. Keep frontend behavior unchanged until repository parity is verified.

## Non-Goals In This Batch

- No Supabase connection from frontend.
- No SQL execution.
- No UI changes.
- No route changes.
- No business logic changes.

# Supabase RLS Policy Plan

MITRA NIDHI CHITI PRO is currently local/demo-provider ready. Supabase credentials and live schema execution are intentionally not required for the V1 internal trial.

## Required Tenant Columns

Every production table should include:

- `id`
- `tenant_id`
- `data_scope`
- `workspace_id`
- `created_by`
- `created_at`
- `updated_at`

## Policy Shape

All module tables should follow this pattern:

```sql
create policy "tenant can read own rows"
on public.<table_name>
for select
using (
  tenant_id = auth.jwt() ->> 'tenant_id'
);

create policy "tenant can insert own rows"
on public.<table_name>
for insert
with check (
  tenant_id = auth.jwt() ->> 'tenant_id'
);

create policy "tenant can update own rows"
on public.<table_name>
for update
using (
  tenant_id = auth.jwt() ->> 'tenant_id'
)
with check (
  tenant_id = auth.jwt() ->> 'tenant_id'
);
```

## Tables Needing RLS

- `workspaces`
- `chit_groups`
- `members`
- `collections`
- `receipts`
- `finance_entries`
- `ledger_entries`
- `auctions`
- `lucky_draw_results`
- `reports`
- `activities`
- `notifications`
- `imports`
- `audit_logs`

## Role Enforcement

Application roles remain enforced in the security service. Supabase RLS should enforce tenant boundaries and optionally use JWT role claims for sensitive operations:

- month close
- reopen month
- cancel receipt
- archive chit
- license management

## Dashboard Action Required

Create tables, attach JWT custom claims, enable RLS, and test policies in Supabase dashboard or migrations before switching production provider from local/demo to Supabase.

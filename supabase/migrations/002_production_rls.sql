-- CANONICAL_RLS: VARDHAN_MEMBERSHIP_V1
-- DEPENDS_ON: 001_production_schema.sql
-- ROLLBACK: see ROLLBACK.md. Do not roll back on a populated environment without a backup.
--
-- Authorization model
-- - user_profiles.is_platform_owner is the explicit cross-tenant authority.
-- - workspace_memberships is authoritative for tenant/workspace access.
-- - workspaces has a unique (tenant_id, data_scope), so that pair identifies one workspace.
-- - only active memberships authorize access; disabled and revoked memberships authorize nothing.
-- - subscriber is explicit and receives no broad operational-table access.

create or replace function public.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
set row_security = off
as $$
  select exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and p.is_platform_owner = true
      and p.platform_role = 'platform_owner'
  );
$$;

create or replace function public.has_active_membership(target_tenant_id text, target_data_scope text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
set row_security = off
as $$
  select exists (
    select 1
    from public.workspace_memberships m
    join public.workspaces w
      on w.id = m.workspace_id
     and w.tenant_id = m.tenant_id
     and w.data_scope = m.data_scope
    where m.user_id = auth.uid()
      and m.status = 'active'
      and m.tenant_id = target_tenant_id
      and m.data_scope = target_data_scope
      and w.status = 'active'
  );
$$;

create or replace function public.has_tenant_role(
  target_tenant_id text,
  target_data_scope text,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
set row_security = off
as $$
  select exists (
    select 1
    from public.workspace_memberships m
    join public.workspaces w
      on w.id = m.workspace_id
     and w.tenant_id = m.tenant_id
     and w.data_scope = m.data_scope
    where m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(allowed_roles)
      and m.tenant_id = target_tenant_id
      and m.data_scope = target_data_scope
      and w.status = 'active'
  );
$$;

-- Compatibility helper used by repository/RLS verification code. Subscribers are intentionally excluded.
create or replace function public.can_access_tenant(row_tenant_id text, row_data_scope text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
set row_security = off
as $$
  select public.is_platform_owner()
    or public.has_tenant_role(
      row_tenant_id,
      row_data_scope,
      array['owner','admin','operator','viewer','auditor']::text[]
    );
$$;

revoke all on function public.is_platform_owner() from public, anon, authenticated;
revoke all on function public.has_active_membership(text,text) from public, anon, authenticated;
revoke all on function public.has_tenant_role(text,text,text[]) from public, anon, authenticated;
revoke all on function public.can_access_tenant(text,text) from public, anon, authenticated;
grant execute on function public.is_platform_owner() to authenticated;
grant execute on function public.has_active_membership(text,text) to authenticated;
grant execute on function public.has_tenant_role(text,text,text[]) to authenticated;
grant execute on function public.can_access_tenant(text,text) to authenticated;

-- Tenant/data-scope identity is immutable after insert. Moving a row between workspaces must be
-- an explicit export/import operation with reconciliation, not an update that evades RLS history.
create or replace function public.prevent_tenant_scope_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.tenant_id is distinct from old.tenant_id
     or new.data_scope is distinct from old.data_scope then
    raise exception 'tenant_id and data_scope are immutable';
  end if;
  return new;
end;
$$;

do $$
declare
  v_table text;
  v_policy text;
begin
  foreach v_table in array array[
    'workspaces','licenses','notifications','security_audit_logs','academy_progress','chit_groups','chit_members',
    'chit_collections','chit_receipts','chit_auctions','chit_finance_entries','chit_documents','chit_settings',
    'support_tickets','communication_templates','communication_jobs','chit_schedule_rows','chit_payouts','chit_dividends',
    'lucky_draws','chit_templates','organizer_preferences','payment_settings','month_closing','manual_overrides','expenses',
    'activity_logs','user_profiles','workspace_memberships','chit_rules','chit_collection_items','chit_ledger_entries',
    'report_snapshots','import_jobs','migration_runs','business_identities'
  ] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('alter table public.%I force row level security', v_table);

    for v_policy in
      select policyname from pg_catalog.pg_policies
      where schemaname = 'public' and tablename = v_table
    loop
      execute format('drop policy if exists %I on public.%I', v_policy, v_table);
    end loop;

    execute format('drop trigger if exists %I on public.%I', 'prevent_' || v_table || '_scope_change', v_table);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.prevent_tenant_scope_change()',
      'prevent_' || v_table || '_scope_change',
      v_table
    );
  end loop;
end $$;

-- Standard operational tables. Subscribers are deliberately absent from every role array.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'licenses','chit_groups','chit_members','chit_collections','chit_receipts','chit_auctions',
    'chit_finance_entries','chit_documents','chit_settings','communication_templates','communication_jobs',
    'chit_schedule_rows','chit_payouts','chit_dividends','lucky_draws','chit_templates',
    'organizer_preferences','payment_settings','month_closing','manual_overrides','expenses','chit_rules',
    'chit_collection_items','chit_ledger_entries','report_snapshots','import_jobs','migration_runs','business_identities'
  ] loop
    execute format($policy$
      create policy tenant_select on public.%I for select to authenticated
      using (public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin','operator','viewer','auditor']::text[]))
    $policy$, v_table);
    execute format($policy$
      create policy tenant_insert on public.%I for insert to authenticated
      with check ((public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin','operator']::text[])) and created_by = auth.uid())
    $policy$, v_table);
    execute format($policy$
      create policy tenant_update on public.%I for update to authenticated
      using (public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin','operator']::text[]))
      with check (public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin','operator']::text[]))
    $policy$, v_table);
    execute format($policy$
      create policy tenant_delete on public.%I for delete to authenticated
      using (public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin']::text[]))
    $policy$, v_table);
  end loop;
end $$;

-- Workspace lifecycle. New workspaces are provisioned by platform/service-role workflows.
create policy workspaces_select on public.workspaces for select to authenticated
using (public.is_platform_owner() or public.has_active_membership(tenant_id,data_scope));
create policy workspaces_insert on public.workspaces for insert to authenticated
with check (public.is_platform_owner() and created_by = auth.uid());
create policy workspaces_update on public.workspaces for update to authenticated
using (public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner']::text[]))
with check (public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner']::text[]));
create policy workspaces_delete on public.workspaces for delete to authenticated
using (public.is_platform_owner());

-- Profiles cannot self-promote. Creation and ordinary profile maintenance use a trusted backend.
create policy user_profiles_select on public.user_profiles for select to authenticated
using (
  id = auth.uid()
  or public.is_platform_owner()
  or public.has_tenant_role(tenant_id,data_scope,array['owner','admin']::text[])
);
create policy user_profiles_update on public.user_profiles for update to authenticated
using (public.is_platform_owner())
with check (public.is_platform_owner());
create policy user_profiles_delete on public.user_profiles for delete to authenticated
using (public.is_platform_owner());

-- Membership changes are owner-only; admins cannot grant themselves owner/platform authority.
create policy workspace_memberships_select on public.workspace_memberships for select to authenticated
using (
  user_id = auth.uid()
  or public.is_platform_owner()
  or public.has_tenant_role(tenant_id,data_scope,array['owner','admin']::text[])
);
create policy workspace_memberships_insert on public.workspace_memberships for insert to authenticated
with check (
  (public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner']::text[]))
  and created_by = auth.uid()
);
create policy workspace_memberships_update on public.workspace_memberships for update to authenticated
using (public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner']::text[]))
with check (public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner']::text[]));
create policy workspace_memberships_delete on public.workspace_memberships for delete to authenticated
using (public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner']::text[]));

-- User-addressed tables permit own-row access, including subscribers, but not tenant-wide access.
create policy notifications_select on public.notifications for select to authenticated
using (user_id = auth.uid() or public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin']::text[]));
create policy notifications_insert on public.notifications for insert to authenticated
with check ((public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin','operator']::text[])) and created_by = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
using (user_id = auth.uid() or public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin']::text[]))
with check (user_id = auth.uid() or public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin']::text[]));
create policy notifications_delete on public.notifications for delete to authenticated
using (user_id = auth.uid() or public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin']::text[]));

create policy academy_progress_select on public.academy_progress for select to authenticated
using (user_id = auth.uid() or public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin']::text[]));
create policy academy_progress_insert on public.academy_progress for insert to authenticated
with check (user_id = auth.uid() and public.has_active_membership(tenant_id,data_scope) and created_by = auth.uid());
create policy academy_progress_update on public.academy_progress for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and public.has_active_membership(tenant_id,data_scope));
create policy academy_progress_delete on public.academy_progress for delete to authenticated
using (user_id = auth.uid() or public.is_platform_owner());

create policy support_tickets_select on public.support_tickets for select to authenticated
using (user_id = auth.uid() or public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin','operator']::text[]));
create policy support_tickets_insert on public.support_tickets for insert to authenticated
with check (user_id = auth.uid() and public.has_active_membership(tenant_id,data_scope) and created_by = auth.uid());
create policy support_tickets_update on public.support_tickets for update to authenticated
using (user_id = auth.uid() or public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin','operator']::text[]))
with check (user_id = auth.uid() or public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin','operator']::text[]));
create policy support_tickets_delete on public.support_tickets for delete to authenticated
using (public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin']::text[]));

-- Audit tables are append-only through RLS. No authenticated update/delete policy exists.
create policy security_audit_logs_select on public.security_audit_logs for select to authenticated
using (public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin','auditor']::text[]));
create policy security_audit_logs_insert on public.security_audit_logs for insert to authenticated
with check ((public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin','operator']::text[])) and created_by = auth.uid());
create policy activity_logs_select on public.activity_logs for select to authenticated
using (public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin','auditor']::text[]));
create policy activity_logs_insert on public.activity_logs for insert to authenticated
with check ((public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin','operator']::text[])) and created_by = auth.uid());

revoke all on all tables in schema public from public, anon;
revoke all on all sequences in schema public from public, anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

comment on function public.has_tenant_role(text,text,text[]) is
  'Canonical membership/role authorization helper. Active workspace membership is authoritative.';
comment on function public.can_access_tenant(text,text) is
  'Compatibility read helper. Subscribers are intentionally denied tenant-wide operational access.';

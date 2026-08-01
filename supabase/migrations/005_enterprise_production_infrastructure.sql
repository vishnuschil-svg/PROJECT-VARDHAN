-- DEPENDS_ON: 004_production_rls_aligned.sql
-- VARDHAN enterprise infrastructure records. Business calculations remain in the domain layer.
begin;

create or replace function pg_temp.vardhan_add_missing_columns(target_table regclass, definitions jsonb)
returns void language plpgsql as $$
declare column_name text; column_definition text;
begin
  for column_name, column_definition in select key, value from pg_catalog.jsonb_each_text(definitions)
  loop
    execute format('alter table %s add column if not exists %I %s', target_table, column_name, column_definition);
  end loop;
end;
$$;

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null,
  workspace_id uuid not null, created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  channel text not null, recipient text not null, dedupe_key text not null, provider text not null,
  provider_message_id text, status text not null, payload jsonb not null default '{}'::jsonb,
  constraint notification_deliveries_scope_check check (data_scope in ('own_business','real_tenant','demo_sandbox')),
  constraint notification_deliveries_channel_check check (channel in ('WHATSAPP','SMS','EMAIL')),
  constraint notification_deliveries_workspace_scope_fk foreign key (workspace_id,tenant_id,data_scope)
    references public.workspaces(id,tenant_id,data_scope) on delete restrict,
  constraint notification_deliveries_dedupe_unique unique (tenant_id,data_scope,dedupe_key)
);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null,
  workspace_id uuid not null, created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  product_id text not null, provider text not null, provider_subscription_id text not null,
  status text not null, trial_ends_at timestamptz, current_period_end timestamptz, payload jsonb not null default '{}'::jsonb,
  constraint billing_subscriptions_scope_check check (data_scope in ('own_business','real_tenant','demo_sandbox')),
  constraint billing_subscriptions_workspace_scope_fk foreign key (workspace_id,tenant_id,data_scope)
    references public.workspaces(id,tenant_id,data_scope) on delete restrict,
  constraint billing_subscriptions_provider_unique unique (provider,provider_subscription_id)
);

create table if not exists public.license_activations (
  id uuid primary key, tenant_id text not null, data_scope text not null, workspace_id uuid not null,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  product_id text not null, subscription_id text not null, status text not null,
  expires_at timestamptz not null, signature text not null,
  constraint license_activations_scope_check check (data_scope in ('own_business','real_tenant','demo_sandbox')),
  constraint license_activations_workspace_scope_fk foreign key (workspace_id,tenant_id,data_scope)
    references public.workspaces(id,tenant_id,data_scope) on delete restrict
);

create table if not exists public.gst_invoices (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null,
  workspace_id uuid not null, created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  invoice_number text not null, status text not null, taxable_total numeric(14,2) not null,
  tax_total numeric(14,2) not null, grand_total numeric(14,2) not null, payload jsonb not null,
  constraint gst_invoices_scope_check check (data_scope in ('own_business','real_tenant','demo_sandbox')),
  constraint gst_invoices_workspace_scope_fk foreign key (workspace_id,tenant_id,data_scope)
    references public.workspaces(id,tenant_id,data_scope) on delete restrict,
  constraint gst_invoices_number_unique unique (tenant_id,data_scope,invoice_number)
);

create table if not exists public.provider_webhook_events (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null,
  provider text not null, event_id text not null, event_type text not null,
  payload jsonb not null, verified boolean not null default false, created_at timestamptz not null default now(),
  constraint provider_webhook_events_scope_check check (data_scope in ('own_business','real_tenant','demo_sandbox')),
  constraint provider_webhook_events_unique unique (provider,event_id)
);

create table if not exists public.tenant_backups (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null,
  workspace_id uuid not null, created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  status text not null, manifest jsonb not null, encrypted_payload bytea not null, checksum text not null,
  constraint tenant_backups_scope_check check (data_scope in ('own_business','real_tenant','demo_sandbox')),
  constraint tenant_backups_workspace_scope_fk foreign key (workspace_id,tenant_id,data_scope)
    references public.workspaces(id,tenant_id,data_scope) on delete restrict
);

create table if not exists public.restore_audit_logs (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null,
  workspace_id uuid not null, backup_id uuid references public.tenant_backups(id) on delete restrict,
  owner_id uuid not null references auth.users(id), action text not null, previous_hash text, hash text not null,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  constraint restore_audit_logs_scope_check check (data_scope in ('own_business','real_tenant','demo_sandbox')),
  constraint restore_audit_logs_workspace_scope_fk foreign key (workspace_id,tenant_id,data_scope)
    references public.workspaces(id,tenant_id,data_scope) on delete restrict
);

create table if not exists public.production_events (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null,
  workspace_id uuid not null, created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  severity text not null, event_type text not null, request_id text, message text not null, metadata jsonb not null default '{}'::jsonb,
  constraint production_events_scope_check check (data_scope in ('own_business','real_tenant','demo_sandbox')),
  constraint production_events_severity_check check (severity in ('debug','info','warning','error','critical')),
  constraint production_events_workspace_scope_fk foreign key (workspace_id,tenant_id,data_scope)
    references public.workspaces(id,tenant_id,data_scope) on delete restrict
);

-- Compatibility audit: every production column for every pre-existing enterprise table.
select pg_temp.vardhan_add_missing_columns('public.notification_deliveries'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","workspace_id":"uuid","created_by":"uuid","created_at":"timestamptz default now()","channel":"text","recipient":"text","dedupe_key":"text","provider":"text","provider_message_id":"text","status":"text","payload":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.billing_subscriptions'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","workspace_id":"uuid","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","product_id":"text","provider":"text","provider_subscription_id":"text","status":"text","trial_ends_at":"timestamptz","current_period_end":"timestamptz","payload":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.license_activations'::regclass, '{"id":"uuid","tenant_id":"text","data_scope":"text","workspace_id":"uuid","created_by":"uuid","created_at":"timestamptz default now()","product_id":"text","subscription_id":"text","status":"text","expires_at":"timestamptz","signature":"text"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.gst_invoices'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","workspace_id":"uuid","created_by":"uuid","created_at":"timestamptz default now()","invoice_number":"text","status":"text","taxable_total":"numeric(14,2)","tax_total":"numeric(14,2)","grand_total":"numeric(14,2)","payload":"jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.provider_webhook_events'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","provider":"text","event_id":"text","event_type":"text","payload":"jsonb","verified":"boolean default false","created_at":"timestamptz default now()"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.tenant_backups'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","workspace_id":"uuid","created_by":"uuid","created_at":"timestamptz default now()","status":"text","manifest":"jsonb","encrypted_payload":"bytea","checksum":"text"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.restore_audit_logs'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","workspace_id":"uuid","backup_id":"uuid","owner_id":"uuid","action":"text","previous_hash":"text","hash":"text","metadata":"jsonb default ''{}''::jsonb","created_at":"timestamptz default now()"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.production_events'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","workspace_id":"uuid","created_by":"uuid","created_at":"timestamptz default now()","severity":"text","event_type":"text","request_id":"text","message":"text","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'notification_deliveries','billing_subscriptions','license_activations','gst_invoices',
    'provider_webhook_events','tenant_backups','restore_audit_logs','production_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_select', table_name);
    execute format(
      'create policy %I on public.%I for select using (public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array[''owner'',''admin'',''operator'',''viewer'',''auditor'']::text[]))',
      table_name || '_select', table_name
    );
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['notification_deliveries','billing_subscriptions','license_activations','gst_invoices','tenant_backups','production_events'] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_insert', table_name);
    execute format('drop trigger if exists %I on public.%I', table_name || '_immutable_scope', table_name);
    execute format(
      'create policy %I on public.%I for insert with check ((public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array[''owner'',''admin'',''operator'']::text[])) and created_by = auth.uid())',
      table_name || '_insert', table_name
    );
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.prevent_tenant_scope_change()',
      table_name || '_immutable_scope', table_name
    );
  end loop;
end $$;

drop policy if exists billing_subscriptions_update on public.billing_subscriptions;
drop policy if exists license_activations_update on public.license_activations;
drop policy if exists restore_audit_logs_insert on public.restore_audit_logs;
create policy billing_subscriptions_update on public.billing_subscriptions for update
  using (public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin']::text[]))
  with check (public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin']::text[]));
create policy license_activations_update on public.license_activations for update
  using (public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin']::text[]))
  with check (public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner','admin']::text[]));

-- Provider webhooks use the backend service role after signature verification.
-- Restore audit records are append-only and only owners may add them.
create policy restore_audit_logs_insert on public.restore_audit_logs for insert
  with check ((public.is_platform_owner() or public.has_tenant_role(tenant_id,data_scope,array['owner']::text[])) and owner_id = auth.uid());

create or replace function public.reject_immutable_operational_mutation()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception 'immutable operational records cannot be updated or deleted';
end;
$$;
revoke all on function public.reject_immutable_operational_mutation() from public, anon, authenticated;
drop trigger if exists restore_audit_logs_append_only on public.restore_audit_logs;
drop trigger if exists provider_webhook_events_append_only on public.provider_webhook_events;
create trigger restore_audit_logs_append_only before update or delete on public.restore_audit_logs
  for each row execute function public.reject_immutable_operational_mutation();
create trigger provider_webhook_events_append_only before update or delete on public.provider_webhook_events
  for each row execute function public.reject_immutable_operational_mutation();

create index if not exists idx_notification_deliveries_scope on public.notification_deliveries(tenant_id,data_scope,created_at desc);
create index if not exists idx_billing_subscriptions_scope on public.billing_subscriptions(tenant_id,data_scope,status);
create index if not exists idx_license_activations_scope on public.license_activations(tenant_id,data_scope,expires_at);
create index if not exists idx_gst_invoices_scope on public.gst_invoices(tenant_id,data_scope,created_at desc);
create index if not exists idx_tenant_backups_scope on public.tenant_backups(tenant_id,data_scope,created_at desc);
create index if not exists idx_restore_audit_scope on public.restore_audit_logs(tenant_id,data_scope,created_at desc);
create index if not exists idx_production_events_scope on public.production_events(tenant_id,data_scope,created_at desc);

commit;

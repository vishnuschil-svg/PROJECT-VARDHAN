-- DEPENDS_ON: 014_payment_reliability_reconciliation.sql
-- Additive record-only entities. Existing auction, winner, lucky-draw and payout tables are untouched.

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

create table if not exists public.manual_bid_records (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null,
  group_id uuid not null references public.chit_groups(id), period_id text not null,
  member_entries jsonb not null check (jsonb_typeof(member_entries) = 'array' and jsonb_array_length(member_entries) > 0),
  declared_recipient_member_id uuid not null references public.chit_members(id),
  recorded_distribution_amount numeric(14,2) not null check (recorded_distribution_amount > 0),
  record_date date not null, reference_number text, notes text, attachment_path text,
  decision_source text not null default 'EXTERNAL_ORGANIZER_DECISION' check (decision_source = 'EXTERNAL_ORGANIZER_DECISION'),
  record_source text not null default 'MANUAL_ORGANIZER_ENTRY' check (record_source = 'MANUAL_ORGANIZER_ENTRY'),
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.distribution_records (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null,
  group_id uuid not null references public.chit_groups(id), period_id text not null,
  recipient_member_id uuid not null references public.chit_members(id),
  distribution_amount numeric(14,2) not null check (distribution_amount > 0), distribution_date date not null,
  reference_number text, notes text, attachment_path text,
  source_record_id uuid references public.manual_bid_records(id),
  source_type text not null default 'DIRECT_ORGANIZER_ENTRY' check (source_type in ('MANUAL_BID_RECORD','DIRECT_ORGANIZER_ENTRY')),
  decision_source text not null default 'EXTERNAL_ORGANIZER_DECISION' check (decision_source = 'EXTERNAL_ORGANIZER_DECISION'),
  record_source text not null default 'MANUAL_ORGANIZER_ENTRY' check (record_source = 'MANUAL_ORGANIZER_ENTRY'),
  entered_by uuid references auth.users(id), created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

select pg_temp.vardhan_add_missing_columns('public.manual_bid_records'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","group_id":"uuid references public.chit_groups(id)","period_id":"text","member_entries":"jsonb","declared_recipient_member_id":"uuid references public.chit_members(id)","recorded_distribution_amount":"numeric(14,2)","record_date":"date","reference_number":"text","notes":"text","attachment_path":"text","decision_source":"text default ''EXTERNAL_ORGANIZER_DECISION''","record_source":"text default ''MANUAL_ORGANIZER_ENTRY''","created_by":"uuid references auth.users(id)","updated_by":"uuid references auth.users(id)","created_at":"timestamptz default now()","updated_at":"timestamptz default now()"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.distribution_records'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","group_id":"uuid references public.chit_groups(id)","period_id":"text","recipient_member_id":"uuid references public.chit_members(id)","distribution_amount":"numeric(14,2)","distribution_date":"date","reference_number":"text","notes":"text","attachment_path":"text","source_record_id":"uuid references public.manual_bid_records(id)","source_type":"text default ''DIRECT_ORGANIZER_ENTRY''","decision_source":"text default ''EXTERNAL_ORGANIZER_DECISION''","record_source":"text default ''MANUAL_ORGANIZER_ENTRY''","entered_by":"uuid references auth.users(id)","created_by":"uuid references auth.users(id)","updated_by":"uuid references auth.users(id)","created_at":"timestamptz default now()","updated_at":"timestamptz default now()"}'::jsonb);

create index if not exists ix_manual_bid_records_scope on public.manual_bid_records (tenant_id, data_scope, group_id, period_id);
create index if not exists ix_distribution_records_scope on public.distribution_records (tenant_id, data_scope, group_id, period_id);

alter table public.manual_bid_records enable row level security;
alter table public.distribution_records enable row level security;
alter table public.manual_bid_records force row level security;
alter table public.distribution_records force row level security;

do $$
declare v_table text;
begin
  foreach v_table in array array['manual_bid_records','distribution_records'] loop
    execute format('drop policy if exists tenant_member_access on public.%I', v_table);
    execute format('drop policy if exists tenant_member_read on public.%I', v_table);
    execute format('drop policy if exists organizer_admin_insert on public.%I', v_table);
    execute format('drop policy if exists organizer_admin_update on public.%I', v_table);
    execute format('drop policy if exists organizer_admin_delete on public.%I', v_table);
    execute format($p$create policy tenant_member_read on public.%I for select to authenticated
      using (public.can_access_tenant(%I.tenant_id, %I.data_scope))$p$,
      v_table, v_table, v_table);
    execute format($p$create policy organizer_admin_insert on public.%I for insert to authenticated
      with check ((public.is_platform_owner() or public.has_tenant_role(%I.tenant_id, %I.data_scope, array['owner','admin']::text[])) and created_by = auth.uid())$p$,
      v_table, v_table, v_table);
    execute format($p$create policy organizer_admin_update on public.%I for update to authenticated
      using (public.is_platform_owner() or public.has_tenant_role(%I.tenant_id, %I.data_scope, array['owner','admin']::text[]))
      with check ((public.is_platform_owner() or public.has_tenant_role(%I.tenant_id, %I.data_scope, array['owner','admin']::text[])) and updated_by = auth.uid())$p$,
      v_table, v_table, v_table, v_table, v_table);
    execute format($p$create policy organizer_admin_delete on public.%I for delete to authenticated
      using (public.is_platform_owner() or public.has_tenant_role(%I.tenant_id, %I.data_scope, array['owner','admin']::text[]))$p$,
      v_table, v_table, v_table);
  end loop;
end $$;

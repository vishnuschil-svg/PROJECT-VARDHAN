-- DEPENDS_ON: 009_chit_closing_completion_durability.sql
-- Durable ingestion queue for production (Supabase/Postgres).
-- Safe/idempotent. Does not drop data.

-- Existing legacy tables are upgraded additively before any index, trigger, RLS policy, or
-- foreign key depends on the production columns. Required constraints remain part of the
-- canonical CREATE TABLE path; missing legacy columns are intentionally added nullable so
-- historical rows are preserved and can be attributed to a tenant in a controlled backfill.
create or replace function pg_temp.vardhan_add_missing_columns(target_table regclass, definitions jsonb)
returns void
language plpgsql
as $$
declare
  column_name text;
  column_definition text;
begin
  for column_name, column_definition in select key, value from pg_catalog.jsonb_each_text(definitions)
  loop
    execute format('alter table %s add column if not exists %I %s', target_table, column_name, column_definition);
  end loop;
end;
$$;

create table if not exists public.ingestion_jobs (
  id text primary key,
  batch_id text,
  tenant_id text not null,
  workspace_id text,
  user_id text,
  status text not null,
  file_name text not null,
  mime_type text not null,
  sha256 text not null,
  byte_size integer not null,
  parser_version text not null,
  schema_version text not null,
  language_hint text,
  error_code text,
  error_message text,
  draft_json text,
  source_preview text,
  audit_json text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Compatibility audit: every production column for this pre-existing queue table.
select pg_temp.vardhan_add_missing_columns('public.ingestion_jobs'::regclass, '{"id":"text","batch_id":"text","tenant_id":"text","workspace_id":"text","user_id":"text","status":"text","file_name":"text","mime_type":"text","sha256":"text","byte_size":"integer","parser_version":"text","schema_version":"text","language_hint":"text","error_code":"text","error_message":"text","draft_json":"text","source_preview":"text","audit_json":"text","created_at":"timestamptz default timezone(''utc'', now())","updated_at":"timestamptz default timezone(''utc'', now())"}'::jsonb);

create index if not exists idx_ingestion_jobs_batch on public.ingestion_jobs(batch_id);
create index if not exists idx_ingestion_jobs_hash
  on public.ingestion_jobs(tenant_id, sha256, parser_version, schema_version);
create index if not exists idx_ingestion_jobs_status on public.ingestion_jobs(status);
create index if not exists idx_ingestion_jobs_tenant_workspace
  on public.ingestion_jobs(tenant_id, workspace_id);

alter table public.ingestion_jobs enable row level security;

-- Service-role / backend connections bypass RLS; keep RLS enabled for anon/authenticated
-- with no broad policies so browser clients cannot read other tenants jobs.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ingestion_jobs'
      and policyname = 'ingestion_jobs_service_deny_anon'
  ) then
    create policy ingestion_jobs_service_deny_anon
      on public.ingestion_jobs
      for all
      to anon, authenticated
      using (false)
      with check (false);
  end if;
end $$;

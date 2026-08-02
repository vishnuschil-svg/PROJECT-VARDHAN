-- Durable ingestion queue for production (Supabase/Postgres).
-- Safe/idempotent. Does not drop data.

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

create index if not exists idx_ingestion_jobs_batch on public.ingestion_jobs(batch_id);
create index if not exists idx_ingestion_jobs_hash
  on public.ingestion_jobs(tenant_id, sha256, parser_version, schema_version);
create index if not exists idx_ingestion_jobs_status on public.ingestion_jobs(status);
create index if not exists idx_ingestion_jobs_tenant_workspace
  on public.ingestion_jobs(tenant_id, workspace_id);

alter table public.ingestion_jobs enable row level security;

-- Service-role / backend connections bypass RLS; keep RLS enabled for anon/authenticated
-- with no broad policies so browser clients cannot read other tenants' jobs.
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

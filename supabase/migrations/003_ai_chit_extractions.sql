begin;

create table if not exists public.ai_chit_extractions (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  workspace_id uuid not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'UPLOADED',
  file_name text,
  file_mime_type text,
  file_size bigint,
  file_hash text,
  provider text,
  provider_metadata jsonb not null default '{}'::jsonb,
  parsed_draft jsonb not null default '{}'::jsonb,
  confidence_score numeric(5,4) not null default 0,
  committed_group_id uuid references public.chit_groups(id),
  error_code text,
  constraint ai_chit_extractions_scope_check
    check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox')),
  constraint ai_chit_extractions_status_check
    check (status in ('UPLOADED','PROCESSING','PENDING_REVIEW','VERIFIED','COMMITTED','FAILED','REJECTED')),
  constraint ai_chit_extractions_confidence_check
    check (confidence_score between 0 and 1),
  constraint ai_chit_extractions_workspace_scope_fk
    foreign key (workspace_id, tenant_id, data_scope)
    references public.workspaces(id, tenant_id, data_scope) on delete restrict
);

select pg_temp.vardhan_add_missing_columns('public.ai_chit_extractions'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","workspace_id":"uuid","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''UPLOADED''","file_name":"text","file_mime_type":"text","file_size":"bigint","file_hash":"text","provider":"text","provider_metadata":"jsonb default ''{}''::jsonb","parsed_draft":"jsonb default ''{}''::jsonb","confidence_score":"numeric(5,4) default 0","committed_group_id":"uuid","error_code":"text"}'::jsonb);

create index if not exists idx_ai_chit_extractions_workspace
  on public.ai_chit_extractions(workspace_id, tenant_id, data_scope, updated_at desc);

alter table public.ai_chit_extractions enable row level security;
alter table public.ai_chit_extractions force row level security;

drop policy if exists ai_chit_extractions_select on public.ai_chit_extractions;
create policy ai_chit_extractions_select on public.ai_chit_extractions
  for select to authenticated
  using (
    exists (
      select 1 from public.workspace_memberships membership
      where membership.workspace_id = ai_chit_extractions.workspace_id
        and membership.tenant_id = ai_chit_extractions.tenant_id
        and membership.data_scope = ai_chit_extractions.data_scope
        and membership.user_id = auth.uid()
        and membership.status = 'active'
    )
  );

drop policy if exists ai_chit_extractions_write on public.ai_chit_extractions;
create policy ai_chit_extractions_write on public.ai_chit_extractions
  for all to authenticated
  using (
    exists (
      select 1 from public.workspace_memberships membership
      where membership.workspace_id = ai_chit_extractions.workspace_id
        and membership.tenant_id = ai_chit_extractions.tenant_id
        and membership.data_scope = ai_chit_extractions.data_scope
        and membership.user_id = auth.uid()
        and membership.status = 'active'
        and membership.role in ('owner','admin','operator')
    )
  )
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.workspace_memberships membership
      where membership.workspace_id = ai_chit_extractions.workspace_id
        and membership.tenant_id = ai_chit_extractions.tenant_id
        and membership.data_scope = ai_chit_extractions.data_scope
        and membership.user_id = auth.uid()
        and membership.status = 'active'
        and membership.role in ('owner','admin','operator')
    )
  );

grant select, insert, update on public.ai_chit_extractions to authenticated;

create or replace function public.commit_ai_chit_draft(
  p_extraction_id uuid,
  p_draft jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  extraction public.ai_chit_extractions%rowtype;
  group_id uuid;
  group_name text;
  group_value numeric;
  member_count integer;
  duration_months integer;
  monthly_amount numeric;
  start_date date;
  schedule_row jsonb;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  select * into extraction
  from public.ai_chit_extractions
  where id = p_extraction_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'AI chit draft was not found.';
  end if;
  if extraction.status = 'COMMITTED' then
    raise exception using errcode = '23505', message = 'AI chit draft has already been committed.';
  end if;

  group_name := nullif(trim(p_draft #>> '{business,chitName,value}'), '');
  group_value := nullif(p_draft #>> '{business,chitValue,value}', '')::numeric;
  member_count := nullif(p_draft #>> '{business,memberCount,value}', '')::integer;
  duration_months := nullif(p_draft #>> '{business,duration,value}', '')::integer;
  monthly_amount := nullif(p_draft #>> '{schedule,0,standardPayment}', '')::numeric;
  start_date := nullif(p_draft #>> '{business,startDate,value}', '')::date;

  if group_name is null or group_value <= 0 or member_count <= 0 or duration_months <= 0 then
    raise exception using errcode = '22023', message = 'Verified mandatory chit fields are required.';
  end if;
  if jsonb_array_length(coalesce(p_draft->'schedule', '[]'::jsonb)) <> duration_months then
    raise exception using errcode = '22023', message = 'Schedule length must match chit duration.';
  end if;
  if exists (
    select 1 from public.chit_groups existing
    where existing.tenant_id = extraction.tenant_id
      and existing.data_scope = extraction.data_scope
      and lower(existing.chit_name) = lower(group_name)
      and existing.status <> 'closed'
  ) then
    raise exception using errcode = '23505', message = 'A chit group with this name already exists in the workspace.';
  end if;

  insert into public.chit_groups (
    tenant_id, data_scope, created_by, status, chit_name, chit_code,
    chit_value, monthly_amount, total_members, total_months, start_date, metadata
  ) values (
    extraction.tenant_id, extraction.data_scope, auth.uid(), 'active', group_name,
    'AI-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    group_value, coalesce(monthly_amount, 0), member_count, duration_months, start_date,
    jsonb_build_object(
      'source', 'AI_CHIT_EXTRACTION',
      'extraction_id', extraction.id,
      'installment_pattern', p_draft #>> '{business,installmentPattern,value}'
    )
  ) returning id into group_id;

  for schedule_row in
    select value from jsonb_array_elements(coalesce(p_draft->'schedule', '[]'::jsonb))
  loop
    insert into public.chit_schedule_rows (
      tenant_id, data_scope, created_by, status, group_id,
      schedule_month, schedule_year, installment_amount, dividend_amount, metadata
    ) values (
      extraction.tenant_id, extraction.data_scope, auth.uid(), 'active', group_id,
      coalesce(nullif(schedule_row->>'monthNumber', '')::integer, 1),
      coalesce(extract(year from start_date)::integer, extract(year from current_date)::integer),
      coalesce(nullif(schedule_row->>'standardPayment', '')::numeric, 0),
      coalesce(nullif(schedule_row->>'dividendPerMember', '')::numeric, 0),
      schedule_row
    );
  end loop;

  insert into public.chit_rules (
    tenant_id, data_scope, workspace_id, created_by, group_id, rule_type, rule_value, status
  ) values (
    extraction.tenant_id, extraction.data_scope, extraction.workspace_id, auth.uid(),
    group_id, 'AI_VERIFIED_BUSINESS_MODEL',
    jsonb_build_object(
      'financialPrimitives', coalesce(p_draft->'financialPrimitives', '{}'::jsonb),
      'rules', coalesce(p_draft->'rules', '{}'::jsonb)
    ),
    'active'
  );

  update public.ai_chit_extractions
  set parsed_draft = p_draft,
      status = 'COMMITTED',
      committed_group_id = group_id,
      updated_at = now()
  where id = extraction.id;

  return jsonb_build_object(
    'group', (select to_jsonb(created_group) from public.chit_groups created_group where created_group.id = group_id),
    'extractionId', extraction.id,
    'status', 'COMMITTED'
  );
end;
$$;

grant execute on function public.commit_ai_chit_draft(uuid, jsonb) to authenticated;

commit;

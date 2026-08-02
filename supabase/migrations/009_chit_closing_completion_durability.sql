-- DEPENDS_ON: 008_chit_winner_immutability.sql
-- Batch 3: durable dividends, expenses, month closing, and chit completion.

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

create table if not exists public.chit_completions (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'COMPLETED',

  group_id uuid not null references public.chit_groups(id) on delete restrict,
  completed_at timestamptz,
  completed_by text,
  snapshot jsonb not null default '{}'::jsonb,
  notes text,
  metadata jsonb not null default '{}'::jsonb,

  constraint chit_completions_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox'))
);

select pg_temp.vardhan_add_missing_columns('public.chit_completions'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''COMPLETED''","group_id":"uuid","completed_at":"timestamptz","completed_by":"text","snapshot":"jsonb default ''{}''::jsonb","notes":"text","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);

alter table public.chit_dividends
  add column if not exists reference_no text;
alter table public.expenses
  add column if not exists reference_no text;
alter table public.month_closing
  add column if not exists reopen_reason text,
  add column if not exists reopened_at timestamptz,
  add column if not exists reopened_by text;

create unique index if not exists uq_chit_dividends_member_month_active
  on public.chit_dividends (tenant_id, data_scope, group_id, member_id, dividend_month)
  where member_id is not null and upper(status) not in ('CANCELLED', 'REVERSED');

create unique index if not exists uq_chit_dividends_reference
  on public.chit_dividends (tenant_id, data_scope, reference_no)
  where coalesce(reference_no, '') <> '';

create unique index if not exists uq_expenses_reference
  on public.expenses (tenant_id, data_scope, reference_no)
  where coalesce(reference_no, '') <> '';

create unique index if not exists uq_chit_completions_group_active
  on public.chit_completions (tenant_id, data_scope, group_id)
  where upper(status) = 'COMPLETED';

create unique index if not exists uq_month_closing_idempotency
  on public.month_closing (tenant_id, data_scope, (metadata->>'idempotency_key'))
  where coalesce(metadata->>'idempotency_key', '') <> '';

create index if not exists idx_chit_completions_tenant_id on public.chit_completions(tenant_id);
create index if not exists idx_chit_completions_data_scope on public.chit_completions(data_scope);
create index if not exists idx_chit_completions_group_id on public.chit_completions(group_id);

drop trigger if exists set_chit_completions_updated_at on public.chit_completions;
create trigger set_chit_completions_updated_at
  before update on public.chit_completions
  for each row execute function public.set_updated_at();

alter table public.chit_completions enable row level security;
alter table public.chit_completions force row level security;

drop policy if exists tenant_select on public.chit_completions;
drop policy if exists tenant_insert on public.chit_completions;
drop policy if exists tenant_update on public.chit_completions;
drop policy if exists tenant_delete on public.chit_completions;

create policy tenant_select on public.chit_completions for select to authenticated
  using (public.is_platform_owner() or public.has_tenant_role(tenant_id, data_scope, array['owner','admin','operator','viewer','auditor']::text[]));
create policy tenant_insert on public.chit_completions for insert to authenticated
  with check ((public.is_platform_owner() or public.has_tenant_role(tenant_id, data_scope, array['owner','admin','operator']::text[])) and created_by = auth.uid());
create policy tenant_update on public.chit_completions for update to authenticated
  using (public.is_platform_owner() or public.has_tenant_role(tenant_id, data_scope, array['owner','admin','operator']::text[]))
  with check (public.is_platform_owner() or public.has_tenant_role(tenant_id, data_scope, array['owner','admin','operator']::text[]));
create policy tenant_delete on public.chit_completions for delete to authenticated
  using (public.is_platform_owner() or public.has_tenant_role(tenant_id, data_scope, array['owner','admin']::text[]));

drop trigger if exists prevent_chit_completions_scope_change on public.chit_completions;
create trigger prevent_chit_completions_scope_change
  before update on public.chit_completions
  for each row execute function public.prevent_tenant_scope_change();

create or replace function public.enforce_month_closing_immutability()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '22023', message = 'Month closing history cannot be deleted.';
  end if;
  if upper(coalesce(old.status, '')) = 'CLOSED' then
    if new.group_id is distinct from old.group_id
      or new.closing_month is distinct from old.closing_month
      or new.closing_year is distinct from old.closing_year
      or new.summary is distinct from old.summary
    then
      raise exception using errcode = '22023', message = 'Closed month snapshot is immutable.';
    end if;
    if upper(coalesce(new.status, '')) not in ('CLOSED', 'REOPENED') then
      raise exception using errcode = '22023', message = 'Closed months may only reopen with an audited reason.';
    end if;
    if upper(coalesce(new.status, '')) = 'REOPENED'
      and coalesce(nullif(trim(new.reopen_reason), ''), '') = '' then
      raise exception using errcode = '22023', message = 'Month reopen requires a reason.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_month_closing_immutability on public.month_closing;
create trigger enforce_month_closing_immutability
  before update or delete on public.month_closing
  for each row execute function public.enforce_month_closing_immutability();

create or replace function public.enforce_chit_completion_immutability()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '22023', message = 'Chit completion history cannot be deleted.';
  end if;
  if upper(coalesce(old.status, '')) = 'COMPLETED' then
    if new.group_id is distinct from old.group_id
      or new.snapshot is distinct from old.snapshot then
      raise exception using errcode = '22023', message = 'Completed chit snapshot is immutable.';
    end if;
    if upper(coalesce(new.status, '')) not in ('COMPLETED', 'REOPENED') then
      raise exception using errcode = '22023', message = 'Completed chits may only reopen with authorization.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_chit_completion_immutability on public.chit_completions;
create trigger enforce_chit_completion_immutability
  before update or delete on public.chit_completions
  for each row execute function public.enforce_chit_completion_immutability();

create or replace function public.post_chit_dividend_batch(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tenant text := nullif(trim(p_payload->>'tenant_id'), '');
  v_scope text := nullif(trim(p_payload->>'data_scope'), '');
  v_group uuid := nullif(p_payload->>'group_id', '')::uuid;
  v_month integer := coalesce(nullif(p_payload->>'dividend_month', '')::integer, 0);
  v_auction uuid := nullif(p_payload->>'auction_id', '')::uuid;
  v_idempotency text := nullif(trim(p_payload->>'idempotency_key'), '');
  v_row jsonb;
  v_ids uuid[] := array[]::uuid[];
  v_id uuid;
  v_existing_count integer;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;
  if v_tenant is null or v_scope is null or v_group is null or v_month < 1 or v_idempotency is null then
    raise exception using errcode = '22023', message = 'tenant_id, data_scope, group_id, dividend_month and idempotency_key are required.';
  end if;
  if not (public.is_platform_owner() or public.has_tenant_role(v_tenant, v_scope, array['owner','admin','operator']::text[])) then
    raise exception using errcode = '42501', message = 'Unauthorized role for dividend posting.';
  end if;

  select count(*) into v_existing_count
  from public.chit_dividends
  where tenant_id = v_tenant and data_scope = v_scope and metadata->>'idempotency_key' = v_idempotency;
  if v_existing_count > 0 then
    return jsonb_build_object('idempotent', true, 'count', v_existing_count);
  end if;

  if exists (
    select 1 from public.month_closing
    where tenant_id = v_tenant and data_scope = v_scope and group_id = v_group
      and closing_month = v_month and upper(status) = 'CLOSED'
  ) then
    raise exception using errcode = '22023', message = 'Cannot post dividends into a closed month.';
  end if;

  for v_row in select value from jsonb_array_elements(coalesce(p_payload->'allocations', '[]'::jsonb))
  loop
    insert into public.chit_dividends (
      tenant_id, data_scope, created_by, status, group_id, member_id, auction_id,
      dividend_month, dividend_date, dividend_amount, distributed_amount, notes, reference_no, metadata
    ) values (
      v_tenant, v_scope, auth.uid(), 'POSTED', v_group,
      nullif(v_row->>'member_id', '')::uuid, v_auction, v_month,
      coalesce(nullif(p_payload->>'dividend_date', '')::date, current_date),
      coalesce((v_row->>'amount')::numeric, 0),
      coalesce((v_row->>'amount')::numeric, 0),
      nullif(v_row->>'notes', ''),
      coalesce(nullif(v_row->>'reference_no', ''), 'dividend:' || v_idempotency || ':' || coalesce(v_row->>'member_id', 'na')),
      jsonb_build_object(
        'idempotency_key', v_idempotency,
        'winner_excluded', coalesce((v_row->>'winner_excluded')::boolean, false),
        'rounding', coalesce(p_payload->'rounding', '{}'::jsonb)
      )
    )
    returning id into v_id;
    v_ids := array_append(v_ids, v_id);

    insert into public.chit_finance_entries (
      tenant_id, data_scope, created_by, status, group_id, member_id, entry_date, entry_type,
      category, description, amount, cash_in, cash_out, bank_in, bank_out, payment_mode, metadata
    ) values (
      v_tenant, v_scope, auth.uid(), 'posted', v_group, nullif(v_row->>'member_id', '')::uuid, current_date,
      'dividend', 'Dividend', coalesce(v_row->>'notes', 'Dividend allocation'),
      coalesce((v_row->>'amount')::numeric, 0), 0, 0, 0, 0, 'Adjustment',
      jsonb_build_object('idempotency_key', v_idempotency || ':finance:' || coalesce(v_row->>'member_id', 'na'), 'dividend_id', v_id)
    );

    insert into public.chit_ledger_entries (
      tenant_id, data_scope, created_by, group_id, member_id, entry_type, entry_date, amount, description, reference_no, status
    ) values (
      v_tenant, v_scope, auth.uid(), v_group, nullif(v_row->>'member_id', '')::uuid, 'dividend', current_date,
      coalesce((v_row->>'amount')::numeric, 0), 'Dividend allocation',
      coalesce(nullif(v_row->>'reference_no', ''), 'dividend:' || v_idempotency || ':' || coalesce(v_row->>'member_id', 'na')),
      'posted'
    )
    on conflict (tenant_id, data_scope, reference_no) do nothing;
  end loop;

  return jsonb_build_object('idempotent', false, 'count', coalesce(array_length(v_ids, 1), 0), 'dividend_ids', to_jsonb(v_ids));
end;
$$;

create or replace function public.post_chit_expense_event(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tenant text := nullif(trim(p_payload->>'tenant_id'), '');
  v_scope text := nullif(trim(p_payload->>'data_scope'), '');
  v_idempotency text := nullif(trim(p_payload->>'idempotency_key'), '');
  v_expense_id uuid;
  v_amount numeric := coalesce((p_payload->>'amount')::numeric, 0);
  v_existing public.expenses%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;
  if v_tenant is null or v_scope is null or v_idempotency is null then
    raise exception using errcode = '22023', message = 'tenant_id, data_scope and idempotency_key are required.';
  end if;
  if not (public.is_platform_owner() or public.has_tenant_role(v_tenant, v_scope, array['owner','admin','operator']::text[])) then
    raise exception using errcode = '42501', message = 'Unauthorized role for expense posting.';
  end if;
  if v_amount <= 0 then
    raise exception using errcode = '22023', message = 'Expense amount must be positive.';
  end if;

  select * into v_existing from public.expenses
  where tenant_id = v_tenant and data_scope = v_scope and metadata->>'idempotency_key' = v_idempotency
  limit 1;
  if found then
    return jsonb_build_object('idempotent', true, 'expense_id', v_existing.id);
  end if;

  insert into public.expenses (
    tenant_id, data_scope, created_by, status, group_id, expense_date, category, description,
    amount, payment_method, paid_to, receipt_url, reference_no, metadata
  ) values (
    v_tenant, v_scope, auth.uid(), coalesce(nullif(p_payload->>'status', ''), 'POSTED'),
    nullif(p_payload->>'group_id', '')::uuid,
    coalesce(nullif(p_payload->>'expense_date', '')::date, current_date),
    coalesce(nullif(p_payload->>'category', ''), 'MISCELLANEOUS'),
    nullif(p_payload->>'description', ''),
    v_amount,
    coalesce(nullif(p_payload->>'payment_method', ''), 'Cash'),
    nullif(p_payload->>'paid_to', ''),
    nullif(p_payload->>'receipt_url', ''),
    coalesce(nullif(p_payload->>'reference_no', ''), 'expense:' || v_idempotency),
    coalesce(p_payload->'metadata', '{}'::jsonb) || jsonb_build_object('idempotency_key', v_idempotency)
  )
  returning id into v_expense_id;

  insert into public.chit_finance_entries (
    tenant_id, data_scope, created_by, status, group_id, entry_date, entry_type, category, description, amount,
    cash_in, cash_out, bank_in, bank_out, payment_mode, metadata
  ) values (
    v_tenant, v_scope, auth.uid(), 'posted', nullif(p_payload->>'group_id', '')::uuid, current_date, 'expense',
    coalesce(nullif(p_payload->>'category', ''), 'MISCELLANEOUS'),
    coalesce(nullif(p_payload->>'description', ''), 'Expense'),
    v_amount, 0,
    case when upper(coalesce(p_payload->>'payment_method', 'CASH')) = 'CASH' then v_amount else 0 end,
    0,
    case when upper(coalesce(p_payload->>'payment_method', 'CASH')) = 'CASH' then 0 else v_amount end,
    coalesce(nullif(p_payload->>'payment_method', ''), 'Cash'),
    jsonb_build_object('idempotency_key', v_idempotency || ':finance', 'expense_id', v_expense_id)
  );

  insert into public.chit_ledger_entries (
    tenant_id, data_scope, created_by, group_id, entry_type, entry_date, amount, description, reference_no, status
  ) values (
    v_tenant, v_scope, auth.uid(), nullif(p_payload->>'group_id', '')::uuid, 'expense', current_date, v_amount,
    coalesce(nullif(p_payload->>'description', ''), 'Expense'),
    coalesce(nullif(p_payload->>'reference_no', ''), 'expense:' || v_idempotency),
    'posted'
  )
  on conflict (tenant_id, data_scope, reference_no) do nothing;

  return jsonb_build_object('idempotent', false, 'expense_id', v_expense_id);
end;
$$;

create or replace function public.confirm_month_closing_event(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tenant text := nullif(trim(p_payload->>'tenant_id'), '');
  v_scope text := nullif(trim(p_payload->>'data_scope'), '');
  v_group uuid := nullif(p_payload->>'group_id', '')::uuid;
  v_month integer := coalesce(nullif(p_payload->>'closing_month', '')::integer, 0);
  v_year integer := coalesce(nullif(p_payload->>'closing_year', '')::integer, extract(year from current_date)::integer);
  v_idempotency text := nullif(trim(p_payload->>'idempotency_key'), '');
  v_existing public.month_closing%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;
  if v_tenant is null or v_scope is null or v_group is null or v_month < 1 or v_idempotency is null then
    raise exception using errcode = '22023', message = 'tenant_id, data_scope, group_id, closing_month and idempotency_key are required.';
  end if;
  if coalesce((p_payload->>'organizer_confirmed')::boolean, false) is not true then
    raise exception using errcode = '22023', message = 'Organizer confirmation is mandatory.';
  end if;
  if not (public.is_platform_owner() or public.has_tenant_role(v_tenant, v_scope, array['owner','admin','operator']::text[])) then
    raise exception using errcode = '42501', message = 'Unauthorized role for month closing.';
  end if;

  select * into v_existing from public.month_closing
  where tenant_id = v_tenant and data_scope = v_scope and metadata->>'idempotency_key' = v_idempotency
  limit 1;
  if found then
    return jsonb_build_object('idempotent', true, 'month_closing_id', v_existing.id, 'status', v_existing.status);
  end if;

  if exists (
    select 1 from public.month_closing
    where tenant_id = v_tenant and data_scope = v_scope and group_id = v_group
      and closing_month = v_month and closing_year = v_year and upper(status) = 'CLOSED'
  ) then
    raise exception using errcode = '23505', message = 'This chit month is already closed.';
  end if;

  insert into public.month_closing (
    tenant_id, data_scope, created_by, status, group_id, closing_month, closing_year,
    closed_at, closed_by, summary, notes, metadata
  ) values (
    v_tenant, v_scope, auth.uid(), 'CLOSED', v_group, v_month, v_year,
    now(), auth.uid(), coalesce(p_payload->'summary', '{}'::jsonb),
    nullif(p_payload->>'notes', ''),
    coalesce(p_payload->'metadata', '{}'::jsonb) || jsonb_build_object('idempotency_key', v_idempotency)
  )
  on conflict (tenant_id, data_scope, group_id, closing_month, closing_year)
  do update set
    status = 'CLOSED',
    closed_at = now(),
    closed_by = auth.uid(),
    summary = excluded.summary,
    reopen_reason = null,
    reopened_at = null,
    reopened_by = null,
    metadata = excluded.metadata,
    updated_at = now()
  where upper(public.month_closing.status) = 'REOPENED'
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.month_closing
    where tenant_id = v_tenant and data_scope = v_scope and group_id = v_group
      and closing_month = v_month and closing_year = v_year;
  end if;

  return jsonb_build_object('idempotent', false, 'month_closing_id', v_id, 'status', 'CLOSED');
end;
$$;

create or replace function public.reopen_month_closing_event(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tenant text := nullif(trim(p_payload->>'tenant_id'), '');
  v_scope text := nullif(trim(p_payload->>'data_scope'), '');
  v_id uuid := nullif(p_payload->>'month_closing_id', '')::uuid;
  v_reason text := nullif(trim(p_payload->>'reason'), '');
  v_row public.month_closing%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;
  if v_reason is null then
    raise exception using errcode = '22023', message = 'Month reopen requires a reason.';
  end if;
  if not (public.is_platform_owner() or public.has_tenant_role(v_tenant, v_scope, array['owner','admin']::text[])) then
    raise exception using errcode = '42501', message = 'Unauthorized role for month reopen.';
  end if;

  select * into v_row from public.month_closing
  where id = v_id and tenant_id = v_tenant and data_scope = v_scope for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Month closing was not found.';
  end if;
  if upper(v_row.status) = 'REOPENED' then
    return jsonb_build_object('idempotent', true, 'month_closing_id', v_row.id, 'status', v_row.status);
  end if;

  update public.month_closing
  set status = 'REOPENED',
      reopen_reason = v_reason,
      reopened_at = now(),
      reopened_by = coalesce(nullif(p_payload->>'reopened_by', ''), auth.uid()::text),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('reopen_audit', true),
      updated_at = now()
  where id = v_id
  returning * into v_row;

  return jsonb_build_object('idempotent', false, 'month_closing_id', v_row.id, 'status', v_row.status, 'reopen_reason', v_row.reopen_reason);
end;
$$;

create or replace function public.confirm_chit_completion_event(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tenant text := nullif(trim(p_payload->>'tenant_id'), '');
  v_scope text := nullif(trim(p_payload->>'data_scope'), '');
  v_group uuid := nullif(p_payload->>'group_id', '')::uuid;
  v_idempotency text := nullif(trim(p_payload->>'idempotency_key'), '');
  v_existing public.chit_completions%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;
  if v_tenant is null or v_scope is null or v_group is null or v_idempotency is null then
    raise exception using errcode = '22023', message = 'tenant_id, data_scope, group_id and idempotency_key are required.';
  end if;
  if coalesce((p_payload->>'organizer_confirmed')::boolean, false) is not true then
    raise exception using errcode = '22023', message = 'Organizer confirmation is mandatory.';
  end if;
  if not (public.is_platform_owner() or public.has_tenant_role(v_tenant, v_scope, array['owner','admin','operator']::text[])) then
    raise exception using errcode = '42501', message = 'Unauthorized role for chit completion.';
  end if;

  select * into v_existing from public.chit_completions
  where tenant_id = v_tenant and data_scope = v_scope and metadata->>'idempotency_key' = v_idempotency
  limit 1;
  if found then
    return jsonb_build_object('idempotent', true, 'completion_id', v_existing.id, 'status', v_existing.status);
  end if;

  if exists (
    select 1 from public.chit_completions
    where tenant_id = v_tenant and data_scope = v_scope and group_id = v_group and upper(status) = 'COMPLETED'
  ) then
    raise exception using errcode = '23505', message = 'This chit is already completed.';
  end if;

  insert into public.chit_completions (
    tenant_id, data_scope, created_by, status, group_id, completed_at, completed_by, snapshot, notes, metadata
  ) values (
    v_tenant, v_scope, auth.uid(), 'COMPLETED', v_group, now(),
    coalesce(nullif(p_payload->>'completed_by', ''), auth.uid()::text),
    coalesce(p_payload->'snapshot', '{}'::jsonb),
    nullif(p_payload->>'notes', ''),
    coalesce(p_payload->'metadata', '{}'::jsonb) || jsonb_build_object('idempotency_key', v_idempotency)
  )
  returning id into v_id;

  update public.chit_groups
  set status = 'closed',
      end_date = coalesce(end_date, current_date),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'completion_id', v_id,
        'completed_at', now(),
        'read_only', true
      ),
      updated_at = now()
  where id = v_group and tenant_id = v_tenant and data_scope = v_scope;

  return jsonb_build_object('idempotent', false, 'completion_id', v_id, 'status', 'COMPLETED', 'group_status', 'closed');
end;
$$;

revoke all on function public.post_chit_dividend_batch(jsonb) from public, anon;
revoke all on function public.post_chit_expense_event(jsonb) from public, anon;
revoke all on function public.confirm_month_closing_event(jsonb) from public, anon;
revoke all on function public.reopen_month_closing_event(jsonb) from public, anon;
revoke all on function public.confirm_chit_completion_event(jsonb) from public, anon;
grant execute on function public.post_chit_dividend_batch(jsonb) to authenticated;
grant execute on function public.post_chit_expense_event(jsonb) to authenticated;
grant execute on function public.confirm_month_closing_event(jsonb) to authenticated;
grant execute on function public.reopen_month_closing_event(jsonb) to authenticated;
grant execute on function public.confirm_chit_completion_event(jsonb) to authenticated;

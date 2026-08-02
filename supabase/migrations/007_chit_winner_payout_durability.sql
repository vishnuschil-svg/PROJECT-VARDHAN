-- DEPENDS_ON: 006_ai_chit_draft_cleanup.sql
-- Batch 2: durable winners, auction/draw uniqueness, payout references, atomic confirm RPC.

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

create table if not exists public.chit_winners (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'PROVISIONAL',

  group_id uuid not null references public.chit_groups(id) on delete restrict,
  member_id uuid not null references public.chit_members(id) on delete restrict,
  auction_id uuid references public.chit_auctions(id) on delete set null,
  lucky_draw_id uuid references public.lucky_draws(id) on delete set null,
  month_number integer not null,
  winner_mode text not null,
  bid_amount numeric(14,2) not null default 0,
  bid_percentage numeric(8,4) not null default 0,
  prize_amount numeric(14,2) not null default 0,
  payout_amount numeric(14,2) not null default 0,
  dividend_amount numeric(14,2) not null default 0,
  commission_amount numeric(14,2) not null default 0,
  organizer_profit numeric(14,2) not null default 0,
  confirmed_by text,
  confirmed_at timestamptz,
  cancelled_by text,
  cancelled_at timestamptz,
  cancellation_reason text,
  metadata jsonb not null default '{}'::jsonb,

  constraint chit_winners_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox')),
  constraint chit_winners_month_positive check (month_number > 0)
);

select pg_temp.vardhan_add_missing_columns('public.chit_winners'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''PROVISIONAL''","group_id":"uuid","member_id":"uuid","auction_id":"uuid","lucky_draw_id":"uuid","month_number":"integer","winner_mode":"text","bid_amount":"numeric(14,2) default 0","bid_percentage":"numeric(8,4) default 0","prize_amount":"numeric(14,2) default 0","payout_amount":"numeric(14,2) default 0","dividend_amount":"numeric(14,2) default 0","commission_amount":"numeric(14,2) default 0","organizer_profit":"numeric(14,2) default 0","confirmed_by":"text","confirmed_at":"timestamptz","cancelled_by":"text","cancelled_at":"timestamptz","cancellation_reason":"text","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);

create unique index if not exists uq_chit_winners_group_month_active
  on public.chit_winners (tenant_id, data_scope, group_id, month_number)
  where upper(status) in ('CONFIRMED', 'PROVISIONAL');

create unique index if not exists uq_chit_winners_idempotency
  on public.chit_winners (tenant_id, data_scope, (metadata->>'idempotency_key'))
  where coalesce(metadata->>'idempotency_key', '') <> '';

create unique index if not exists uq_chit_auctions_group_month_confirmed
  on public.chit_auctions (tenant_id, data_scope, group_id, auction_month)
  where upper(status) = 'CONFIRMED';

create unique index if not exists uq_lucky_draws_group_month_confirmed
  on public.lucky_draws (tenant_id, data_scope, group_id, draw_month)
  where upper(status) = 'CONFIRMED';

alter table public.chit_payouts
  add column if not exists reference_no text,
  add column if not exists winner_id uuid references public.chit_winners(id) on delete set null;

create unique index if not exists uq_chit_payouts_reference_no
  on public.chit_payouts (tenant_id, data_scope, reference_no)
  where coalesce(reference_no, '') <> '';

create unique index if not exists uq_chit_payouts_winner_active
  on public.chit_payouts (tenant_id, data_scope, winner_id)
  where winner_id is not null and upper(status) not in ('CANCELLED', 'cancelled');

create index if not exists idx_chit_winners_tenant_id on public.chit_winners(tenant_id);
create index if not exists idx_chit_winners_data_scope on public.chit_winners(data_scope);
create index if not exists idx_chit_winners_group_id on public.chit_winners(group_id);
create index if not exists idx_chit_winners_member_id on public.chit_winners(member_id);

drop trigger if exists set_chit_winners_updated_at on public.chit_winners;
create trigger set_chit_winners_updated_at
  before update on public.chit_winners
  for each row execute function public.set_updated_at();

alter table public.chit_winners enable row level security;
alter table public.chit_winners force row level security;

drop policy if exists tenant_select on public.chit_winners;
drop policy if exists tenant_insert on public.chit_winners;
drop policy if exists tenant_update on public.chit_winners;
drop policy if exists tenant_delete on public.chit_winners;

create policy tenant_select on public.chit_winners for select to authenticated
  using (public.is_platform_owner() or public.has_tenant_role(tenant_id, data_scope, array['owner','admin','operator','viewer','auditor']::text[]));

create policy tenant_insert on public.chit_winners for insert to authenticated
  with check (
    (public.is_platform_owner() or public.has_tenant_role(tenant_id, data_scope, array['owner','admin','operator']::text[]))
    and created_by = auth.uid()
  );

create policy tenant_update on public.chit_winners for update to authenticated
  using (public.is_platform_owner() or public.has_tenant_role(tenant_id, data_scope, array['owner','admin','operator']::text[]))
  with check (public.is_platform_owner() or public.has_tenant_role(tenant_id, data_scope, array['owner','admin','operator']::text[]));

create policy tenant_delete on public.chit_winners for delete to authenticated
  using (public.is_platform_owner() or public.has_tenant_role(tenant_id, data_scope, array['owner','admin']::text[]));

drop trigger if exists prevent_chit_winners_scope_change on public.chit_winners;
create trigger prevent_chit_winners_scope_change
  before update on public.chit_winners
  for each row execute function public.prevent_tenant_scope_change();

create or replace function public.confirm_chit_winner_event(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tenant text := nullif(trim(p_payload->>'tenant_id'), '');
  v_scope text := nullif(trim(p_payload->>'data_scope'), '');
  v_event text := upper(coalesce(p_payload->>'event_type', ''));
  v_idempotency text := nullif(trim(p_payload->>'idempotency_key'), '');
  v_group_id uuid := nullif(p_payload->>'group_id', '')::uuid;
  v_member_id uuid := nullif(p_payload->>'member_id', '')::uuid;
  v_month integer := coalesce(nullif(p_payload->>'month_number', '')::integer, 0);
  v_existing public.chit_winners%rowtype;
  v_auction_id uuid;
  v_draw_id uuid;
  v_winner_id uuid;
  v_finance_id uuid;
  v_ledger_id uuid;
  v_payout_id uuid;
  v_winner public.chit_winners%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;
  if v_tenant is null or v_scope is null then
    raise exception using errcode = '22023', message = 'tenant_id and data_scope are required.';
  end if;
  if not (
    public.is_platform_owner()
    or public.has_tenant_role(v_tenant, v_scope, array['owner','admin','operator']::text[])
  ) then
    raise exception using errcode = '42501', message = 'Unauthorized role for winner confirmation.';
  end if;
  if v_event not in ('AUCTION', 'LUCKY_DRAW') then
    raise exception using errcode = '22023', message = 'event_type must be AUCTION or LUCKY_DRAW.';
  end if;
  if v_group_id is null or v_member_id is null or v_month < 1 then
    raise exception using errcode = '22023', message = 'group_id, member_id and month_number are required.';
  end if;
  if v_idempotency is null then
    raise exception using errcode = '22023', message = 'idempotency_key is required.';
  end if;

  select * into v_existing
  from public.chit_winners
  where tenant_id = v_tenant
    and data_scope = v_scope
    and metadata->>'idempotency_key' = v_idempotency
  limit 1;

  if found then
    return jsonb_build_object(
      'idempotent', true,
      'winner_id', v_existing.id,
      'auction_id', v_existing.auction_id,
      'lucky_draw_id', v_existing.lucky_draw_id,
      'status', v_existing.status
    );
  end if;

  if exists (
    select 1 from public.chit_winners
    where tenant_id = v_tenant
      and data_scope = v_scope
      and group_id = v_group_id
      and month_number = v_month
      and upper(status) in ('CONFIRMED', 'PROVISIONAL')
  ) then
    raise exception using errcode = '23505', message = 'A winner is already locked for this chit month.';
  end if;

  if v_event = 'AUCTION' then
    insert into public.chit_auctions (
      tenant_id, data_scope, created_by, status, group_id, auction_month, auction_date,
      winner_member_id, bid_amount, lift_amount, dividend_amount, participants, notes, metadata
    ) values (
      v_tenant, v_scope, auth.uid(), 'CONFIRMED', v_group_id, v_month,
      coalesce(nullif(p_payload->>'event_date', '')::date, current_date),
      v_member_id,
      coalesce((p_payload->>'bid_amount')::numeric, 0),
      coalesce((p_payload->>'prize_amount')::numeric, (p_payload->>'payout_amount')::numeric, 0),
      coalesce((p_payload->>'dividend_amount')::numeric, 0),
      coalesce(p_payload->'participants', '[]'::jsonb),
      nullif(p_payload->>'notes', ''),
      coalesce(p_payload->'event_metadata', '{}'::jsonb) || jsonb_build_object('idempotency_key', v_idempotency)
    )
    returning id into v_auction_id;
  else
    insert into public.lucky_draws (
      tenant_id, data_scope, created_by, status, group_id, draw_month, draw_date,
      winner_member_id, prize_amount, participants, notes, metadata
    ) values (
      v_tenant, v_scope, auth.uid(), 'CONFIRMED', v_group_id, v_month,
      coalesce(nullif(p_payload->>'event_date', '')::date, current_date),
      v_member_id,
      coalesce((p_payload->>'prize_amount')::numeric, (p_payload->>'payout_amount')::numeric, 0),
      coalesce(p_payload->'participants', '[]'::jsonb),
      nullif(p_payload->>'notes', ''),
      coalesce(p_payload->'event_metadata', '{}'::jsonb) || jsonb_build_object(
        'idempotency_key', v_idempotency,
        'random_value', p_payload->>'random_value',
        'winner_index', p_payload->>'winner_index',
        'deterministic_seed', p_payload->>'deterministic_seed'
      )
    )
    returning id into v_draw_id;
  end if;

  insert into public.chit_winners (
    tenant_id, data_scope, created_by, status, group_id, member_id, auction_id, lucky_draw_id,
    month_number, winner_mode, bid_amount, bid_percentage, prize_amount, payout_amount,
    dividend_amount, commission_amount, organizer_profit, confirmed_by, confirmed_at, metadata
  ) values (
    v_tenant, v_scope, auth.uid(), 'CONFIRMED', v_group_id, v_member_id, v_auction_id, v_draw_id,
    v_month, coalesce(nullif(p_payload->>'winner_mode', ''), v_event),
    coalesce((p_payload->>'bid_amount')::numeric, 0),
    coalesce((p_payload->>'bid_percentage')::numeric, 0),
    coalesce((p_payload->>'prize_amount')::numeric, 0),
    coalesce((p_payload->>'payout_amount')::numeric, 0),
    coalesce((p_payload->>'dividend_amount')::numeric, 0),
    coalesce((p_payload->>'commission_amount')::numeric, 0),
    coalesce((p_payload->>'organizer_profit')::numeric, 0),
    coalesce(nullif(p_payload->>'confirmed_by', ''), auth.uid()::text),
    now(),
    coalesce(p_payload->'winner_metadata', '{}'::jsonb) || jsonb_build_object(
      'idempotency_key', v_idempotency,
      'is_winner_locked', true
    )
  )
  returning * into v_winner;

  v_winner_id := v_winner.id;

  insert into public.chit_finance_entries (
    tenant_id, data_scope, created_by, status, group_id, member_id, receipt_no,
    entry_date, entry_type, category, particulars, description, amount,
    cash_in, cash_out, bank_in, bank_out, payment_mode, metadata
  ) values (
    v_tenant, v_scope, auth.uid(), 'obligation', v_group_id, v_member_id,
    nullif(p_payload->>'finance_receipt_no', ''),
    current_date,
    coalesce(nullif(p_payload->>'finance_entry_type', ''), 'payout_obligation'),
    coalesce(nullif(p_payload->>'finance_category', ''), v_event),
    nullif(p_payload->>'finance_particulars', ''),
    coalesce(nullif(p_payload->>'finance_description', ''), 'Winner payout obligation'),
    coalesce((p_payload->>'payout_amount')::numeric, 0),
    0, 0, 0, coalesce((p_payload->>'payout_amount')::numeric, 0),
    'Pending',
    jsonb_build_object(
      'idempotency_key', v_idempotency || ':finance',
      'winner_id', v_winner_id
    )
  )
  returning id into v_finance_id;

  insert into public.chit_ledger_entries (
    tenant_id, data_scope, created_by, group_id, member_id, entry_type, entry_date,
    amount, description, reference_no, status
  ) values (
    v_tenant, v_scope, auth.uid(), v_group_id, v_member_id, 'winner_lift', current_date,
    coalesce((p_payload->>'payout_amount')::numeric, 0),
    coalesce(nullif(p_payload->>'ledger_description', ''), 'Winner lift / payout obligation'),
    'winner:' || v_winner_id::text,
    'posted'
  )
  returning id into v_ledger_id;

  if coalesce((p_payload->>'create_payout_plan')::boolean, true) then
    insert into public.chit_payouts (
      tenant_id, data_scope, created_by, status, group_id, member_id, auction_id, winner_id,
      payout_month, payout_date, payout_amount, payment_method, paid_amount, balance_amount,
      reference_no, notes, metadata
    ) values (
      v_tenant, v_scope, auth.uid(), 'PENDING', v_group_id, v_member_id, v_auction_id, v_winner_id,
      v_month, null,
      coalesce((p_payload->>'payout_amount')::numeric, 0),
      coalesce(nullif(p_payload->>'payment_method', ''), 'Cash'),
      0,
      coalesce((p_payload->>'payout_amount')::numeric, 0),
      'payout-plan:' || v_winner_id::text,
      nullif(p_payload->>'payout_notes', ''),
      jsonb_build_object(
        'idempotency_key', v_idempotency || ':payout',
        'winner_id', v_winner_id,
        'payout_mode', coalesce(p_payload->>'payout_mode', 'FULL')
      )
    )
    returning id into v_payout_id;
  end if;

  update public.chit_members
  set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'is_winner_locked', true,
    'lift_month', v_month,
    'winner_id', v_winner_id,
    'winner_mode', v_winner.winner_mode
  ),
  updated_at = now()
  where id = v_member_id
    and tenant_id = v_tenant
    and data_scope = v_scope;

  return jsonb_build_object(
    'idempotent', false,
    'winner_id', v_winner_id,
    'auction_id', v_auction_id,
    'lucky_draw_id', v_draw_id,
    'finance_id', v_finance_id,
    'ledger_id', v_ledger_id,
    'payout_id', v_payout_id,
    'status', 'CONFIRMED'
  );
end;
$$;

revoke all on function public.confirm_chit_winner_event(jsonb) from public, anon;
grant execute on function public.confirm_chit_winner_event(jsonb) to authenticated;

create or replace function public.record_chit_payout_payment(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tenant text := nullif(trim(p_payload->>'tenant_id'), '');
  v_scope text := nullif(trim(p_payload->>'data_scope'), '');
  v_payout_id uuid := nullif(p_payload->>'payout_id', '')::uuid;
  v_amount numeric := coalesce((p_payload->>'amount')::numeric, 0);
  v_payment_ref text := nullif(trim(p_payload->>'payment_reference'), '');
  v_idempotency text := nullif(trim(p_payload->>'idempotency_key'), '');
  v_payout public.chit_payouts%rowtype;
  v_paid numeric;
  v_status text;
  v_finance_id uuid;
  v_ledger_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;
  if v_tenant is null or v_scope is null or v_payout_id is null then
    raise exception using errcode = '22023', message = 'tenant_id, data_scope and payout_id are required.';
  end if;
  if not (
    public.is_platform_owner()
    or public.has_tenant_role(v_tenant, v_scope, array['owner','admin','operator']::text[])
  ) then
    raise exception using errcode = '42501', message = 'Unauthorized role for payout payment.';
  end if;
  if v_amount <= 0 then
    raise exception using errcode = '22023', message = 'Payout amount must be positive.';
  end if;
  if v_idempotency is null then
    raise exception using errcode = '22023', message = 'idempotency_key is required.';
  end if;

  if exists (
    select 1 from public.chit_finance_entries
    where tenant_id = v_tenant
      and data_scope = v_scope
      and metadata->>'idempotency_key' = v_idempotency
  ) then
    select * into v_payout from public.chit_payouts
    where id = v_payout_id and tenant_id = v_tenant and data_scope = v_scope;
    return jsonb_build_object('idempotent', true, 'payout_id', v_payout.id, 'status', v_payout.status, 'paid_amount', v_payout.paid_amount);
  end if;

  select * into v_payout
  from public.chit_payouts
  where id = v_payout_id and tenant_id = v_tenant and data_scope = v_scope
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Payout plan was not found.';
  end if;
  if upper(v_payout.status) = 'CANCELLED' then
    raise exception using errcode = '22023', message = 'Cancelled payout cannot accept payment.';
  end if;

  v_paid := coalesce(v_payout.paid_amount, 0) + v_amount;
  if v_paid <= 0 then
    v_status := 'PENDING';
  elsif v_paid >= coalesce(v_payout.payout_amount, 0) then
    v_status := 'PAID';
  else
    v_status := 'PARTIALLY_PAID';
  end if;

  update public.chit_payouts
  set paid_amount = v_paid,
      balance_amount = greatest(coalesce(payout_amount, 0) - v_paid, 0),
      status = v_status,
      payout_date = coalesce(payout_date, current_date),
      payment_method = coalesce(nullif(p_payload->>'payment_method', ''), payment_method),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'last_payment_reference', v_payment_ref,
        'last_payment_idempotency', v_idempotency
      ),
      updated_at = now()
  where id = v_payout_id
  returning * into v_payout;

  insert into public.chit_finance_entries (
    tenant_id, data_scope, created_by, status, group_id, member_id,
    entry_date, entry_type, category, particulars, description, amount,
    cash_in, cash_out, bank_in, bank_out, payment_mode, metadata
  ) values (
    v_tenant, v_scope, auth.uid(), 'posted', v_payout.group_id, v_payout.member_id,
    current_date, 'payout', 'Winner Payout', v_payment_ref,
    coalesce(nullif(p_payload->>'description', ''), 'Winner payout payment'),
    v_amount,
    0,
    case when upper(coalesce(p_payload->>'payment_method', 'CASH')) = 'CASH' then v_amount else 0 end,
    0,
    case when upper(coalesce(p_payload->>'payment_method', 'CASH')) = 'CASH' then 0 else v_amount end,
    coalesce(nullif(p_payload->>'payment_method', ''), v_payout.payment_method),
    jsonb_build_object(
      'idempotency_key', v_idempotency,
      'payout_id', v_payout.id,
      'winner_id', v_payout.winner_id,
      'payment_reference', v_payment_ref
    )
  )
  returning id into v_finance_id;

  insert into public.chit_ledger_entries (
    tenant_id, data_scope, created_by, group_id, member_id, entry_type, entry_date,
    amount, description, reference_no, status
  ) values (
    v_tenant, v_scope, auth.uid(), v_payout.group_id, v_payout.member_id, 'payout', current_date,
    v_amount,
    coalesce(nullif(p_payload->>'description', ''), 'Winner payout payment'),
    coalesce(v_payment_ref, 'payout-payment:' || v_idempotency),
    'posted'
  )
  on conflict (tenant_id, data_scope, reference_no) do nothing
  returning id into v_ledger_id;

  return jsonb_build_object(
    'idempotent', false,
    'payout_id', v_payout.id,
    'status', v_payout.status,
    'paid_amount', v_payout.paid_amount,
    'balance_amount', v_payout.balance_amount,
    'finance_id', v_finance_id,
    'ledger_id', v_ledger_id
  );
end;
$$;

revoke all on function public.record_chit_payout_payment(jsonb) from public, anon;
grant execute on function public.record_chit_payout_payment(jsonb) to authenticated;

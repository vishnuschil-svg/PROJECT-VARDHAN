-- DEPENDS_ON: 007_chit_winner_payout_durability.sql
-- Immutable confirmed winner history + authorized soft-cancel correction.

create or replace function public.enforce_chit_winner_immutability()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '22023', message = 'Confirmed winner history cannot be deleted.';
  end if;

  if upper(coalesce(old.status, '')) = 'CONFIRMED' then
    if new.group_id is distinct from old.group_id
      or new.member_id is distinct from old.member_id
      or new.month_number is distinct from old.month_number
      or new.winner_mode is distinct from old.winner_mode
      or new.bid_amount is distinct from old.bid_amount
      or new.bid_percentage is distinct from old.bid_percentage
      or new.prize_amount is distinct from old.prize_amount
      or new.payout_amount is distinct from old.payout_amount
      or new.dividend_amount is distinct from old.dividend_amount
      or new.commission_amount is distinct from old.commission_amount
      or new.organizer_profit is distinct from old.organizer_profit
      or new.auction_id is distinct from old.auction_id
      or new.lucky_draw_id is distinct from old.lucky_draw_id
    then
      raise exception using errcode = '22023',
        message = 'Confirmed winner financial history is immutable.';
    end if;

    if upper(coalesce(new.status, '')) not in ('CONFIRMED', 'CANCELLED') then
      raise exception using errcode = '22023',
        message = 'Confirmed winners may only remain confirmed or be cancelled with a reason.';
    end if;

    if upper(coalesce(new.status, '')) = 'CANCELLED'
      and coalesce(nullif(trim(new.cancellation_reason), ''), '') = '' then
      raise exception using errcode = '22023',
        message = 'Winner cancellation requires a reason.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_chit_winner_immutability on public.chit_winners;
create trigger enforce_chit_winner_immutability
  before update or delete on public.chit_winners
  for each row execute function public.enforce_chit_winner_immutability();

create or replace function public.cancel_chit_winner_event(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tenant text := nullif(trim(p_payload->>'tenant_id'), '');
  v_scope text := nullif(trim(p_payload->>'data_scope'), '');
  v_winner_id uuid := nullif(p_payload->>'winner_id', '')::uuid;
  v_reason text := nullif(trim(p_payload->>'reason'), '');
  v_cancelled_by text := coalesce(nullif(p_payload->>'cancelled_by', ''), auth.uid()::text);
  v_winner public.chit_winners%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;
  if v_tenant is null or v_scope is null or v_winner_id is null then
    raise exception using errcode = '22023', message = 'tenant_id, data_scope and winner_id are required.';
  end if;
  if v_reason is null then
    raise exception using errcode = '22023', message = 'Winner cancellation requires a reason.';
  end if;
  if not (
    public.is_platform_owner()
    or public.has_tenant_role(v_tenant, v_scope, array['owner','admin']::text[])
  ) then
    raise exception using errcode = '42501', message = 'Unauthorized role for winner correction.';
  end if;

  select * into v_winner
  from public.chit_winners
  where id = v_winner_id and tenant_id = v_tenant and data_scope = v_scope
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Winner was not found.';
  end if;
  if upper(v_winner.status) = 'CANCELLED' then
    return jsonb_build_object('idempotent', true, 'winner_id', v_winner.id, 'status', v_winner.status);
  end if;
  if upper(v_winner.status) <> 'CONFIRMED' then
    raise exception using errcode = '22023', message = 'Only confirmed winners can be cancelled.';
  end if;

  update public.chit_winners
  set status = 'CANCELLED',
      cancelled_by = v_cancelled_by,
      cancelled_at = now(),
      cancellation_reason = v_reason,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'correction', true,
        'cancelled_at', now()
      ),
      updated_at = now()
  where id = v_winner_id
  returning * into v_winner;

  update public.chit_payouts
  set status = 'CANCELLED',
      notes = coalesce(notes || E'\n', '') || ('Cancelled with winner: ' || v_reason),
      updated_at = now()
  where winner_id = v_winner_id
    and tenant_id = v_tenant
    and data_scope = v_scope
    and upper(status) not in ('CANCELLED', 'PAID');

  return jsonb_build_object(
    'idempotent', false,
    'winner_id', v_winner.id,
    'status', v_winner.status,
    'cancellation_reason', v_winner.cancellation_reason
  );
end;
$$;

revoke all on function public.cancel_chit_winner_event(jsonb) from public, anon;
grant execute on function public.cancel_chit_winner_event(jsonb) to authenticated;

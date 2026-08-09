-- DEPENDS_ON: 012_annual_subscriptions_referrals_marketing.sql
-- Razorpay checkout attempt and provider identity mapping. No provider secret is stored here.
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

create table if not exists public.payment_checkout_attempts (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null,
  workspace_id uuid not null, user_id uuid not null references auth.users(id) on delete restrict,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  plan_code text not null, plan_version integer not null, plan_name_snapshot text not null,
  amount_paise bigint not null, currency text not null, billing_period text not null,
  max_active_chits_snapshot integer, provider text not null default 'razorpay', provider_mode text not null,
  provider_order_id text, provider_payment_id text, state text not null default 'CREATED',
  client_idempotency_key text not null, provider_receipt text not null, callback_verified_at timestamptz,
  webhook_event_id uuid references public.provider_webhook_events(id) on delete restrict,
  subscription_payment_id uuid references public.subscription_payments(id) on delete restrict,
  failure_code text, failure_description text, expires_at timestamptz not null,
  activated_at timestamptz, refunded_at timestamptz, reversed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint payment_checkout_attempts_workspace_scope_fk foreign key (workspace_id,tenant_id,data_scope)
    references public.workspaces(id,tenant_id,data_scope) on delete restrict,
  constraint payment_checkout_attempts_idempotency_unique unique (workspace_id,user_id,client_idempotency_key),
  constraint payment_checkout_attempts_receipt_unique unique (provider,provider_receipt),
  constraint payment_checkout_attempts_order_unique unique (provider,provider_order_id),
  constraint payment_checkout_attempts_payment_unique unique (provider,provider_payment_id),
  constraint payment_checkout_attempts_amount_check check (amount_paise > 0),
  constraint payment_checkout_attempts_period_check check (billing_period = 'ANNUAL'),
  constraint payment_checkout_attempts_mode_check check (provider_mode in ('TEST','LIVE')),
  constraint payment_checkout_attempts_state_check check (state in ('CREATED','ORDER_CREATED','CUSTOMER_ACTION_PENDING','PAYMENT_REPORTED','VERIFIED','CAPTURED','SUBSCRIPTION_ACTIVATED','FAILED','CANCELLED','EXPIRED','REFUNDED','REVERSED'))
);

select pg_temp.vardhan_add_missing_columns('public.payment_checkout_attempts'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","workspace_id":"uuid","user_id":"uuid","plan_id":"uuid","plan_code":"text","plan_version":"integer","plan_name_snapshot":"text","amount_paise":"bigint","currency":"text","billing_period":"text","max_active_chits_snapshot":"integer","provider":"text default ''razorpay''","provider_mode":"text","provider_order_id":"text","provider_payment_id":"text","state":"text default ''CREATED''","client_idempotency_key":"text","provider_receipt":"text","callback_verified_at":"timestamptz","webhook_event_id":"uuid","subscription_payment_id":"uuid","failure_code":"text","failure_description":"text","expires_at":"timestamptz","activated_at":"timestamptz","refunded_at":"timestamptz","reversed_at":"timestamptz","created_at":"timestamptz default now()","updated_at":"timestamptz default now()"}'::jsonb);

create index if not exists idx_payment_attempts_workspace on public.payment_checkout_attempts(workspace_id,created_at desc);
create index if not exists idx_payment_attempts_state on public.payment_checkout_attempts(state,expires_at);

create or replace function public.enforce_payment_attempt_transition()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
declare allowed boolean := false;
begin
  if new.state = old.state then return new; end if;
  allowed := case old.state
    when 'CREATED' then new.state in ('ORDER_CREATED','FAILED','CANCELLED','EXPIRED')
    when 'ORDER_CREATED' then new.state in ('CUSTOMER_ACTION_PENDING','PAYMENT_REPORTED','VERIFIED','CAPTURED','FAILED','CANCELLED','EXPIRED')
    when 'CUSTOMER_ACTION_PENDING' then new.state in ('PAYMENT_REPORTED','VERIFIED','CAPTURED','FAILED','CANCELLED','EXPIRED')
    when 'PAYMENT_REPORTED' then new.state in ('VERIFIED','CAPTURED','FAILED','EXPIRED')
    when 'VERIFIED' then new.state in ('CAPTURED','FAILED','EXPIRED')
    when 'CAPTURED' then new.state in ('SUBSCRIPTION_ACTIVATED','REFUNDED','REVERSED')
    when 'SUBSCRIPTION_ACTIVATED' then new.state in ('REFUNDED','REVERSED')
    when 'REFUNDED' then new.state = 'REVERSED'
    else false end;
  if not allowed then raise exception 'INVALID_PAYMENT_STATE_TRANSITION: % -> %',old.state,new.state; end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists payment_attempt_state_guard on public.payment_checkout_attempts;
create trigger payment_attempt_state_guard before update of state on public.payment_checkout_attempts
for each row execute function public.enforce_payment_attempt_transition();

create or replace function public.process_verified_payment_reversal(p_provider_payment_id text,p_status text,p_webhook_event_id uuid,p_reason text)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
declare v_payment public.subscription_payments%rowtype; v_reward public.referral_rewards%rowtype;
  v_subscription public.billing_subscriptions%rowtype; v_new_expiry timestamptz; v_audit_id uuid;
begin
  if p_status not in ('REFUNDED','REVERSED') then raise exception 'unsupported reversal status'; end if;
  if not exists(select 1 from public.provider_webhook_events where id=p_webhook_event_id and verified=true) then raise exception 'verified webhook event required'; end if;
  select * into v_payment from public.subscription_payments where provider='razorpay' and provider_payment_id=p_provider_payment_id for update;
  if not found then raise exception 'subscription payment not found'; end if;
  if v_payment.status in ('REFUNDED','REVERSED') then return v_payment.id; end if;
  update public.subscription_payments set status=p_status where id=v_payment.id;
  update public.billing_subscriptions set status='PAST_DUE',updated_at=now() where id=v_payment.subscription_id;
  for v_reward in select * from public.referral_rewards where source_payment_id=v_payment.id and status='GRANTED' for update loop
    select * into v_subscription from public.billing_subscriptions where id=v_reward.subscription_id for update;
    v_new_expiry:=greatest(v_subscription.paid_entitlement_ends_at,public.vardhan_add_calendar_months(v_subscription.entitlement_ends_at,-2));
    insert into public.referral_rewards(referral_id,subscription_id,source_payment_id,months,status,previous_expiry,new_expiry,reversal_of,reason)
    values(v_reward.referral_id,v_reward.subscription_id,v_reward.source_payment_id,2,'REVERSED',v_subscription.entitlement_ends_at,v_new_expiry,v_reward.id,p_reason);
    update public.billing_subscriptions set entitlement_ends_at=v_new_expiry,updated_at=now() where id=v_subscription.id;
    update public.referrals set status='REVERSED',rejected_reason=p_reason where id=v_reward.referral_id;
  end loop;
  insert into public.growth_audit_events(entity_type,entity_id,action,reason,previous_state,new_state,created_by)
  values('SUBSCRIPTION_PAYMENT',v_payment.id,p_status,p_reason,to_jsonb(v_payment),jsonb_build_object('status',p_status,'webhook_event_id',p_webhook_event_id),coalesce((select created_by from public.billing_subscriptions where id=v_payment.subscription_id),(select user_id from public.payment_checkout_attempts where provider_payment_id=p_provider_payment_id)))
  returning id into v_audit_id;
  return v_audit_id;
end;
$$;

alter table public.payment_checkout_attempts enable row level security;
alter table public.payment_checkout_attempts force row level security;
drop policy if exists payment_checkout_attempts_select on public.payment_checkout_attempts;
create policy payment_checkout_attempts_select on public.payment_checkout_attempts for select
using (public.is_platform_owner() or (user_id=auth.uid() and public.has_active_membership(tenant_id,data_scope)));

revoke all on public.payment_checkout_attempts from public,anon,authenticated;
grant select on public.payment_checkout_attempts to authenticated;
revoke all on function public.process_verified_payment_reversal(text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.process_verified_payment_reversal(text,text,uuid,text) to service_role;

commit;

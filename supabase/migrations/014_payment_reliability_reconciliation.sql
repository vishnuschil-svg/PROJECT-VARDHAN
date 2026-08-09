-- DEPENDS_ON: 013_razorpay_payment_integration.sql
-- Additive recovery metadata and immutable reconciliation diagnostics.
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

alter table public.payment_checkout_attempts add column if not exists last_provider_check_at timestamptz;
alter table public.payment_checkout_attempts add column if not exists next_reconcile_at timestamptz;
alter table public.payment_checkout_attempts add column if not exists reconcile_attempt_count integer not null default 0;
alter table public.payment_checkout_attempts add column if not exists provider_last_status text;
alter table public.payment_checkout_attempts add column if not exists last_error_code text;
alter table public.payment_checkout_attempts add column if not exists reconcile_lock_token uuid;
alter table public.payment_checkout_attempts add column if not exists reconcile_lock_until timestamptz;

alter table public.payment_checkout_attempts drop constraint if exists payment_checkout_attempts_state_check;
alter table public.payment_checkout_attempts add constraint payment_checkout_attempts_state_check
check (state in ('CREATED','ORDER_CREATED','CUSTOMER_ACTION_PENDING','PAYMENT_REPORTED','VERIFIED','VERIFYING','PENDING_CONFIRMATION','CAPTURED','SUBSCRIPTION_ACTIVATED','FAILED','CANCELLED','EXPIRED','REFUNDED','REVERSED'));

create table if not exists public.payment_reconciliation_events (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null,
  workspace_id uuid not null, attempt_id uuid not null references public.payment_checkout_attempts(id) on delete restrict,
  event_type text not null, provider_status text, error_code text, actor_type text not null,
  actor_user_id uuid references auth.users(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  constraint payment_reconciliation_events_scope_fk foreign key (workspace_id,tenant_id,data_scope)
    references public.workspaces(id,tenant_id,data_scope) on delete restrict,
  constraint payment_reconciliation_events_actor_check check (actor_type in ('CUSTOMER_STATUS','ADMIN','SCHEDULED_JOB','WEBHOOK','SYSTEM'))
);

select pg_temp.vardhan_add_missing_columns('public.payment_reconciliation_events'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","workspace_id":"uuid","attempt_id":"uuid","event_type":"text","provider_status":"text","error_code":"text","actor_type":"text","actor_user_id":"uuid references auth.users(id) on delete restrict","metadata":"jsonb default ''{}''::jsonb","created_at":"timestamptz default now()"}'::jsonb);

create index if not exists idx_payment_attempts_reconcile_due on public.payment_checkout_attempts(next_reconcile_at,state) where state in ('ORDER_CREATED','CUSTOMER_ACTION_PENDING','PAYMENT_REPORTED','VERIFYING','PENDING_CONFIRMATION');
create unique index if not exists idx_payment_attempts_one_unresolved_purchase
on public.payment_checkout_attempts(workspace_id,plan_code)
where state in ('ORDER_CREATED','CUSTOMER_ACTION_PENDING','PAYMENT_REPORTED','VERIFIED','VERIFYING','PENDING_CONFIRMATION','CAPTURED');
create index if not exists idx_payment_reconciliation_timeline on public.payment_reconciliation_events(attempt_id,created_at desc);

create or replace function public.enforce_payment_attempt_transition()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
declare allowed boolean := false;
begin
  if new.state = old.state then return new; end if;
  allowed := case old.state
    when 'CREATED' then new.state in ('ORDER_CREATED','FAILED','CANCELLED','EXPIRED')
    when 'ORDER_CREATED' then new.state in ('CUSTOMER_ACTION_PENDING','PAYMENT_REPORTED','VERIFYING','PENDING_CONFIRMATION','CAPTURED','FAILED','CANCELLED','EXPIRED')
    when 'CUSTOMER_ACTION_PENDING' then new.state in ('PAYMENT_REPORTED','VERIFYING','PENDING_CONFIRMATION','CAPTURED','FAILED','CANCELLED','EXPIRED')
    when 'PAYMENT_REPORTED' then new.state in ('VERIFYING','PENDING_CONFIRMATION','CAPTURED','FAILED','EXPIRED')
    when 'VERIFYING' then new.state in ('PENDING_CONFIRMATION','CAPTURED','FAILED','EXPIRED')
    when 'PENDING_CONFIRMATION' then new.state in ('VERIFYING','CAPTURED','FAILED','EXPIRED')
    when 'VERIFIED' then new.state in ('VERIFYING','PENDING_CONFIRMATION','CAPTURED','FAILED','EXPIRED')
    when 'CAPTURED' then new.state in ('SUBSCRIPTION_ACTIVATED','REFUNDED','REVERSED')
    when 'SUBSCRIPTION_ACTIVATED' then new.state in ('REFUNDED','REVERSED')
    -- A delayed provider capture is authoritative even after our local timeout/failure view.
    when 'FAILED' then new.state = 'CAPTURED'
    when 'EXPIRED' then new.state = 'CAPTURED'
    when 'REFUNDED' then new.state = 'REVERSED'
    else false end;
  if not allowed then raise exception 'INVALID_PAYMENT_STATE_TRANSITION: % -> %',old.state,new.state; end if;
  new.updated_at := now();
  return new;
end;
$$;

alter table public.payment_reconciliation_events enable row level security;
alter table public.payment_reconciliation_events force row level security;
drop policy if exists payment_reconciliation_events_select on public.payment_reconciliation_events;
create policy payment_reconciliation_events_select on public.payment_reconciliation_events for select
using (public.is_platform_owner() or exists(select 1 from public.payment_checkout_attempts a where a.id=payment_reconciliation_events.attempt_id and a.user_id=auth.uid() and public.has_active_membership(a.tenant_id,a.data_scope)));
revoke all on public.payment_reconciliation_events from public,anon,authenticated;
grant select on public.payment_reconciliation_events to authenticated;

commit;

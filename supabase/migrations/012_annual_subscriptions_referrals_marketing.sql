-- DEPENDS_ON: 011_customer_auth_onboarding.sql
-- Annual subscriptions, verified referral rewards, and real campaign telemetry.
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

alter table public.user_profiles add column if not exists referral_code text;
alter table public.user_profiles add column if not exists referred_by_user_id uuid references auth.users(id) on delete set null;
alter table public.user_profiles add column if not exists referral_attributed_at timestamptz;

alter table public.billing_subscriptions add column if not exists plan_code text;
alter table public.billing_subscriptions add column if not exists plan_version integer;
alter table public.billing_subscriptions add column if not exists plan_name_snapshot text;
alter table public.billing_subscriptions add column if not exists price_paise_snapshot bigint;
alter table public.billing_subscriptions add column if not exists currency_snapshot text;
alter table public.billing_subscriptions add column if not exists billing_period_snapshot text;
alter table public.billing_subscriptions add column if not exists max_active_chits_snapshot integer;
alter table public.billing_subscriptions add column if not exists paid_entitlement_ends_at timestamptz;
alter table public.billing_subscriptions add column if not exists entitlement_ends_at timestamptz;
alter table public.billing_subscriptions add column if not exists first_paid_at timestamptz;
alter table public.billing_subscriptions add column if not exists active_chit_count integer not null default 0;

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(), product_id text not null, plan_code text not null,
  version integer not null, plan_name text not null, price_paise bigint not null, currency text not null,
  billing_period text not null, max_active_chits integer, status text not null default 'ACTIVE',
  effective_from timestamptz not null default now(), effective_to timestamptz, created_at timestamptz not null default now(),
  constraint subscription_plans_identity_unique unique (product_id,plan_code,version),
  constraint subscription_plans_price_check check (price_paise > 0),
  constraint subscription_plans_period_check check (billing_period = 'ANNUAL'),
  constraint subscription_plans_limit_check check (max_active_chits is null or max_active_chits > 0)
);

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null, workspace_id uuid not null,
  subscription_id uuid not null references public.billing_subscriptions(id) on delete restrict,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  provider text not null, provider_order_id text, provider_payment_id text not null, webhook_event_id uuid not null references public.provider_webhook_events(id) on delete restrict,
  idempotency_key text not null, amount_paise bigint not null, currency text not null, status text not null,
  verified_at timestamptz, created_at timestamptz not null default now(),
  constraint subscription_payments_idempotency_unique unique (provider,idempotency_key),
  constraint subscription_payments_provider_id_unique unique (provider,provider_payment_id),
  constraint subscription_payments_status_check check (status in ('PENDING','SUCCESS','FAILED','REFUNDED','REVERSED'))
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(), referral_code text not null,
  referrer_user_id uuid not null references auth.users(id) on delete restrict, referred_user_id uuid not null references auth.users(id) on delete restrict,
  referrer_workspace_id uuid references public.workspaces(id) on delete set null, referred_workspace_id uuid references public.workspaces(id) on delete set null,
  status text not null default 'PENDING', qualifying_payment_id uuid references public.subscription_payments(id) on delete restrict,
  reward_months integer not null default 2, attributed_at timestamptz not null default now(), qualified_at timestamptz, rewarded_at timestamptz,
  rejected_at timestamptz, rejected_reason text, fraud_flag boolean not null default false,
  constraint referrals_referred_unique unique (referred_user_id),
  constraint referrals_no_self_check check (referrer_user_id <> referred_user_id),
  constraint referrals_reward_check check (reward_months = 2),
  constraint referrals_status_check check (status in ('PENDING','QUALIFIED','REWARDED','REJECTED','REVERSED'))
);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(), referral_id uuid not null references public.referrals(id) on delete restrict,
  subscription_id uuid not null references public.billing_subscriptions(id) on delete restrict,
  source_payment_id uuid not null references public.subscription_payments(id) on delete restrict,
  months integer not null default 2, status text not null default 'GRANTED', previous_expiry timestamptz not null, new_expiry timestamptz not null,
  reversal_of uuid references public.referral_rewards(id) on delete restrict, reason text, created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  constraint referral_rewards_months_check check (months = 2),
  constraint referral_rewards_status_check check (status in ('GRANTED','REVERSED'))
);

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(), name text not null, campaign_type text not null default 'ANNOUNCEMENT', title text,
  short_message text, cta_label text, cta_target text, priority integer not null default 0, status text not null default 'DRAFT',
  placements text[] not null default '{}', audiences text[] not null default '{ALL}', creative jsonb not null default '{}'::jsonb,
  starts_at timestamptz, ends_at timestamptz, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint marketing_campaigns_status_check check (status in ('DRAFT','ACTIVE','PAUSED','ENDED')),
  constraint marketing_campaigns_priority_check check (priority between 0 and 100),
  constraint marketing_campaigns_dates_check check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table if not exists public.marketing_events (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.marketing_campaigns(id) on delete restrict,
  tenant_id text, workspace_id uuid references public.workspaces(id) on delete set null, user_id uuid references auth.users(id) on delete set null,
  event_type text not null, placement text not null, dedupe_key text, created_at timestamptz not null default now(),
  constraint marketing_events_type_check check (event_type in ('IMPRESSION','CLICK','REFERRAL_LANDING','REGISTRATION','VERIFIED_ACCOUNT','PAID_CONVERSION')),
  constraint marketing_events_dedupe_unique unique (campaign_id,dedupe_key)
);

create table if not exists public.growth_audit_events (
  id uuid primary key default gen_random_uuid(), entity_type text not null, entity_id uuid not null, action text not null,
  reason text not null, previous_state jsonb not null, new_state jsonb not null, created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);

select pg_temp.vardhan_add_missing_columns('public.subscription_plans'::regclass, '{"id":"uuid default gen_random_uuid()","product_id":"text","plan_code":"text","version":"integer","plan_name":"text","price_paise":"bigint","currency":"text","billing_period":"text","max_active_chits":"integer","status":"text default ''ACTIVE''","effective_from":"timestamptz default now()","effective_to":"timestamptz","created_at":"timestamptz default now()"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.subscription_payments'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","workspace_id":"uuid","subscription_id":"uuid","plan_id":"uuid","provider":"text","provider_order_id":"text","provider_payment_id":"text","webhook_event_id":"uuid","idempotency_key":"text","amount_paise":"bigint","currency":"text","status":"text","verified_at":"timestamptz","created_at":"timestamptz default now()"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.referrals'::regclass, '{"id":"uuid default gen_random_uuid()","referral_code":"text","referrer_user_id":"uuid","referred_user_id":"uuid","referrer_workspace_id":"uuid","referred_workspace_id":"uuid","status":"text default ''PENDING''","qualifying_payment_id":"uuid","reward_months":"integer default 2","attributed_at":"timestamptz default now()","qualified_at":"timestamptz","rewarded_at":"timestamptz","rejected_at":"timestamptz","rejected_reason":"text","fraud_flag":"boolean default false"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.referral_rewards'::regclass, '{"id":"uuid default gen_random_uuid()","referral_id":"uuid","subscription_id":"uuid","source_payment_id":"uuid","months":"integer default 2","status":"text default ''GRANTED''","previous_expiry":"timestamptz","new_expiry":"timestamptz","reversal_of":"uuid","reason":"text","created_by":"uuid","created_at":"timestamptz default now()"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.marketing_campaigns'::regclass, '{"id":"uuid default gen_random_uuid()","name":"text","campaign_type":"text default ''ANNOUNCEMENT''","title":"text","short_message":"text","cta_label":"text","cta_target":"text","priority":"integer default 0","status":"text default ''DRAFT''","placements":"text[] default ''{}''","audiences":"text[] default ''{ALL}''","creative":"jsonb default ''{}''::jsonb","starts_at":"timestamptz","ends_at":"timestamptz","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.marketing_events'::regclass, '{"id":"uuid default gen_random_uuid()","campaign_id":"uuid","tenant_id":"text","workspace_id":"uuid","user_id":"uuid","event_type":"text","placement":"text","dedupe_key":"text","created_at":"timestamptz default now()"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.growth_audit_events'::regclass, '{"id":"uuid default gen_random_uuid()","entity_type":"text","entity_id":"uuid","action":"text","reason":"text","previous_state":"jsonb","new_state":"jsonb","created_by":"uuid","created_at":"timestamptz default now()"}'::jsonb);

insert into public.subscription_plans (product_id,plan_code,version,plan_name,price_paise,currency,billing_period,max_active_chits,status)
values ('chit_management','STARTER',1,'Starter',149900,'INR','ANNUAL',1,'ACTIVE'),
       ('chit_management','GROWTH',1,'Growth',299900,'INR','ANNUAL',3,'ACTIVE'),
       ('chit_management','BUSINESS',1,'Business',499900,'INR','ANNUAL',null,'ACTIVE')
on conflict (product_id,plan_code,version) do nothing;

create unique index if not exists idx_user_profiles_referral_code on public.user_profiles(referral_code) where referral_code is not null;
create index if not exists idx_subscription_payments_workspace on public.subscription_payments(workspace_id,created_at desc);
create index if not exists idx_referrals_referrer on public.referrals(referrer_user_id,status);
create unique index if not exists idx_referral_rewards_grant_once on public.referral_rewards(referral_id) where status='GRANTED';
create unique index if not exists idx_referral_rewards_reversal_once on public.referral_rewards(reversal_of) where reversal_of is not null;
create index if not exists idx_marketing_events_campaign on public.marketing_events(campaign_id,event_type,created_at desc);

create or replace function public.vardhan_add_calendar_months(p_value timestamptz, p_months integer)
returns timestamptz language sql immutable strict
set search_path = pg_catalog
as $$
  select (date_trunc('month', p_value) + make_interval(months => p_months)
    + make_interval(days => least(extract(day from p_value)::integer,
      extract(day from (date_trunc('month', p_value) + make_interval(months => p_months + 1) - interval '1 day'))::integer) - 1)
    + (p_value - date_trunc('day', p_value)))::timestamptz
$$;

create or replace function public.ensure_customer_referral_code()
returns text language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
declare v_code text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select referral_code into v_code from public.user_profiles where id = auth.uid() for update;
  if not found then raise exception 'verified profile required'; end if;
  if v_code is null then
    v_code := 'VARDHAN-' || upper(substr(replace(auth.uid()::text,'-',''),1,10));
    update public.user_profiles set referral_code = v_code where id = auth.uid();
  end if;
  return v_code;
end;
$$;

create or replace function public.capture_referral_attribution()
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
declare v_code text; v_referrer public.user_profiles%rowtype; v_referred public.user_profiles%rowtype; v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_referred from public.user_profiles where id = auth.uid();
  if not found then raise exception 'verified profile required'; end if;
  select upper(trim(coalesce(raw_user_meta_data->>'referral_code',''))) into v_code from auth.users where id = auth.uid();
  if v_code = '' or v_referred.referred_by_user_id is not null then return null; end if;
  select * into v_referrer from public.user_profiles where referral_code = v_code;
  if not found then return null; end if;
  if v_referrer.id = auth.uid() then raise exception 'self referral is not allowed'; end if;
  insert into public.referrals(referral_code,referrer_user_id,referred_user_id,referrer_workspace_id,referred_workspace_id)
  values(v_code,v_referrer.id,auth.uid(),v_referrer.workspace_id,v_referred.workspace_id)
  on conflict (referred_user_id) do nothing returning id into v_id;
  if v_id is not null then update public.user_profiles set referred_by_user_id=v_referrer.id,referral_attributed_at=now() where id=auth.uid(); end if;
  if v_id is not null then insert into public.growth_audit_events(entity_type,entity_id,action,reason,previous_state,new_state,created_by) values('REFERRAL',v_id,'ATTRIBUTED','verified signup referral attribution','{}'::jsonb,jsonb_build_object('status','PENDING','referrer_user_id',v_referrer.id),auth.uid()); end if;
  return v_id;
end;
$$;

create or replace function public.protect_subscription_snapshot()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.plan_code is not null and (new.plan_code,new.plan_version,new.plan_name_snapshot,new.price_paise_snapshot,new.currency_snapshot,new.billing_period_snapshot,new.max_active_chits_snapshot)
    is distinct from (old.plan_code,old.plan_version,old.plan_name_snapshot,old.price_paise_snapshot,old.currency_snapshot,old.billing_period_snapshot,old.max_active_chits_snapshot) then
    raise exception 'purchased plan snapshot is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists billing_subscription_snapshot_immutable on public.billing_subscriptions;
create trigger billing_subscription_snapshot_immutable before update on public.billing_subscriptions
for each row execute function public.protect_subscription_snapshot();

create or replace function public.enforce_paid_active_chit_limit()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_subscription public.billing_subscriptions%rowtype; v_was_counted boolean; v_is_counted boolean;
begin
  v_was_counted := tg_op <> 'INSERT' and lower(coalesce(old.status,'')) in ('active','upcoming');
  v_is_counted := tg_op <> 'DELETE' and lower(coalesce(new.status,'')) in ('active','upcoming');
  if v_was_counted = v_is_counted then return coalesce(new,old); end if;
  select * into v_subscription from public.billing_subscriptions
    where workspace_id=coalesce(new.workspace_id,old.workspace_id) and product_id='chit_management'
      and upper(status) in ('ACTIVE','GRACE') and entitlement_ends_at >= now()
    order by entitlement_ends_at desc limit 1 for update;
  if not found then return coalesce(new,old); end if;
  if v_is_counted then
    if v_subscription.max_active_chits_snapshot is not null and v_subscription.active_chit_count >= v_subscription.max_active_chits_snapshot then
      raise exception 'PLAN_ACTIVE_CHIT_LIMIT_REACHED';
    end if;
    update public.billing_subscriptions set active_chit_count=active_chit_count+1,updated_at=now() where id=v_subscription.id;
  else
    update public.billing_subscriptions set active_chit_count=greatest(active_chit_count-1,0),updated_at=now() where id=v_subscription.id;
  end if;
  return coalesce(new,old);
end;
$$;

drop trigger if exists chit_groups_paid_plan_limit on public.chit_groups;
create trigger chit_groups_paid_plan_limit before insert or update of status or delete on public.chit_groups
for each row execute function public.enforce_paid_active_chit_limit();

create or replace function public.process_verified_annual_payment(
  p_webhook_event_id uuid, p_workspace_id uuid, p_plan_code text, p_provider_payment_id text,
  p_provider_order_id text, p_idempotency_key text, p_actor_user_id uuid
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
declare v_event public.provider_webhook_events%rowtype; v_plan public.subscription_plans%rowtype; v_workspace public.workspaces%rowtype;
  v_subscription public.billing_subscriptions%rowtype; v_payment_id uuid; v_period_end timestamptz; v_has_previous boolean; v_referral public.referrals%rowtype; v_qualified_id uuid;
  v_referrer_subscription public.billing_subscriptions%rowtype; v_old_expiry timestamptz; v_new_expiry timestamptz;
  v_event_amount bigint; v_event_currency text;
begin
  select * into v_event from public.provider_webhook_events where id=p_webhook_event_id and verified=true;
  if not found then raise exception 'verified webhook event required'; end if;
  select * into v_plan from public.subscription_plans where product_id='chit_management' and plan_code=upper(p_plan_code) and status='ACTIVE' order by version desc limit 1;
  if not found or v_plan.billing_period <> 'ANNUAL' then raise exception 'active annual plan required'; end if;
  select * into v_workspace from public.workspaces where id=p_workspace_id;
  if not found or v_workspace.tenant_id<>v_event.tenant_id or v_workspace.data_scope<>v_event.data_scope then raise exception 'webhook workspace scope mismatch'; end if;
  if not exists(select 1 from public.user_profiles where id=p_actor_user_id and workspace_id=p_workspace_id) then raise exception 'payment actor workspace mismatch'; end if;
  v_event_amount:=coalesce(nullif(v_event.payload->>'amount_paise',''),nullif(v_event.payload#>>'{payment,amount_paise}',''),nullif(v_event.payload#>>'{payload,payment,entity,amount}',''))::bigint;
  v_event_currency:=upper(coalesce(nullif(v_event.payload->>'currency',''),nullif(v_event.payload#>>'{payment,currency}',''),nullif(v_event.payload#>>'{payload,payment,entity,currency}','')));
  if v_event_amount is distinct from v_plan.price_paise or v_event_currency is distinct from v_plan.currency then raise exception 'verified payment amount or currency mismatch'; end if;
  select id into v_payment_id from public.subscription_payments where provider=v_event.provider and idempotency_key=p_idempotency_key;
  if found then return v_payment_id; end if;
  select * into v_subscription from public.billing_subscriptions where workspace_id=p_workspace_id and product_id='chit_management' and plan_code=v_plan.plan_code order by created_at desc limit 1 for update;
  if not found then
    insert into public.billing_subscriptions(tenant_id,data_scope,workspace_id,created_by,product_id,provider,provider_subscription_id,status,plan_code,plan_version,plan_name_snapshot,price_paise_snapshot,currency_snapshot,billing_period_snapshot,max_active_chits_snapshot,active_chit_count)
    values(v_workspace.tenant_id,v_workspace.data_scope,p_workspace_id,p_actor_user_id,'chit_management',v_event.provider,'payment:'||p_provider_payment_id,'PENDING',v_plan.plan_code,v_plan.version,v_plan.plan_name,v_plan.price_paise,v_plan.currency,v_plan.billing_period,v_plan.max_active_chits,(select count(*) from public.chit_groups where workspace_id=p_workspace_id and lower(status) in ('active','upcoming')))
    returning * into v_subscription;
  end if;
  select exists(select 1 from public.subscription_payments where workspace_id=p_workspace_id and status='SUCCESS') into v_has_previous;
  insert into public.subscription_payments(tenant_id,data_scope,workspace_id,subscription_id,plan_id,provider,provider_order_id,provider_payment_id,webhook_event_id,idempotency_key,amount_paise,currency,status,verified_at)
  values(v_workspace.tenant_id,v_workspace.data_scope,p_workspace_id,v_subscription.id,v_plan.id,v_event.provider,p_provider_order_id,p_provider_payment_id,p_webhook_event_id,p_idempotency_key,v_plan.price_paise,v_plan.currency,'SUCCESS',now())
  on conflict (provider,idempotency_key) do update set idempotency_key=excluded.idempotency_key returning id into v_payment_id;
  if v_subscription.status='ACTIVE' and v_subscription.paid_entitlement_ends_at>now() then v_period_end:=public.vardhan_add_calendar_months(v_subscription.paid_entitlement_ends_at,12); else v_period_end:=public.vardhan_add_calendar_months(now(),12); end if;
  update public.billing_subscriptions set status='ACTIVE',first_paid_at=coalesce(first_paid_at,now()),paid_entitlement_ends_at=v_period_end,entitlement_ends_at=greatest(coalesce(entitlement_ends_at,v_period_end),v_period_end),current_period_end=v_period_end,updated_at=now() where id=v_subscription.id;
  update public.billing_subscriptions set status='CANCELLED',updated_at=now() where workspace_id=p_workspace_id and product_id='chit_management' and id<>v_subscription.id and status in ('ACTIVE','PAST_DUE','GRACE');
  insert into public.growth_audit_events(entity_type,entity_id,action,reason,previous_state,new_state,created_by)
  values('SUBSCRIPTION',v_subscription.id,case when v_has_previous then 'RENEWED' else 'ACTIVATED' end,'verified annual payment',to_jsonb(v_subscription),jsonb_build_object('status','ACTIVE','payment_id',v_payment_id,'period_end',v_period_end),p_actor_user_id);
  if not v_has_previous then
    select * into v_referral from public.referrals where referred_user_id=p_actor_user_id and status='PENDING' for update;
    if found then update public.referrals set status='QUALIFIED',qualifying_payment_id=v_payment_id,qualified_at=now() where id=v_referral.id returning id into v_qualified_id; insert into public.growth_audit_events(entity_type,entity_id,action,reason,previous_state,new_state,created_by) values('REFERRAL',v_referral.id,'QUALIFIED','first verified annual payment',to_jsonb(v_referral),jsonb_build_object('status','QUALIFIED','payment_id',v_payment_id),p_actor_user_id); end if;
  end if;
  for v_referral in select * from public.referrals where status='QUALIFIED' and (referrer_user_id=p_actor_user_id or id=v_qualified_id) loop
    select * into v_referrer_subscription from public.billing_subscriptions where workspace_id=(select workspace_id from public.user_profiles where id=v_referral.referrer_user_id) and product_id='chit_management' and status='ACTIVE' and entitlement_ends_at>=now() order by entitlement_ends_at desc limit 1 for update;
    if found then
      v_old_expiry:=v_referrer_subscription.entitlement_ends_at; v_new_expiry:=public.vardhan_add_calendar_months(v_old_expiry,2);
      insert into public.referral_rewards(referral_id,subscription_id,source_payment_id,months,status,previous_expiry,new_expiry,created_by)
      values(v_referral.id,v_referrer_subscription.id,v_referral.qualifying_payment_id,2,'GRANTED',v_old_expiry,v_new_expiry,p_actor_user_id) on conflict do nothing;
      if found then update public.billing_subscriptions set entitlement_ends_at=v_new_expiry,updated_at=now() where id=v_referrer_subscription.id; update public.referrals set status='REWARDED',rewarded_at=now() where id=v_referral.id; insert into public.growth_audit_events(entity_type,entity_id,action,reason,previous_state,new_state,created_by) values('REFERRAL',v_referral.id,'REWARD_GRANTED','verified paid referral',to_jsonb(v_referral),jsonb_build_object('status','REWARDED','months',2,'new_expiry',v_new_expiry),p_actor_user_id); end if;
    end if;
  end loop;
  return v_payment_id;
end;
$$;

create or replace function public.admin_reverse_referral_reward(p_reward_id uuid,p_reason text)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
declare v_reward public.referral_rewards%rowtype; v_subscription public.billing_subscriptions%rowtype; v_new timestamptz; v_audit uuid;
begin
  if not public.is_platform_owner() then raise exception 'platform owner required'; end if;
  if trim(coalesce(p_reason,''))='' then raise exception 'reversal reason required'; end if;
  select * into v_reward from public.referral_rewards where id=p_reward_id and status='GRANTED' for update;
  if not found then raise exception 'active reward not found'; end if;
  select * into v_subscription from public.billing_subscriptions where id=v_reward.subscription_id for update;
  v_new:=greatest(v_subscription.paid_entitlement_ends_at,public.vardhan_add_calendar_months(v_subscription.entitlement_ends_at,-2));
  insert into public.referral_rewards(referral_id,subscription_id,source_payment_id,months,status,previous_expiry,new_expiry,reversal_of,reason,created_by)
  values(v_reward.referral_id,v_reward.subscription_id,v_reward.source_payment_id,2,'REVERSED',v_subscription.entitlement_ends_at,v_new,v_reward.id,p_reason,auth.uid());
  update public.referrals set status='REVERSED',rejected_reason=p_reason where id=v_reward.referral_id;
  update public.billing_subscriptions set entitlement_ends_at=v_new,updated_at=now() where id=v_subscription.id;
  insert into public.growth_audit_events(entity_type,entity_id,action,reason,previous_state,new_state,created_by)
  values('REFERRAL_REWARD',v_reward.id,'REVERSE',p_reason,to_jsonb(v_reward),jsonb_build_object('status','REVERSED','entitlement_ends_at',v_new),auth.uid()) returning id into v_audit;
  return v_audit;
end;
$$;

create or replace function public.admin_reject_referral(p_referral_id uuid,p_reason text)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
declare v_referral public.referrals%rowtype; v_audit uuid;
begin
  if not public.is_platform_owner() then raise exception 'platform owner required'; end if;
  if trim(coalesce(p_reason,''))='' then raise exception 'rejection reason required'; end if;
  select * into v_referral from public.referrals where id=p_referral_id and status in ('PENDING','QUALIFIED') for update;
  if not found then raise exception 'only unrewarded referrals can be rejected'; end if;
  update public.referrals set status='REJECTED',rejected_at=now(),rejected_reason=p_reason where id=v_referral.id;
  insert into public.growth_audit_events(entity_type,entity_id,action,reason,previous_state,new_state,created_by)
  values('REFERRAL',v_referral.id,'REJECT',p_reason,to_jsonb(v_referral),jsonb_build_object('status','REJECTED'),auth.uid()) returning id into v_audit;
  return v_audit;
end;
$$;

do $$
declare v_table text;
begin
  foreach v_table in array array['subscription_plans','subscription_payments','referrals','referral_rewards','marketing_campaigns','marketing_events','growth_audit_events'] loop
    execute format('alter table public.%I enable row level security',v_table);
    execute format('alter table public.%I force row level security',v_table);
  end loop;
end $$;

create policy subscription_plans_read on public.subscription_plans for select using (auth.uid() is not null);
create policy subscription_payments_read on public.subscription_payments for select using (public.is_platform_owner() or public.has_active_membership(tenant_id,data_scope));
create policy referrals_read on public.referrals for select using (public.is_platform_owner() or referrer_user_id=auth.uid() or referred_user_id=auth.uid());
create policy referral_rewards_read on public.referral_rewards for select using (public.is_platform_owner() or exists(select 1 from public.referrals r where r.id=referral_id and (r.referrer_user_id=auth.uid() or r.referred_user_id=auth.uid())));
create policy marketing_campaigns_read on public.marketing_campaigns for select using (auth.uid() is not null and (status='ACTIVE' or public.is_platform_owner()));
create policy marketing_campaigns_admin on public.marketing_campaigns for all using (public.is_platform_owner()) with check (public.is_platform_owner() and created_by=auth.uid());
create policy marketing_events_read on public.marketing_events for select using (public.is_platform_owner());
create policy marketing_events_insert on public.marketing_events for insert with check (auth.uid() is not null and user_id=auth.uid());
create policy growth_audit_events_read on public.growth_audit_events for select using (public.is_platform_owner());

revoke all on function public.ensure_customer_referral_code() from public,anon;
revoke all on function public.capture_referral_attribution() from public,anon;
revoke all on function public.process_verified_annual_payment(uuid,uuid,text,text,text,text,uuid) from public,anon,authenticated;
revoke all on function public.admin_reverse_referral_reward(uuid,text) from public,anon;
revoke all on function public.admin_reject_referral(uuid,text) from public,anon;
grant execute on function public.ensure_customer_referral_code() to authenticated;
grant execute on function public.capture_referral_attribution() to authenticated;
grant execute on function public.process_verified_annual_payment(uuid,uuid,text,text,text,text,uuid) to service_role;
grant execute on function public.admin_reverse_referral_reward(uuid,text) to authenticated;
grant execute on function public.admin_reject_referral(uuid,text) to authenticated;

commit;

-- Read-only/assertion-based staging validation. Run only after confirming the linked project is staging.
-- This script changes no application data and must never be used as a substitute for project identity checks.

do $$
declare
  missing text[];
begin
  select array_agg(required_name) into missing
  from unnest(array[
    'public.payment_checkout_attempts',
    'public.provider_webhook_events',
    'public.payment_reconciliation_events',
    'public.subscription_payments',
    'public.billing_subscriptions',
    'public.referrals',
    'public.referral_rewards'
  ]) required_name
  where to_regclass(required_name) is null;
  if missing is not null then raise exception 'STAGING_READINESS_MISSING_TABLES: %', missing; end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='user_profiles' and column_name='onboarding_status'
  ) then raise exception 'STAGING_READINESS_MISSING_011_ONBOARDING'; end if;

  if exists (
    select 1 from (values
      ('STARTER',149900::bigint,1),
      ('GROWTH',299900::bigint,3),
      ('BUSINESS',499900::bigint,null::integer)
    ) expected(plan_code,price_paise,max_active_chits)
    left join public.subscription_plans actual
      on actual.plan_code=expected.plan_code and actual.status='ACTIVE'
    where actual.plan_code is null
       or actual.price_paise is distinct from expected.price_paise
       or actual.max_active_chits is distinct from expected.max_active_chits
       or actual.currency <> 'INR'
       or actual.billing_period <> 'ANNUAL'
  ) then raise exception 'STAGING_READINESS_PLAN_CATALOG_MISMATCH'; end if;

  if not exists (
    select 1 from pg_constraint
    where conname='referrals_reward_check' and pg_get_constraintdef(oid) like '%reward_months = 2%'
  ) then raise exception 'STAGING_READINESS_REFERRAL_REWARD_RULE_MISSING'; end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='payment_checkout_attempts' and column_name='last_provider_check_at'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='payment_checkout_attempts' and column_name='reconcile_lock_until'
  ) then raise exception 'STAGING_READINESS_014_RECONCILIATION_COLUMNS_MISSING'; end if;

  if not exists (
    select 1 from pg_constraint
    where conname='payment_checkout_attempts_state_check'
      and pg_get_constraintdef(oid) like '%VERIFYING%'
      and pg_get_constraintdef(oid) like '%PENDING_CONFIRMATION%'
  ) then raise exception 'STAGING_READINESS_PAYMENT_STATES_MISSING'; end if;

  if exists (
    select 1
    from (values
      ('payment_checkout_attempts'),('provider_webhook_events'),('payment_reconciliation_events'),
      ('subscription_payments'),('billing_subscriptions'),('referrals'),('referral_rewards')
    ) required(table_name)
    left join pg_class c on c.relname=required.table_name
    left join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
    where c.oid is null or not c.relrowsecurity or not c.relforcerowsecurity
  ) then raise exception 'STAGING_READINESS_RLS_NOT_ENABLED_AND_FORCED'; end if;

  if to_regprocedure('public.upsert_verified_customer_profile()') is null
     or to_regprocedure('public.provision_customer_workspace(text,text)') is null
     or to_regprocedure('public.process_verified_annual_payment(uuid,uuid,text,text,text,text,uuid)') is null
     or to_regprocedure('public.process_verified_payment_reversal(text,text,uuid,text)') is null
  then raise exception 'STAGING_READINESS_REQUIRED_FUNCTION_MISSING'; end if;
end;
$$;

select version, name
from supabase_migrations.schema_migrations
where version in ('011','012','013','014')
order by version;

select 'STAGING_RAZORPAY_READINESS_OK' as result;

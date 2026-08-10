-- DEPENDS_ON: 016_saas_billing_receipts.sql

alter table public.user_profiles
  alter column full_name drop not null;

-- DEPENDS_ON: 015_group_manager_manual_distribution_records.sql
-- Additive VARDHAN SaaS billing receipts. Group/member collection receipts are not referenced.
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

create table if not exists public.saas_billing_receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  workspace_id uuid not null,
  subscription_payment_id uuid not null references public.subscription_payments(id) on delete restrict,
  subscription_id uuid not null references public.billing_subscriptions(id) on delete restrict,
  receipt_number text not null,
  issuer_name text not null default 'VARDHAN SOFTWARE SOLUTIONS',
  customer_name text not null,
  plan_code text not null,
  plan_name text not null,
  billing_period text not null,
  valid_from timestamptz,
  valid_until timestamptz,
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null,
  payment_date timestamptz not null,
  provider text not null default 'razorpay',
  provider_payment_id text not null,
  provider_order_id text not null,
  provider_receipt text,
  payment_status text not null check (payment_status = 'SUCCESS'),
  description text not null default 'Software subscription payment',
  tax_details jsonb not null default '{}'::jsonb check (jsonb_typeof(tax_details) = 'object'),
  created_at timestamptz not null default now(),
  constraint saas_billing_receipts_workspace_scope_fk foreign key (workspace_id,tenant_id,data_scope)
    references public.workspaces(id,tenant_id,data_scope) on delete restrict,
  constraint saas_billing_receipts_payment_unique unique (subscription_payment_id),
  constraint saas_billing_receipts_number_unique unique (receipt_number),
  constraint saas_billing_receipts_provider_payment_unique unique (provider,provider_payment_id)
);

select pg_temp.vardhan_add_missing_columns('public.saas_billing_receipts'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","workspace_id":"uuid","subscription_payment_id":"uuid references public.subscription_payments(id) on delete restrict","subscription_id":"uuid references public.billing_subscriptions(id) on delete restrict","receipt_number":"text","issuer_name":"text default ''VARDHAN SOFTWARE SOLUTIONS''","customer_name":"text","plan_code":"text","plan_name":"text","billing_period":"text","valid_from":"timestamptz","valid_until":"timestamptz","amount_paise":"bigint","currency":"text","payment_date":"timestamptz","provider":"text default ''razorpay''","provider_payment_id":"text","provider_order_id":"text","provider_receipt":"text","payment_status":"text","description":"text default ''Software subscription payment''","tax_details":"jsonb default ''{}''::jsonb","created_at":"timestamptz default now()"}'::jsonb);

insert into public.saas_billing_receipts(
  tenant_id,data_scope,workspace_id,subscription_payment_id,subscription_id,receipt_number,
  customer_name,plan_code,plan_name,billing_period,valid_from,valid_until,amount_paise,currency,
  payment_date,provider,provider_payment_id,provider_order_id,provider_receipt,payment_status
)
select p.tenant_id,p.data_scope,p.workspace_id,p.id,p.subscription_id,
  'VDS-'||upper(replace(p.id::text,'-','')),w.business_name,
  coalesce(a.plan_code,s.plan_code),coalesce(a.plan_name_snapshot,s.plan_name_snapshot),
  coalesce(s.billing_period_snapshot,'ANNUAL'),p.verified_at,s.paid_entitlement_ends_at,
  p.amount_paise,p.currency,p.verified_at,p.provider,p.provider_payment_id,p.provider_order_id,
  a.provider_receipt,'SUCCESS'
from public.subscription_payments p
join public.billing_subscriptions s on s.id=p.subscription_id
join public.workspaces w on w.id=p.workspace_id and w.tenant_id=p.tenant_id and w.data_scope=p.data_scope
left join public.payment_checkout_attempts a on a.subscription_payment_id=p.id
where p.status='SUCCESS'
on conflict(subscription_payment_id) do nothing;

create index if not exists idx_saas_billing_receipts_workspace
  on public.saas_billing_receipts(workspace_id,payment_date desc);

alter table public.saas_billing_receipts enable row level security;
alter table public.saas_billing_receipts force row level security;
drop policy if exists saas_billing_receipts_select on public.saas_billing_receipts;
create policy saas_billing_receipts_select on public.saas_billing_receipts for select
using (
  public.is_platform_owner()
  or public.has_active_membership(tenant_id,data_scope)
);
revoke all on public.saas_billing_receipts from public,anon,authenticated;
grant select on public.saas_billing_receipts to authenticated;

commit;

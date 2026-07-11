-- PROJECT VARDHAN - AI CHIT OS Phase 3 migration draft
-- Apply after reviewing project-specific schema names and auth claims.

create table if not exists public.chit_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  workspace_id uuid,
  name text not null,
  code text,
  description text,
  status text not null default 'ACTIVE',
  group_ids jsonb not null default '[]'::jsonb,
  start_date date,
  end_date date,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chit_payout_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  workspace_id uuid,
  group_id uuid not null,
  winner_id uuid,
  winner_result_id uuid,
  payout_mode text not null default 'FULL',
  total_payout numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  pending_amount numeric(14,2) not null default 0,
  installment_count integer not null default 0,
  installment_schedule jsonb not null default '[]'::jsonb,
  status text not null default 'PENDING',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chit_payout_installments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  payout_plan_id uuid not null references public.chit_payout_plans(id),
  installment_number integer not null,
  due_date date,
  amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  status text not null default 'PENDING',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.chit_expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  workspace_id uuid,
  batch_id uuid,
  group_id uuid,
  category text not null,
  amount numeric(14,2) not null default 0,
  payment_mode text not null default 'CASH',
  vendor text,
  notes text,
  date date not null default current_date,
  status text not null default 'POSTED',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chit_investors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  workspace_id uuid,
  name text not null,
  mobile text,
  email text,
  status text not null default 'ACTIVE',
  opening_balance numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chit_investor_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  investor_id uuid not null references public.chit_investors(id),
  type text not null,
  amount numeric(14,2) not null default 0,
  payment_mode text not null default 'CASH',
  reference_id uuid,
  notes text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.chit_organizer_payment_settings (
  tenant_id uuid primary key,
  workspace_id uuid,
  enabled_modes jsonb not null default '["CASH","BANK_TRANSFER","UPI","CHEQUE"]'::jsonb,
  default_mode text not null default 'CASH',
  bank_accounts jsonb not null default '[]'::jsonb,
  upi_ids jsonb not null default '[]'::jsonb,
  qr_metadata jsonb not null default '{}'::jsonb,
  custom_modes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.chit_message_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  type text not null,
  channel text not null,
  title text not null,
  body text not null,
  locale text not null default 'en-IN',
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now()
);

create table if not exists public.chit_message_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  type text,
  channel text not null,
  dedupe_key text not null,
  recipient text,
  body text,
  status text not null default 'READY',
  created_at timestamptz not null default now(),
  unique (tenant_id, dedupe_key)
);

create table if not exists public.chit_message_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  message_job_id uuid not null references public.chit_message_jobs(id),
  status text not null,
  provider_response jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.chit_custom_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  status text not null default 'ACTIVE',
  permission_matrix jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chit_user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  role_id uuid not null references public.chit_custom_roles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.chit_workspace_locale_settings (
  tenant_id uuid primary key,
  workspace_id uuid,
  locale text not null default 'en-IN',
  currency text not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  fiscal_year_start text not null default '04-01',
  updated_at timestamptz not null default now()
);

create table if not exists public.chit_month_closing_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  group_id uuid not null,
  month_number integer not null,
  summary jsonb not null default '{}'::jsonb,
  reconciliation jsonb not null default '{}'::jsonb,
  status text not null default 'CLOSED',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, group_id, month_number)
);

create table if not exists public.chit_completion_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  group_id uuid not null,
  summary jsonb not null default '{}'::jsonb,
  status text not null default 'COMPLETED',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, group_id)
);

create index if not exists idx_chit_batches_tenant on public.chit_batches(tenant_id);
create index if not exists idx_chit_payout_plans_tenant_group on public.chit_payout_plans(tenant_id, group_id);
create index if not exists idx_chit_expenses_tenant_group on public.chit_expenses(tenant_id, group_id);
create index if not exists idx_chit_investor_tx_tenant_investor on public.chit_investor_transactions(tenant_id, investor_id);
create index if not exists idx_chit_message_jobs_tenant_status on public.chit_message_jobs(tenant_id, status);

alter table public.chit_batches enable row level security;
alter table public.chit_payout_plans enable row level security;
alter table public.chit_payout_installments enable row level security;
alter table public.chit_expenses enable row level security;
alter table public.chit_investors enable row level security;
alter table public.chit_investor_transactions enable row level security;
alter table public.chit_organizer_payment_settings enable row level security;
alter table public.chit_message_templates enable row level security;
alter table public.chit_message_jobs enable row level security;
alter table public.chit_message_delivery_logs enable row level security;
alter table public.chit_custom_roles enable row level security;
alter table public.chit_user_role_assignments enable row level security;
alter table public.chit_workspace_locale_settings enable row level security;
alter table public.chit_month_closing_snapshots enable row level security;
alter table public.chit_completion_snapshots enable row level security;

-- RLS policy template:
-- create policy tenant_select on public.chit_batches
-- for select using (tenant_id::text = auth.jwt() ->> 'tenant_id');

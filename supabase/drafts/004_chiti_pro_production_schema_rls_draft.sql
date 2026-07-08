/*
  PROJECT VARDHAN - MITRA NIDHI CHITI PRO
  Priority Fix Batch 4

  Supabase production schema and RLS draft.
  DO NOT APPLY AUTOMATICALLY.
  This file is a planning artifact for review before any Supabase migration is created or executed.
*/

-- Extensions expected in Supabase projects.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared enum-like checks are kept inline for portability in early rollout.
-- data_scope expected values:
--   own_business, real_tenant, demo_sandbox
-- ---------------------------------------------------------------------------

create table if not exists public.chit_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active',

  chit_name text not null,
  chit_code text not null,
  chit_value numeric(14,2) not null default 0,
  monthly_amount numeric(14,2) not null default 0,
  total_members integer not null default 0,
  total_months integer not null default 0,
  start_date date,
  end_date date,
  next_auction_date date,
  today_collections numeric(14,2) not null default 0,
  pending_collections numeric(14,2) not null default 0,
  outstanding_amount numeric(14,2) not null default 0,
  notes text,

  constraint chit_groups_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox')),
  constraint chit_groups_code_scope_unique unique (tenant_id, data_scope, chit_code)
);

create table if not exists public.chit_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active',

  group_id uuid not null references public.chit_groups(id) on delete restrict,
  member_name text not null,
  member_number text not null,
  mobile_number text,
  whatsapp_number text,
  email text,
  address text,
  aadhaar_masked text,
  pan text,
  nominee_name text,
  nominee_mobile text,
  bank_name text,
  account_number_masked text,
  ifsc text,
  join_date date,
  metadata jsonb not null default '{}'::jsonb,

  constraint chit_members_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox')),
  constraint chit_members_number_scope_unique unique (tenant_id, data_scope, member_number)
);

create table if not exists public.chit_collections (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'posted',

  group_id uuid not null references public.chit_groups(id) on delete restrict,
  member_id uuid not null references public.chit_members(id) on delete restrict,
  collection_month text not null,
  collection_date date not null default current_date,
  installment_amount numeric(14,2) not null default 0,
  fine_amount numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  dividend_adjustment numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  pending_amount numeric(14,2) not null default 0,
  payment_method text not null default 'Cash',
  collected_by text,
  receipt_no text not null,
  is_partial boolean not null default false,
  notes text,

  constraint chit_collections_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox')),
  constraint chit_collections_receipt_scope_unique unique (tenant_id, data_scope, receipt_no)
);

create table if not exists public.chit_receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'ready',

  collection_id uuid not null references public.chit_collections(id) on delete cascade,
  group_id uuid not null references public.chit_groups(id) on delete restrict,
  member_id uuid not null references public.chit_members(id) on delete restrict,
  receipt_no text not null,
  amount numeric(14,2) not null default 0,
  payment_date date not null default current_date,
  payment_method text not null default 'Cash',
  can_print_pdf boolean not null default true,
  can_print_whatsapp boolean not null default true,
  document_url text,
  notes text,

  constraint chit_receipts_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox')),
  constraint chit_receipts_no_scope_unique unique (tenant_id, data_scope, receipt_no)
);

create table if not exists public.chit_auctions (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'scheduled',

  group_id uuid not null references public.chit_groups(id) on delete restrict,
  auction_month integer not null default 0,
  auction_date date,
  winner_member_id uuid references public.chit_members(id) on delete set null,
  bid_amount numeric(14,2) not null default 0,
  lift_amount numeric(14,2) not null default 0,
  dividend_amount numeric(14,2) not null default 0,
  participants jsonb not null default '[]'::jsonb,
  notes text,

  constraint chit_auctions_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox'))
);

create table if not exists public.chit_finance_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'posted',

  group_id uuid references public.chit_groups(id) on delete set null,
  member_id uuid references public.chit_members(id) on delete set null,
  collection_id uuid references public.chit_collections(id) on delete set null,
  receipt_no text,
  entry_date date not null default current_date,
  entry_type text not null,
  category text,
  particulars text,
  description text,
  amount numeric(14,2) not null default 0,
  cash_in numeric(14,2) not null default 0,
  cash_out numeric(14,2) not null default 0,
  bank_in numeric(14,2) not null default 0,
  bank_out numeric(14,2) not null default 0,
  balance numeric(14,2) not null default 0,
  payment_mode text,
  metadata jsonb not null default '{}'::jsonb,

  constraint chit_finance_entries_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox'))
);

create table if not exists public.chit_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active',

  group_id uuid references public.chit_groups(id) on delete set null,
  member_id uuid references public.chit_members(id) on delete set null,
  collection_id uuid references public.chit_collections(id) on delete set null,
  receipt_no text,
  document_type text not null,
  document_name text not null,
  document_url text,
  file_size integer,
  mime_type text,
  metadata jsonb not null default '{}'::jsonb,

  constraint chit_documents_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox'))
);

create table if not exists public.chit_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active',

  setting_key text not null,
  setting_value jsonb not null default '{}'::jsonb,
  receipt_format text not null default 'detailed',
  auto_generate_receipts boolean not null default true,
  notify_collection boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,

  constraint chit_settings_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox')),
  constraint chit_settings_key_scope_unique unique (tenant_id, data_scope, setting_key)
);

-- ---------------------------------------------------------------------------
-- updated_at trigger draft
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_chit_groups_updated_at before update on public.chit_groups
for each row execute function public.set_updated_at();

create trigger set_chit_members_updated_at before update on public.chit_members
for each row execute function public.set_updated_at();

create trigger set_chit_collections_updated_at before update on public.chit_collections
for each row execute function public.set_updated_at();

create trigger set_chit_receipts_updated_at before update on public.chit_receipts
for each row execute function public.set_updated_at();

create trigger set_chit_auctions_updated_at before update on public.chit_auctions
for each row execute function public.set_updated_at();

create trigger set_chit_finance_entries_updated_at before update on public.chit_finance_entries
for each row execute function public.set_updated_at();

create trigger set_chit_documents_updated_at before update on public.chit_documents
for each row execute function public.set_updated_at();

create trigger set_chit_settings_updated_at before update on public.chit_settings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Index draft
-- ---------------------------------------------------------------------------

create index if not exists idx_chit_groups_tenant_id on public.chit_groups(tenant_id);
create index if not exists idx_chit_groups_data_scope on public.chit_groups(data_scope);

create index if not exists idx_chit_members_tenant_id on public.chit_members(tenant_id);
create index if not exists idx_chit_members_data_scope on public.chit_members(data_scope);
create index if not exists idx_chit_members_group_id on public.chit_members(group_id);

create index if not exists idx_chit_collections_tenant_id on public.chit_collections(tenant_id);
create index if not exists idx_chit_collections_data_scope on public.chit_collections(data_scope);
create index if not exists idx_chit_collections_member_id on public.chit_collections(member_id);
create index if not exists idx_chit_collections_group_id on public.chit_collections(group_id);
create index if not exists idx_chit_collections_collection_date on public.chit_collections(collection_date);
create index if not exists idx_chit_collections_receipt_no on public.chit_collections(receipt_no);

create index if not exists idx_chit_receipts_tenant_id on public.chit_receipts(tenant_id);
create index if not exists idx_chit_receipts_data_scope on public.chit_receipts(data_scope);
create index if not exists idx_chit_receipts_member_id on public.chit_receipts(member_id);
create index if not exists idx_chit_receipts_group_id on public.chit_receipts(group_id);
create index if not exists idx_chit_receipts_receipt_no on public.chit_receipts(receipt_no);

create index if not exists idx_chit_auctions_tenant_id on public.chit_auctions(tenant_id);
create index if not exists idx_chit_auctions_data_scope on public.chit_auctions(data_scope);
create index if not exists idx_chit_auctions_group_id on public.chit_auctions(group_id);

create index if not exists idx_chit_finance_entries_tenant_id on public.chit_finance_entries(tenant_id);
create index if not exists idx_chit_finance_entries_data_scope on public.chit_finance_entries(data_scope);
create index if not exists idx_chit_finance_entries_member_id on public.chit_finance_entries(member_id);
create index if not exists idx_chit_finance_entries_group_id on public.chit_finance_entries(group_id);
create index if not exists idx_chit_finance_entries_receipt_no on public.chit_finance_entries(receipt_no);

create index if not exists idx_chit_documents_tenant_id on public.chit_documents(tenant_id);
create index if not exists idx_chit_documents_data_scope on public.chit_documents(data_scope);
create index if not exists idx_chit_documents_member_id on public.chit_documents(member_id);
create index if not exists idx_chit_documents_group_id on public.chit_documents(group_id);
create index if not exists idx_chit_documents_receipt_no on public.chit_documents(receipt_no);

create index if not exists idx_chit_settings_tenant_id on public.chit_settings(tenant_id);
create index if not exists idx_chit_settings_data_scope on public.chit_settings(data_scope);

-- ---------------------------------------------------------------------------
-- RLS helper draft.
-- Assumes JWT app_metadata includes:
--   platform_role: platform_owner | customer | employee
--   tenant_id: tenant id string
--   data_scope: own_business | real_tenant | demo_sandbox
-- These helpers should be reviewed against the final auth/profile model before use.
-- ---------------------------------------------------------------------------

create or replace function public.jwt_platform_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '');
$$;

create or replace function public.jwt_tenant_id()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '');
$$;

create or replace function public.jwt_data_scope()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'data_scope', '');
$$;

create or replace function public.can_access_chit_scope(row_tenant_id text, row_data_scope text)
returns boolean
language sql
stable
as $$
  select
    public.jwt_platform_role() = 'platform_owner'
    or (
      public.jwt_tenant_id() = row_tenant_id
      and public.jwt_data_scope() = row_data_scope
      and row_data_scope in ('own_business', 'real_tenant')
    )
    or (
      public.jwt_tenant_id() = row_tenant_id
      and public.jwt_data_scope() = 'demo_sandbox'
      and row_data_scope = 'demo_sandbox'
    );
$$;

-- ---------------------------------------------------------------------------
-- RLS enablement and policy draft.
-- Expand or generate per table during migration creation after auth claims are final.
-- ---------------------------------------------------------------------------

alter table public.chit_groups enable row level security;
alter table public.chit_members enable row level security;
alter table public.chit_collections enable row level security;
alter table public.chit_receipts enable row level security;
alter table public.chit_auctions enable row level security;
alter table public.chit_finance_entries enable row level security;
alter table public.chit_documents enable row level security;
alter table public.chit_settings enable row level security;

create policy chit_groups_scope_access on public.chit_groups
for all using (public.can_access_chit_scope(tenant_id, data_scope))
with check (public.can_access_chit_scope(tenant_id, data_scope));

create policy chit_members_scope_access on public.chit_members
for all using (public.can_access_chit_scope(tenant_id, data_scope))
with check (public.can_access_chit_scope(tenant_id, data_scope));

create policy chit_collections_scope_access on public.chit_collections
for all using (public.can_access_chit_scope(tenant_id, data_scope))
with check (public.can_access_chit_scope(tenant_id, data_scope));

create policy chit_receipts_scope_access on public.chit_receipts
for all using (public.can_access_chit_scope(tenant_id, data_scope))
with check (public.can_access_chit_scope(tenant_id, data_scope));

create policy chit_auctions_scope_access on public.chit_auctions
for all using (public.can_access_chit_scope(tenant_id, data_scope))
with check (public.can_access_chit_scope(tenant_id, data_scope));

create policy chit_finance_entries_scope_access on public.chit_finance_entries
for all using (public.can_access_chit_scope(tenant_id, data_scope))
with check (public.can_access_chit_scope(tenant_id, data_scope));

create policy chit_documents_scope_access on public.chit_documents
for all using (public.can_access_chit_scope(tenant_id, data_scope))
with check (public.can_access_chit_scope(tenant_id, data_scope));

create policy chit_settings_scope_access on public.chit_settings
for all using (public.can_access_chit_scope(tenant_id, data_scope))
with check (public.can_access_chit_scope(tenant_id, data_scope));

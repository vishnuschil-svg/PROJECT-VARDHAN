-- CANONICAL_SCHEMA: VARDHAN_OS_PRODUCTION_V1
-- DEPENDS_ON: 000_legacy_reference_keys.sql
-- MITRA NIDHI CHITI PRO - Production Schema
-- Migration 001: Core Tables
-- This migration creates the foundational database schema for VARDHAN OS

-- Enable required extensions
create extension if not exists pgcrypto;

-- Existing legacy tables are upgraded additively before any index, trigger, RLS policy, or
-- foreign key depends on the production columns. Required constraints remain part of the
-- canonical CREATE TABLE path; missing legacy columns are intentionally added nullable so
-- historical rows are preserved and can be attributed to a tenant in a controlled backfill.
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

-- ============================================================================
-- PLATFORM TABLES
-- ============================================================================

-- Workspaces table (multi-tenant workspace management)
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active',

  customer_id text not null,
  business_name text not null,
  business_type text not null default 'customer',
  module text not null,
  plan text not null default 'Standard',
  license_type text not null default 'Monthly',
  owner text,
  logo text,
  route text default '/dashboard',
  settings jsonb not null default '{}'::jsonb,

  constraint workspaces_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox')),
  constraint workspaces_tenant_unique unique (tenant_id, data_scope),
  constraint workspaces_identity_scope_unique unique (id, tenant_id, data_scope)
);

-- Licenses table (subscription management)
create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active',

  customer_id text not null,
  product_id text not null,
  plan_type text not null,
  billing_cycle text not null,
  seats integer not null default 1,
  used_seats integer not null default 0,
  license_key text,
  starts_on date,
  expires_on date,
  metadata jsonb not null default '{}'::jsonb,

  constraint licenses_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox'))
);

-- Notifications table (user notifications)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active',

  user_id uuid references auth.users(id),
  notification_type text not null,
  title text not null,
  message text,
  action_url text,
  is_read boolean not null default false,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,

  constraint notifications_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox'))
);

-- Security audit logs table
create table if not exists public.security_audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),

  user_id uuid references auth.users(id),
  action_type text not null,
  resource_type text,
  resource_id text,
  ip_address text,
  user_agent text,
  success boolean not null default true,
  details jsonb not null default '{}'::jsonb,

  constraint security_audit_logs_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox'))
);

-- Academy progress table
create table if not exists public.academy_progress (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  user_id uuid references auth.users(id),
  course_id text not null,
  version text not null,
  status text not null default 'Not Started',
  completed_steps jsonb not null default '[]'::jsonb,
  last_step integer not null default 0,

  constraint academy_progress_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox')),
  constraint academy_progress_user_course_unique unique (tenant_id, data_scope, user_id, course_id)
);

-- ============================================================================
-- CHIT TABLES
-- ============================================================================

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
  metadata jsonb not null default '{}'::jsonb,

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
  metadata jsonb not null default '{}'::jsonb,

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
  metadata jsonb not null default '{}'::jsonb,

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
  metadata jsonb not null default '{}'::jsonb,

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

-- Support tickets table
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'open',

  user_id uuid references auth.users(id),
  category text not null,
  subject text not null,
  description text,
  priority text not null default 'medium',
  assigned_to uuid references auth.users(id),
  resolved_at timestamptz,
  resolution text,
  metadata jsonb not null default '{}'::jsonb,

  constraint support_tickets_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox'))
);

-- Communication templates table
create table if not exists public.communication_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active',

  template_name text not null,
  template_type text not null,
  subject text,
  body text not null,
  variables jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,

  constraint communication_templates_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox')),
  constraint communication_templates_name_scope_unique unique (tenant_id, data_scope, template_name)
);

-- Communication jobs table
create table if not exists public.communication_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'pending',

  template_id uuid references public.communication_templates(id) on delete set null,
  job_type text not null,
  recipient text not null,
  recipient_type text not null,
  scheduled_for timestamptz,
  sent_at timestamptz,
  delivery_status text,
  error_message text,
  retry_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,

  constraint communication_jobs_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox'))
);

-- Chit schedule rows table
create table if not exists public.chit_schedule_rows (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active',

  group_id uuid not null references public.chit_groups(id) on delete cascade,
  schedule_month integer not null,
  schedule_year integer not null,
  auction_date date,
  collection_date date,
  installment_amount numeric(14,2) not null default 0,
  dividend_amount numeric(14,2) not null default 0,
  notes text,
  metadata jsonb not null default '{}'::jsonb,

  constraint chit_schedule_rows_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox')),
  constraint chit_schedule_rows_group_month_unique unique (tenant_id, data_scope, group_id, schedule_month, schedule_year)
);

-- Chit payouts table
create table if not exists public.chit_payouts (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'pending',

  group_id uuid not null references public.chit_groups(id) on delete restrict,
  member_id uuid references public.chit_members(id) on delete restrict,
  auction_id uuid references public.chit_auctions(id) on delete set null,
  payout_month integer not null,
  payout_date date,
  payout_amount numeric(14,2) not null default 0,
  payment_method text not null default 'Cash',
  paid_amount numeric(14,2) not null default 0,
  balance_amount numeric(14,2) not null default 0,
  notes text,
  metadata jsonb not null default '{}'::jsonb,

  constraint chit_payouts_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox'))
);

-- Chit dividends table
create table if not exists public.chit_dividends (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'pending',

  group_id uuid not null references public.chit_groups(id) on delete restrict,
  member_id uuid references public.chit_members(id) on delete restrict,
  auction_id uuid references public.chit_auctions(id) on delete set null,
  dividend_month integer not null,
  dividend_date date,
  dividend_amount numeric(14,2) not null default 0,
  distributed_amount numeric(14,2) not null default 0,
  notes text,
  metadata jsonb not null default '{}'::jsonb,

  constraint chit_dividends_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox'))
);

-- Lucky draw table
create table if not exists public.lucky_draws (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'scheduled',

  group_id uuid not null references public.chit_groups(id) on delete restrict,
  draw_month integer not null,
  draw_date date,
  winner_member_id uuid references public.chit_members(id) on delete set null,
  prize_amount numeric(14,2) not null default 0,
  participants jsonb not null default '[]'::jsonb,
  notes text,
  metadata jsonb not null default '{}'::jsonb,

  constraint lucky_draws_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox'))
);

-- Chit templates table
create table if not exists public.chit_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active',

  template_name text not null,
  template_code text not null,
  chit_value numeric(14,2) not null default 0,
  monthly_amount numeric(14,2) not null default 0,
  total_members integer not null default 0,
  total_months integer not null default 0,
  auction_interval integer not null default 1,
  dividend_percentage numeric(5,2) not null default 0,
  template_config jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,

  constraint chit_templates_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox')),
  constraint chit_templates_code_scope_unique unique (tenant_id, data_scope, template_code)
);

-- Organizer preferences table
create table if not exists public.organizer_preferences (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active',

  preference_key text not null,
  preference_value jsonb not null default '{}'::jsonb,
  category text,
  metadata jsonb not null default '{}'::jsonb,

  constraint organizer_preferences_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox')),
  constraint organizer_preferences_key_scope_unique unique (tenant_id, data_scope, preference_key)
);

-- Payment settings table
create table if not exists public.payment_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active',

  payment_mode text not null,
  is_enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  constraint payment_settings_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox')),
  constraint payment_settings_mode_scope_unique unique (tenant_id, data_scope, payment_mode)
);

-- Month closing table
create table if not exists public.month_closing (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'open',

  group_id uuid not null references public.chit_groups(id) on delete restrict,
  closing_month integer not null,
  closing_year integer not null,
  closed_at timestamptz,
  closed_by uuid references auth.users(id),
  summary jsonb not null default '{}'::jsonb,
  notes text,
  metadata jsonb not null default '{}'::jsonb,

  constraint month_closing_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox')),
  constraint month_closing_group_month_unique unique (tenant_id, data_scope, group_id, closing_month, closing_year)
);

-- Manual overrides table
create table if not exists public.manual_overrides (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active',

  group_id uuid references public.chit_groups(id) on delete set null,
  member_id uuid references public.chit_members(id) on delete set null,
  override_type text not null,
  original_value numeric(14,2) not null default 0,
  override_value numeric(14,2) not null default 0,
  reason text not null,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,

  constraint manual_overrides_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox'))
);

-- Expenses table
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'posted',

  group_id uuid references public.chit_groups(id) on delete set null,
  expense_date date not null default current_date,
  category text not null,
  description text,
  amount numeric(14,2) not null default 0,
  payment_method text not null default 'Cash',
  paid_to text,
  receipt_url text,
  metadata jsonb not null default '{}'::jsonb,

  constraint expenses_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox'))
);

-- Activity log table
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  data_scope text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),

  user_id uuid references auth.users(id),
  activity_type text not null,
  entity_type text,
  entity_id text,
  description text,
  ip_address text,
  metadata jsonb not null default '{}'::jsonb,

  constraint activity_logs_scope_check check (data_scope in ('own_business', 'real_tenant', 'demo_sandbox'))
);

-- Compatibility audit: every production column for every pre-existing core table.
select pg_temp.vardhan_add_missing_columns('public.workspaces'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''active''","customer_id":"text","business_name":"text","business_type":"text default ''customer''","module":"text","plan":"text default ''Standard''","license_type":"text default ''Monthly''","owner":"text","logo":"text","route":"text default ''/dashboard''","settings":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.licenses'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''active''","customer_id":"text","product_id":"text","plan_type":"text","billing_cycle":"text","seats":"integer default 1","used_seats":"integer default 0","license_key":"text","starts_on":"date","expires_on":"date","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.notifications'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''active''","user_id":"uuid","notification_type":"text","title":"text","message":"text","action_url":"text","is_read":"boolean default false","read_at":"timestamptz","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.security_audit_logs'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","user_id":"uuid","action_type":"text","resource_type":"text","resource_id":"text","ip_address":"text","user_agent":"text","success":"boolean default true","details":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.academy_progress'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","user_id":"uuid","course_id":"text","version":"text","status":"text default ''Not Started''","completed_steps":"jsonb default ''[]''::jsonb","last_step":"integer default 0"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.chit_groups'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''active''","chit_name":"text","chit_code":"text","chit_value":"numeric(14,2) default 0","monthly_amount":"numeric(14,2) default 0","total_members":"integer default 0","total_months":"integer default 0","start_date":"date","end_date":"date","next_auction_date":"date","today_collections":"numeric(14,2) default 0","pending_collections":"numeric(14,2) default 0","outstanding_amount":"numeric(14,2) default 0","notes":"text","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.chit_members'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''active''","group_id":"uuid","member_name":"text","member_number":"text","mobile_number":"text","whatsapp_number":"text","email":"text","address":"text","aadhaar_masked":"text","pan":"text","nominee_name":"text","nominee_mobile":"text","bank_name":"text","account_number_masked":"text","ifsc":"text","join_date":"date","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.chit_collections'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''posted''","group_id":"uuid","member_id":"uuid","collection_month":"text","collection_date":"date default current_date","installment_amount":"numeric(14,2) default 0","fine_amount":"numeric(14,2) default 0","discount_amount":"numeric(14,2) default 0","dividend_adjustment":"numeric(14,2) default 0","paid_amount":"numeric(14,2) default 0","pending_amount":"numeric(14,2) default 0","payment_method":"text default ''Cash''","collected_by":"text","receipt_no":"text","is_partial":"boolean default false","notes":"text","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.chit_receipts'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''ready''","collection_id":"uuid","group_id":"uuid","member_id":"uuid","receipt_no":"text","amount":"numeric(14,2) default 0","payment_date":"date default current_date","payment_method":"text default ''Cash''","can_print_pdf":"boolean default true","can_print_whatsapp":"boolean default true","document_url":"text","notes":"text","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.chit_auctions'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''scheduled''","group_id":"uuid","auction_month":"integer default 0","auction_date":"date","winner_member_id":"uuid","bid_amount":"numeric(14,2) default 0","lift_amount":"numeric(14,2) default 0","dividend_amount":"numeric(14,2) default 0","participants":"jsonb default ''[]''::jsonb","notes":"text","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.chit_finance_entries'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''posted''","group_id":"uuid","member_id":"uuid","collection_id":"uuid","receipt_no":"text","entry_date":"date default current_date","entry_type":"text","category":"text","particulars":"text","description":"text","amount":"numeric(14,2) default 0","cash_in":"numeric(14,2) default 0","cash_out":"numeric(14,2) default 0","bank_in":"numeric(14,2) default 0","bank_out":"numeric(14,2) default 0","balance":"numeric(14,2) default 0","payment_mode":"text","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.chit_documents'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''active''","group_id":"uuid","member_id":"uuid","collection_id":"uuid","receipt_no":"text","document_type":"text","document_name":"text","document_url":"text","file_size":"integer","mime_type":"text","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.chit_settings'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''active''","setting_key":"text","setting_value":"jsonb default ''{}''::jsonb","receipt_format":"text default ''detailed''","auto_generate_receipts":"boolean default true","notify_collection":"boolean default true","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.support_tickets'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''open''","user_id":"uuid","category":"text","subject":"text","description":"text","priority":"text default ''medium''","assigned_to":"uuid","resolved_at":"timestamptz","resolution":"text","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.communication_templates'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''active''","template_name":"text","template_type":"text","subject":"text","body":"text","variables":"jsonb default ''{}''::jsonb","is_default":"boolean default false","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.communication_jobs'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''pending''","template_id":"uuid","job_type":"text","recipient":"text","recipient_type":"text","scheduled_for":"timestamptz","sent_at":"timestamptz","delivery_status":"text","error_message":"text","retry_count":"integer default 0","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.chit_schedule_rows'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''active''","group_id":"uuid","schedule_month":"integer","schedule_year":"integer","auction_date":"date","collection_date":"date","installment_amount":"numeric(14,2) default 0","dividend_amount":"numeric(14,2) default 0","notes":"text","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.chit_payouts'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''pending''","group_id":"uuid","member_id":"uuid","auction_id":"uuid","payout_month":"integer","payout_date":"date","payout_amount":"numeric(14,2) default 0","payment_method":"text default ''Cash''","paid_amount":"numeric(14,2) default 0","balance_amount":"numeric(14,2) default 0","notes":"text","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.chit_dividends'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''pending''","group_id":"uuid","member_id":"uuid","auction_id":"uuid","dividend_month":"integer","dividend_date":"date","dividend_amount":"numeric(14,2) default 0","distributed_amount":"numeric(14,2) default 0","notes":"text","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.lucky_draws'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''scheduled''","group_id":"uuid","draw_month":"integer","draw_date":"date","winner_member_id":"uuid","prize_amount":"numeric(14,2) default 0","participants":"jsonb default ''[]''::jsonb","notes":"text","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.chit_templates'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''active''","template_name":"text","template_code":"text","chit_value":"numeric(14,2) default 0","monthly_amount":"numeric(14,2) default 0","total_members":"integer default 0","total_months":"integer default 0","auction_interval":"integer default 1","dividend_percentage":"numeric(5,2) default 0","template_config":"jsonb default ''{}''::jsonb","is_public":"boolean default false","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.organizer_preferences'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''active''","preference_key":"text","preference_value":"jsonb default ''{}''::jsonb","category":"text","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.payment_settings'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''active''","payment_mode":"text","is_enabled":"boolean default true","config":"jsonb default ''{}''::jsonb","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.month_closing'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''open''","group_id":"uuid","closing_month":"integer","closing_year":"integer","closed_at":"timestamptz","closed_by":"uuid","summary":"jsonb default ''{}''::jsonb","notes":"text","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.manual_overrides'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''active''","group_id":"uuid","member_id":"uuid","override_type":"text","original_value":"numeric(14,2) default 0","override_value":"numeric(14,2) default 0","reason":"text","approved_by":"uuid","approved_at":"timestamptz","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.expenses'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","status":"text default ''posted''","group_id":"uuid","expense_date":"date default current_date","category":"text","description":"text","amount":"numeric(14,2) default 0","payment_method":"text default ''Cash''","paid_to":"text","receipt_url":"text","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.activity_logs'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","created_by":"uuid","created_at":"timestamptz default now()","user_id":"uuid","activity_type":"text","entity_type":"text","entity_id":"text","description":"text","ip_address":"text","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);

-- A legacy workspaces table may not have the composite key required by later workspace FKs.
create unique index if not exists ux_workspaces_identity_scope_compat
  on public.workspaces(id,tenant_id,data_scope);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at triggers to all tables with updated_at column
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'workspaces','licenses','notifications','academy_progress','chit_groups','chit_members','chit_collections',
    'chit_receipts','chit_auctions','chit_finance_entries','chit_documents','chit_settings','support_tickets',
    'communication_templates','communication_jobs','chit_schedule_rows','chit_payouts','chit_dividends',
    'lucky_draws','chit_templates','organizer_preferences','payment_settings','month_closing','manual_overrides','expenses'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'set_' || table_name || '_updated_at', table_name);
  end loop;
end $$;

create trigger set_workspaces_updated_at before update on public.workspaces
for each row execute function public.set_updated_at();

create trigger set_licenses_updated_at before update on public.licenses
for each row execute function public.set_updated_at();

create trigger set_notifications_updated_at before update on public.notifications
for each row execute function public.set_updated_at();

create trigger set_academy_progress_updated_at before update on public.academy_progress
for each row execute function public.set_updated_at();

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

create trigger set_support_tickets_updated_at before update on public.support_tickets
for each row execute function public.set_updated_at();

create trigger set_communication_templates_updated_at before update on public.communication_templates
for each row execute function public.set_updated_at();

create trigger set_communication_jobs_updated_at before update on public.communication_jobs
for each row execute function public.set_updated_at();

create trigger set_chit_schedule_rows_updated_at before update on public.chit_schedule_rows
for each row execute function public.set_updated_at();

create trigger set_chit_payouts_updated_at before update on public.chit_payouts
for each row execute function public.set_updated_at();

create trigger set_chit_dividends_updated_at before update on public.chit_dividends
for each row execute function public.set_updated_at();

create trigger set_lucky_draws_updated_at before update on public.lucky_draws
for each row execute function public.set_updated_at();

create trigger set_chit_templates_updated_at before update on public.chit_templates
for each row execute function public.set_updated_at();

create trigger set_organizer_preferences_updated_at before update on public.organizer_preferences
for each row execute function public.set_updated_at();

create trigger set_payment_settings_updated_at before update on public.payment_settings
for each row execute function public.set_updated_at();

create trigger set_month_closing_updated_at before update on public.month_closing
for each row execute function public.set_updated_at();

create trigger set_manual_overrides_updated_at before update on public.manual_overrides
for each row execute function public.set_updated_at();

create trigger set_expenses_updated_at before update on public.expenses
for each row execute function public.set_updated_at();

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Platform table indexes
create index if not exists idx_workspaces_tenant_id on public.workspaces(tenant_id);
create index if not exists idx_workspaces_data_scope on public.workspaces(data_scope);
create index if not exists idx_workspaces_customer_id on public.workspaces(customer_id);

create index if not exists idx_licenses_tenant_id on public.licenses(tenant_id);
create index if not exists idx_licenses_data_scope on public.licenses(data_scope);
create index if not exists idx_licenses_customer_id on public.licenses(customer_id);
create index if not exists idx_licenses_product_id on public.licenses(product_id);

create index if not exists idx_notifications_tenant_id on public.notifications(tenant_id);
create index if not exists idx_notifications_data_scope on public.notifications(data_scope);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_is_read on public.notifications(is_read);

create index if not exists idx_security_audit_logs_tenant_id on public.security_audit_logs(tenant_id);
create index if not exists idx_security_audit_logs_data_scope on public.security_audit_logs(data_scope);
create index if not exists idx_security_audit_logs_user_id on public.security_audit_logs(user_id);
create index if not exists idx_security_audit_logs_created_at on public.security_audit_logs(created_at);

create index if not exists idx_academy_progress_tenant_id on public.academy_progress(tenant_id);
create index if not exists idx_academy_progress_data_scope on public.academy_progress(data_scope);
create index if not exists idx_academy_progress_user_id on public.academy_progress(user_id);
create index if not exists idx_academy_progress_course_id on public.academy_progress(course_id);

-- Chit table indexes
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

-- Additional table indexes
create index if not exists idx_support_tickets_tenant_id on public.support_tickets(tenant_id);
create index if not exists idx_support_tickets_data_scope on public.support_tickets(data_scope);
create index if not exists idx_support_tickets_user_id on public.support_tickets(user_id);
create index if not exists idx_support_tickets_status on public.support_tickets(status);

create index if not exists idx_communication_templates_tenant_id on public.communication_templates(tenant_id);
create index if not exists idx_communication_templates_data_scope on public.communication_templates(data_scope);
create index if not exists idx_communication_templates_type on public.communication_templates(template_type);

create index if not exists idx_communication_jobs_tenant_id on public.communication_jobs(tenant_id);
create index if not exists idx_communication_jobs_data_scope on public.communication_jobs(data_scope);
create index if not exists idx_communication_jobs_template_id on public.communication_jobs(template_id);
create index if not exists idx_communication_jobs_status on public.communication_jobs(status);

create index if not exists idx_chit_schedule_rows_tenant_id on public.chit_schedule_rows(tenant_id);
create index if not exists idx_chit_schedule_rows_data_scope on public.chit_schedule_rows(data_scope);
create index if not exists idx_chit_schedule_rows_group_id on public.chit_schedule_rows(group_id);

create index if not exists idx_chit_payouts_tenant_id on public.chit_payouts(tenant_id);
create index if not exists idx_chit_payouts_data_scope on public.chit_payouts(data_scope);
create index if not exists idx_chit_payouts_group_id on public.chit_payouts(group_id);
create index if not exists idx_chit_payouts_member_id on public.chit_payouts(member_id);

create index if not exists idx_chit_dividends_tenant_id on public.chit_dividends(tenant_id);
create index if not exists idx_chit_dividends_data_scope on public.chit_dividends(data_scope);
create index if not exists idx_chit_dividends_group_id on public.chit_dividends(group_id);
create index if not exists idx_chit_dividends_member_id on public.chit_dividends(member_id);

create index if not exists idx_lucky_draws_tenant_id on public.lucky_draws(tenant_id);
create index if not exists idx_lucky_draws_data_scope on public.lucky_draws(data_scope);
create index if not exists idx_lucky_draws_group_id on public.lucky_draws(group_id);

create index if not exists idx_chit_templates_tenant_id on public.chit_templates(tenant_id);
create index if not exists idx_chit_templates_data_scope on public.chit_templates(data_scope);

create index if not exists idx_organizer_preferences_tenant_id on public.organizer_preferences(tenant_id);
create index if not exists idx_organizer_preferences_data_scope on public.organizer_preferences(data_scope);

create index if not exists idx_payment_settings_tenant_id on public.payment_settings(tenant_id);
create index if not exists idx_payment_settings_data_scope on public.payment_settings(data_scope);

create index if not exists idx_month_closing_tenant_id on public.month_closing(tenant_id);
create index if not exists idx_month_closing_data_scope on public.month_closing(data_scope);
create index if not exists idx_month_closing_group_id on public.month_closing(group_id);

create index if not exists idx_manual_overrides_tenant_id on public.manual_overrides(tenant_id);
create index if not exists idx_manual_overrides_data_scope on public.manual_overrides(data_scope);
create index if not exists idx_manual_overrides_group_id on public.manual_overrides(group_id);

create index if not exists idx_expenses_tenant_id on public.expenses(tenant_id);
create index if not exists idx_expenses_data_scope on public.expenses(data_scope);
create index if not exists idx_expenses_group_id on public.expenses(group_id);

create index if not exists idx_activity_logs_tenant_id on public.activity_logs(tenant_id);
create index if not exists idx_activity_logs_data_scope on public.activity_logs(data_scope);
create index if not exists idx_activity_logs_user_id on public.activity_logs(user_id);
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at);

-- Sprint 1 contract additions. Values and calculations remain application-domain concerns.
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id text not null, data_scope text not null, workspace_id uuid,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  full_name text, platform_role text not null default 'user', is_platform_owner boolean not null default false,
  constraint user_profiles_scope_check check (data_scope in ('own_business','real_tenant','demo_sandbox')),
  constraint user_profiles_platform_role_check check (platform_role in ('user','platform_owner')),
  constraint user_profiles_workspace_scope_fk foreign key (workspace_id,tenant_id,data_scope)
    references public.workspaces(id,tenant_id,data_scope) on delete restrict
);
create table if not exists public.workspace_memberships (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null,
  workspace_id uuid not null, user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  role text not null default 'viewer', status text not null default 'active',
  constraint workspace_memberships_scope_check check (data_scope in ('own_business','real_tenant','demo_sandbox')),
  constraint workspace_memberships_role_check check (role in ('owner','admin','operator','viewer','auditor','subscriber')),
  constraint workspace_memberships_status_check check (status in ('active','disabled','revoked')),
  constraint workspace_memberships_workspace_scope_fk foreign key (workspace_id,tenant_id,data_scope)
    references public.workspaces(id,tenant_id,data_scope) on delete cascade,
  constraint workspace_memberships_unique unique (workspace_id,user_id)
);
create table if not exists public.chit_rules (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null, workspace_id uuid,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  group_id uuid not null references public.chit_groups(id) on delete cascade, rule_type text not null, rule_value jsonb not null default '{}'::jsonb, status text not null default 'active',
  constraint chit_rules_scope_check check (data_scope in ('own_business','real_tenant','demo_sandbox')),
  constraint chit_rules_workspace_scope_fk foreign key (workspace_id,tenant_id,data_scope) references public.workspaces(id,tenant_id,data_scope) on delete restrict,
  constraint chit_rules_group_type_unique unique(tenant_id,data_scope,group_id,rule_type)
);
create table if not exists public.chit_collection_items (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null, workspace_id uuid,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  collection_id uuid not null references public.chit_collections(id) on delete cascade, item_type text not null, amount numeric(14,2) not null default 0,
  constraint chit_collection_items_scope_check check (data_scope in ('own_business','real_tenant','demo_sandbox')),
  constraint chit_collection_items_workspace_scope_fk foreign key (workspace_id,tenant_id,data_scope) references public.workspaces(id,tenant_id,data_scope) on delete restrict,
  constraint chit_collection_items_unique unique(collection_id,item_type)
);
create table if not exists public.chit_ledger_entries (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null, workspace_id uuid,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  group_id uuid references public.chit_groups(id), member_id uuid references public.chit_members(id), collection_id uuid references public.chit_collections(id),
  entry_type text not null, entry_date date not null default current_date, amount numeric(14,2) not null default 0, description text, reference_no text, status text not null default 'posted',
  constraint chit_ledger_entries_scope_check check (data_scope in ('own_business','real_tenant','demo_sandbox')),
  constraint chit_ledger_entries_workspace_scope_fk foreign key (workspace_id,tenant_id,data_scope) references public.workspaces(id,tenant_id,data_scope) on delete restrict,
  constraint chit_ledger_reference_unique unique(tenant_id,data_scope,reference_no)
);
create table if not exists public.report_snapshots (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null, workspace_id uuid,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  report_type text not null, filters jsonb not null default '{}'::jsonb, result jsonb not null default '{}'::jsonb, status text not null default 'ready',
  constraint report_snapshots_scope_check check (data_scope in ('own_business','real_tenant','demo_sandbox')),
  constraint report_snapshots_workspace_scope_fk foreign key (workspace_id,tenant_id,data_scope) references public.workspaces(id,tenant_id,data_scope) on delete restrict
);
create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null, workspace_id uuid,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  import_type text not null, source_name text, status text not null default 'pending', record_counts jsonb not null default '{}'::jsonb, metadata jsonb not null default '{}'::jsonb,
  constraint import_jobs_scope_check check (data_scope in ('own_business','real_tenant','demo_sandbox')),
  constraint import_jobs_workspace_scope_fk foreign key (workspace_id,tenant_id,data_scope) references public.workspaces(id,tenant_id,data_scope) on delete restrict
);
create table if not exists public.migration_runs (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null, workspace_id uuid,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  source text not null default 'local_storage', status text not null default 'pending', dry_run boolean not null default false,
  checkpoint jsonb not null default '{}'::jsonb, reconciliation jsonb not null default '{}'::jsonb, rollback_manifest jsonb not null default '[]'::jsonb,
  constraint migration_runs_scope_check check (data_scope in ('own_business','real_tenant','demo_sandbox')),
  constraint migration_runs_workspace_scope_fk foreign key (workspace_id,tenant_id,data_scope) references public.workspaces(id,tenant_id,data_scope) on delete restrict
);
create table if not exists public.business_identities (
  id uuid primary key default gen_random_uuid(), tenant_id text not null, data_scope text not null, workspace_id uuid,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  legal_name text not null, display_name text, registration_number text, contact_details jsonb not null default '{}'::jsonb, status text not null default 'active',
  constraint business_identities_scope_check check (data_scope in ('own_business','real_tenant','demo_sandbox')),
  constraint business_identities_workspace_scope_fk foreign key (workspace_id,tenant_id,data_scope) references public.workspaces(id,tenant_id,data_scope) on delete restrict,
  constraint business_identities_scope_unique unique(tenant_id,data_scope)
);

-- Compatibility audit: every production column for every pre-existing Sprint 1 table.
select pg_temp.vardhan_add_missing_columns('public.user_profiles'::regclass, '{"id":"uuid","tenant_id":"text","data_scope":"text","workspace_id":"uuid","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","full_name":"text","platform_role":"text default ''user''","is_platform_owner":"boolean default false"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.workspace_memberships'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","workspace_id":"uuid","user_id":"uuid","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","role":"text default ''viewer''","status":"text default ''active''"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.chit_rules'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","workspace_id":"uuid","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","group_id":"uuid","rule_type":"text","rule_value":"jsonb default ''{}''::jsonb","status":"text default ''active''"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.chit_collection_items'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","workspace_id":"uuid","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","collection_id":"uuid","item_type":"text","amount":"numeric(14,2) default 0"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.chit_ledger_entries'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","workspace_id":"uuid","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","group_id":"uuid","member_id":"uuid","collection_id":"uuid","entry_type":"text","entry_date":"date default current_date","amount":"numeric(14,2) default 0","description":"text","reference_no":"text","status":"text default ''posted''"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.report_snapshots'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","workspace_id":"uuid","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","report_type":"text","filters":"jsonb default ''{}''::jsonb","result":"jsonb default ''{}''::jsonb","status":"text default ''ready''"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.import_jobs'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","workspace_id":"uuid","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","import_type":"text","source_name":"text","status":"text default ''pending''","record_counts":"jsonb default ''{}''::jsonb","metadata":"jsonb default ''{}''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.migration_runs'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","workspace_id":"uuid","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","source":"text default ''local_storage''","status":"text default ''pending''","dry_run":"boolean default false","checkpoint":"jsonb default ''{}''::jsonb","reconciliation":"jsonb default ''{}''::jsonb","rollback_manifest":"jsonb default ''[]''::jsonb"}'::jsonb);
select pg_temp.vardhan_add_missing_columns('public.business_identities'::regclass, '{"id":"uuid default gen_random_uuid()","tenant_id":"text","data_scope":"text","workspace_id":"uuid","created_by":"uuid","created_at":"timestamptz default now()","updated_at":"timestamptz default now()","legal_name":"text","display_name":"text","registration_number":"text","contact_details":"jsonb default ''{}''::jsonb","status":"text default ''active''"}'::jsonb);

create index if not exists idx_workspace_memberships_user_scope on public.workspace_memberships(user_id,tenant_id,data_scope);
create index if not exists idx_chit_rules_tenant_scope on public.chit_rules(tenant_id,data_scope);
create index if not exists idx_collection_items_tenant_scope on public.chit_collection_items(tenant_id,data_scope);
create index if not exists idx_ledger_tenant_scope on public.chit_ledger_entries(tenant_id,data_scope);
create index if not exists idx_reports_tenant_scope on public.report_snapshots(tenant_id,data_scope);
create index if not exists idx_import_jobs_tenant_scope on public.import_jobs(tenant_id,data_scope);
create index if not exists idx_migration_runs_tenant_scope on public.migration_runs(tenant_id,data_scope);
create index if not exists idx_business_identities_tenant_scope on public.business_identities(tenant_id,data_scope);

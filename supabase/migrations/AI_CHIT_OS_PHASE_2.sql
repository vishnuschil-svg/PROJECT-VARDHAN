-- AI CHIT OS PHASE 2 - NON-DESTRUCTIVE DRAFT
-- Do not run blindly in production. Review names against the live schema first.

create table if not exists public.chit_winner_results (
  id text primary key,
  tenant_id text not null,
  workspace_id text,
  group_id text not null,
  month_number integer not null,
  member_id text not null,
  winner_mode text not null,
  bid_amount numeric default 0,
  bid_percentage numeric default 0,
  prize_amount numeric default 0,
  payout_amount numeric default 0,
  dividend numeric default 0,
  commission numeric default 0,
  organizer_profit numeric default 0,
  status text not null default 'PROVISIONAL',
  confirmed_by text,
  confirmed_at timestamptz,
  cancelled_by text,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chit_member_states (
  id text primary key,
  tenant_id text not null,
  workspace_id text,
  group_id text not null,
  member_id text not null,
  status text not null,
  joined_month integer default 1,
  lift_month integer default 0,
  lift_effective_month integer default 0,
  winner_type text,
  replacement_for_member_id text,
  replaced_by_member_id text,
  total_paid numeric default 0,
  total_pending numeric default 0,
  total_advance numeric default 0,
  payout_status text,
  is_winner_locked boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chit_lucky_draw_results (
  id text primary key,
  tenant_id text not null,
  workspace_id text,
  group_id text not null,
  month_number integer not null,
  member_id text not null,
  draw_number text,
  random_value text,
  winner_index integer,
  status text not null default 'CONFIRMED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chit_migration_batches (
  id text primary key,
  tenant_id text not null,
  workspace_id text,
  mode text not null,
  current_month integer,
  reconciliation jsonb default '{}'::jsonb,
  records jsonb default '[]'::jsonb,
  status text not null default 'DRAFT',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chit_member_replacements (
  id text primary key,
  tenant_id text not null,
  workspace_id text,
  group_id text not null,
  outgoing_member_id text not null,
  incoming_member_id text not null,
  effective_month integer not null,
  reason text not null,
  transfer_rule text not null default 'FUTURE_ONLY',
  status text not null default 'CONFIRMED',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chit_winner_results_tenant_group on public.chit_winner_results (tenant_id, group_id, month_number);
create index if not exists idx_chit_member_states_tenant_group on public.chit_member_states (tenant_id, group_id, member_id);
create index if not exists idx_chit_lucky_draw_tenant_group on public.chit_lucky_draw_results (tenant_id, group_id, month_number);
create index if not exists idx_chit_migration_batches_tenant on public.chit_migration_batches (tenant_id, status);
create index if not exists idx_chit_member_replacements_tenant_group on public.chit_member_replacements (tenant_id, group_id);

alter table public.chit_winner_results enable row level security;
alter table public.chit_member_states enable row level security;
alter table public.chit_lucky_draw_results enable row level security;
alter table public.chit_migration_batches enable row level security;
alter table public.chit_member_replacements enable row level security;

-- Template policies. Replace app.current_tenant_id with the project's final JWT claim helper.
-- create policy "tenant can manage winner results" on public.chit_winner_results
--   using (tenant_id = auth.jwt()->>'tenant_id')
--   with check (tenant_id = auth.jwt()->>'tenant_id');

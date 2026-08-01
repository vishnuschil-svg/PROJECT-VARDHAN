begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$
begin
  create type public.workspace_role as enum ('owner', 'admin', 'operator', 'viewer', 'auditor');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.group_status as enum ('draft', 'active', 'paused', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.ledger_direction as enum ('debit', 'credit');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.draw_status as enum ('committed', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  base_currency char(3) not null default 'INR' check (base_currency ~ '^[A-Z]{3}$'),
  default_locale text not null default 'en-IN' check (default_locale in ('en-IN', 'te-IN')),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (tenant_id, slug),
  unique (id, tenant_id)
);

create table if not exists public.workspace_members (
  workspace_id uuid not null,
  tenant_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'viewer',
  display_name text,
  permissions jsonb not null default '{}'::jsonb check (jsonb_typeof(permissions) = 'object'),
  joined_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (workspace_id, user_id),
  foreign key (workspace_id, tenant_id) references public.workspaces(id, tenant_id) on delete cascade
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  tenant_id uuid not null,
  external_ref text,
  full_name text not null check (length(btrim(full_name)) between 2 and 160),
  phone_e164 text check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  email text,
  preferred_locale text not null default 'en-IN' check (preferred_locale in ('en-IN', 'te-IN')),
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended', 'closed')),
  profile jsonb not null default '{}'::jsonb check (jsonb_typeof(profile) = 'object'),
  custom_rules jsonb not null default '{}'::jsonb constraint members_custom_rules_object_check check (jsonb_typeof(custom_rules) = 'object'),
  custom_rule_history jsonb not null default '[]'::jsonb constraint members_custom_rule_history_array_check check (jsonb_typeof(custom_rule_history) = 'array'),
  underwriting_metrics jsonb not null default jsonb_build_object(
    'riskScore', null,
    'riskBand', 'unscored',
    'confidence', null,
    'modelVersion', null,
    'factors', '[]'::jsonb,
    'assessedAt', null
  ) check (
    jsonb_typeof(underwriting_metrics) = 'object'
    and coalesce((underwriting_metrics ->> 'riskScore')::numeric between 0 and 1000, true)
    and coalesce((underwriting_metrics ->> 'confidence')::numeric between 0 and 1, true)
  ),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (workspace_id, tenant_id) references public.workspaces(id, tenant_id) on delete cascade,
  unique (workspace_id, external_ref),
  unique (id, workspace_id, tenant_id)
);

create table if not exists public.rule_definitions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  tenant_id uuid not null,
  rule_key text not null check (rule_key ~ '^[a-z][a-z0-9_.-]{2,79}$'),
  name text not null check (length(btrim(name)) between 2 and 120),
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  input_schema jsonb not null default '{}'::jsonb check (jsonb_typeof(input_schema) = 'object'),
  configuration jsonb not null check (jsonb_typeof(configuration) = 'object'),
  source_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(source_payload) = 'object'),
  checksum text generated always as (
    encode(extensions.digest(convert_to(configuration::text, 'UTF8'), 'sha256'), 'hex')
  ) stored,
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, tenant_id) references public.workspaces(id, tenant_id) on delete cascade,
  unique (workspace_id, rule_key, version),
  check (effective_until is null or effective_until > effective_from)
);

create table if not exists public.chit_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  tenant_id uuid not null,
  group_code text not null check (length(btrim(group_code)) between 2 and 40),
  name text not null check (length(btrim(name)) between 2 and 160),
  currency char(3) not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  chit_value numeric(20,4) not null check (chit_value > 0),
  member_count integer not null check (member_count between 2 and 10000),
  duration_months integer not null check (duration_months between 1 and 600),
  commission_rate numeric(9,6) not null default 0 check (commission_rate between 0 and 100),
  start_date date not null,
  status public.group_status not null default 'draft',
  rule_definition_id uuid references public.rule_definitions(id),
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  custom_rules jsonb not null default '{}'::jsonb constraint chit_groups_custom_rules_object_check check (jsonb_typeof(custom_rules) = 'object'),
  custom_rule_history jsonb not null default '[]'::jsonb constraint chit_groups_custom_rule_history_array_check check (jsonb_typeof(custom_rule_history) = 'array'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  foreign key (workspace_id, tenant_id) references public.workspaces(id, tenant_id) on delete cascade,
  unique (workspace_id, group_code),
  unique (id, workspace_id, tenant_id)
);

create table if not exists public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  tenant_id uuid not null,
  chit_group_id uuid not null,
  member_id uuid not null,
  ticket_number integer not null check (ticket_number > 0),
  joined_on date not null default current_date,
  status text not null default 'active' check (status in ('active', 'paused', 'exited', 'completed')),
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (chit_group_id, workspace_id, tenant_id) references public.chit_groups(id, workspace_id, tenant_id) on delete cascade,
  foreign key (member_id, workspace_id, tenant_id) references public.members(id, workspace_id, tenant_id) on restrict,
  unique (chit_group_id, ticket_number),
  unique (chit_group_id, member_id)
);

create table if not exists public.dynamic_ledgers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  tenant_id uuid not null,
  sequence_no bigint not null,
  occurred_at timestamptz not null default now(),
  ledger_type text not null check (ledger_type ~ '^[a-z][a-z0-9_.-]{1,79}$'),
  reference_type text not null check (length(btrim(reference_type)) between 2 and 80),
  reference_id uuid,
  member_id uuid,
  chit_group_id uuid,
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  amount numeric(20,4) not null check (amount >= 0),
  direction public.ledger_direction not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  custom_rules jsonb not null default '{}'::jsonb constraint dynamic_ledgers_custom_rules_object_check check (jsonb_typeof(custom_rules) = 'object'),
  custom_rule_history jsonb not null default '[]'::jsonb constraint dynamic_ledgers_custom_rule_history_array_check check (jsonb_typeof(custom_rule_history) = 'array'),
  previous_hash text,
  entry_hash text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (workspace_id, tenant_id) references public.workspaces(id, tenant_id) on delete cascade,
  foreign key (member_id, workspace_id, tenant_id) references public.members(id, workspace_id, tenant_id) on restrict,
  foreign key (chit_group_id, workspace_id, tenant_id) references public.chit_groups(id, workspace_id, tenant_id) on restrict,
  unique (workspace_id, sequence_no),
  unique (workspace_id, entry_hash)
);

alter table public.members
  add column if not exists custom_rules jsonb not null default '{}'::jsonb,
  add column if not exists custom_rule_history jsonb not null default '[]'::jsonb;

alter table public.chit_groups
  add column if not exists custom_rules jsonb not null default '{}'::jsonb,
  add column if not exists custom_rule_history jsonb not null default '[]'::jsonb;

alter table public.dynamic_ledgers
  add column if not exists custom_rules jsonb not null default '{}'::jsonb,
  add column if not exists custom_rule_history jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'members_custom_rules_object_check' and conrelid = 'public.members'::regclass) then
    alter table public.members add constraint members_custom_rules_object_check check (jsonb_typeof(custom_rules) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'members_custom_rule_history_array_check' and conrelid = 'public.members'::regclass) then
    alter table public.members add constraint members_custom_rule_history_array_check check (jsonb_typeof(custom_rule_history) = 'array');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chit_groups_custom_rules_object_check' and conrelid = 'public.chit_groups'::regclass) then
    alter table public.chit_groups add constraint chit_groups_custom_rules_object_check check (jsonb_typeof(custom_rules) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chit_groups_custom_rule_history_array_check' and conrelid = 'public.chit_groups'::regclass) then
    alter table public.chit_groups add constraint chit_groups_custom_rule_history_array_check check (jsonb_typeof(custom_rule_history) = 'array');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'dynamic_ledgers_custom_rules_object_check' and conrelid = 'public.dynamic_ledgers'::regclass) then
    alter table public.dynamic_ledgers add constraint dynamic_ledgers_custom_rules_object_check check (jsonb_typeof(custom_rules) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'dynamic_ledgers_custom_rule_history_array_check' and conrelid = 'public.dynamic_ledgers'::regclass) then
    alter table public.dynamic_ledgers add constraint dynamic_ledgers_custom_rule_history_array_check check (jsonb_typeof(custom_rule_history) = 'array');
  end if;
end $$;

create table if not exists public.exchange_rates (
  id bigint generated always as identity primary key,
  base_currency char(3) not null check (base_currency ~ '^[A-Z]{3}$'),
  quote_currency char(3) not null check (quote_currency ~ '^[A-Z]{3}$'),
  rate numeric(30,12) not null check (rate > 0),
  provider text not null check (length(btrim(provider)) between 2 and 80),
  observed_at timestamptz not null,
  received_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  unique (base_currency, quote_currency, provider, observed_at),
  check (base_currency <> quote_currency)
);

create table if not exists public.lucky_draw_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  tenant_id uuid not null,
  chit_group_id uuid not null,
  status public.draw_status not null default 'committed',
  eligible_member_ids uuid[] not null check (cardinality(eligible_member_ids) > 0),
  commitment_hash text not null check (commitment_hash ~ '^[0-9a-f]{64}$'),
  server_seed_ciphertext bytea not null,
  client_entropy_hash text,
  result_entropy_hash text,
  winner_member_id uuid,
  revealed_server_seed text,
  committed_at timestamptz not null default now(),
  reveal_not_before timestamptz not null,
  completed_at timestamptz,
  created_by uuid not null references auth.users(id),
  foreign key (chit_group_id, workspace_id, tenant_id) references public.chit_groups(id, workspace_id, tenant_id) on delete cascade,
  foreign key (winner_member_id, workspace_id, tenant_id) references public.members(id, workspace_id, tenant_id) on restrict,
  check (reveal_not_before > committed_at),
  check (
    (status = 'committed' and winner_member_id is null and completed_at is null)
    or (status = 'completed' and winner_member_id is not null and completed_at is not null)
    or status = 'cancelled'
  )
);

create table if not exists public.ai_presentations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  tenant_id uuid not null,
  locale text not null check (locale in ('en-IN', 'te-IN')),
  title text not null,
  narrative jsonb not null check (jsonb_typeof(narrative) = 'object'),
  media_url text,
  status text not null default 'scripted' check (status in ('scripted', 'rendering', 'ready', 'failed', 'expired')),
  provider_ref text,
  expires_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, tenant_id) references public.workspaces(id, tenant_id) on delete cascade
);

create index if not exists workspace_members_user_idx on public.workspace_members (user_id, workspace_id) where revoked_at is null;
create index if not exists members_workspace_status_idx on public.members (workspace_id, status) where deleted_at is null;
create index if not exists members_risk_idx on public.members (workspace_id, ((underwriting_metrics ->> 'riskScore')::numeric));
create index if not exists members_custom_rules_gin_idx on public.members using gin (custom_rules jsonb_path_ops);
create index if not exists members_custom_rule_history_gin_idx on public.members using gin (custom_rule_history jsonb_path_ops);
create index if not exists rules_workspace_active_idx on public.rule_definitions (workspace_id, rule_key, effective_from desc) where status = 'active';
create index if not exists groups_workspace_status_idx on public.chit_groups (workspace_id, status);
create index if not exists groups_custom_rules_gin_idx on public.chit_groups using gin (custom_rules jsonb_path_ops);
create index if not exists groups_custom_rule_history_gin_idx on public.chit_groups using gin (custom_rule_history jsonb_path_ops);
create index if not exists memberships_member_idx on public.group_memberships (workspace_id, member_id, status);
create index if not exists ledger_workspace_time_idx on public.dynamic_ledgers (workspace_id, occurred_at desc);
create index if not exists ledger_reference_idx on public.dynamic_ledgers (workspace_id, reference_type, reference_id);
create index if not exists ledger_payload_gin_idx on public.dynamic_ledgers using gin (payload jsonb_path_ops);
create index if not exists ledger_custom_rules_gin_idx on public.dynamic_ledgers using gin (custom_rules jsonb_path_ops);
create index if not exists ledger_custom_rule_history_gin_idx on public.dynamic_ledgers using gin (custom_rule_history jsonb_path_ops);
create index if not exists exchange_rates_pair_time_idx on public.exchange_rates (base_currency, quote_currency, observed_at desc);
create index if not exists draw_workspace_status_idx on public.lucky_draw_sessions (workspace_id, status, reveal_not_before);

create or replace function private.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = auth.uid()
      and wm.revoked_at is null
  );
$$;

create or replace function private.has_workspace_role(target_workspace uuid, allowed_roles public.workspace_role[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = auth.uid()
      and wm.revoked_at is null
      and wm.role = any(allowed_roles)
  );
$$;

create or replace function private.is_workspace_tenant_member(target_workspace uuid, target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.tenant_id = target_tenant
      and wm.user_id = auth.uid()
      and wm.revoked_at is null
  );
$$;

create or replace function private.has_workspace_tenant_role(
  target_workspace uuid,
  target_tenant uuid,
  allowed_roles public.workspace_role[]
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.tenant_id = target_tenant
      and wm.user_id = auth.uid()
      and wm.revoked_at is null
      and wm.role = any(allowed_roles)
  );
$$;

revoke all on function private.is_workspace_member(uuid) from public, anon, authenticated;
revoke all on function private.has_workspace_role(uuid, public.workspace_role[]) from public, anon, authenticated;
revoke all on function private.is_workspace_tenant_member(uuid, uuid) from public, anon, authenticated;
revoke all on function private.has_workspace_tenant_role(uuid, uuid, public.workspace_role[]) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.has_workspace_role(uuid, public.workspace_role[]) to authenticated;
grant execute on function private.is_workspace_tenant_member(uuid, uuid) to authenticated;
grant execute on function private.has_workspace_tenant_role(uuid, uuid, public.workspace_role[]) to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create or replace function private.bootstrap_workspace_owner()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.workspace_members (workspace_id, tenant_id, user_id, role)
  values (new.id, new.tenant_id, new.created_by, 'owner');
  return new;
end;
$$;

create or replace function private.prepare_immutable_ledger_entry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  prior public.dynamic_ledgers%rowtype;
  canonical jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.workspace_id::text, 0));

  select * into prior
  from public.dynamic_ledgers
  where workspace_id = new.workspace_id
  order by sequence_no desc
  limit 1;

  new.sequence_no := coalesce(prior.sequence_no, 0) + 1;
  new.previous_hash := prior.entry_hash;
  new.created_at := coalesce(new.created_at, statement_timestamp());
  new.created_by := coalesce(new.created_by, auth.uid());

  canonical := jsonb_build_object(
    'id', new.id,
    'workspaceId', new.workspace_id,
    'tenantId', new.tenant_id,
    'sequenceNo', new.sequence_no,
    'occurredAt', new.occurred_at,
    'ledgerType', new.ledger_type,
    'referenceType', new.reference_type,
    'referenceId', new.reference_id,
    'memberId', new.member_id,
    'chitGroupId', new.chit_group_id,
    'currency', new.currency,
    'amount', new.amount,
    'direction', new.direction,
    'payload', new.payload,
    'customRules', new.custom_rules,
    'customRuleHistory', new.custom_rule_history,
    'previousHash', new.previous_hash,
    'createdBy', new.created_by,
    'createdAt', new.created_at
  );

  new.entry_hash := encode(digest(convert_to(canonical::text, 'UTF8'), 'sha256'), 'hex');
  return new;
end;
$$;

create or replace function private.reject_immutable_ledger_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'dynamic_ledgers is append-only' using errcode = '55000';
end;
$$;

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at before update on public.workspaces for each row execute function private.set_updated_at();
drop trigger if exists members_set_updated_at on public.members;
create trigger members_set_updated_at before update on public.members for each row execute function private.set_updated_at();
drop trigger if exists rules_set_updated_at on public.rule_definitions;
create trigger rules_set_updated_at before update on public.rule_definitions for each row execute function private.set_updated_at();
drop trigger if exists groups_set_updated_at on public.chit_groups;
create trigger groups_set_updated_at before update on public.chit_groups for each row execute function private.set_updated_at();
drop trigger if exists memberships_set_updated_at on public.group_memberships;
create trigger memberships_set_updated_at before update on public.group_memberships for each row execute function private.set_updated_at();
drop trigger if exists presentations_set_updated_at on public.ai_presentations;
create trigger presentations_set_updated_at before update on public.ai_presentations for each row execute function private.set_updated_at();
drop trigger if exists workspace_owner_bootstrap on public.workspaces;
create trigger workspace_owner_bootstrap after insert on public.workspaces for each row execute function private.bootstrap_workspace_owner();
drop trigger if exists ledger_prepare_immutable on public.dynamic_ledgers;
create trigger ledger_prepare_immutable before insert on public.dynamic_ledgers for each row execute function private.prepare_immutable_ledger_entry();
drop trigger if exists ledger_reject_mutation on public.dynamic_ledgers;
create trigger ledger_reject_mutation before update or delete on public.dynamic_ledgers for each row execute function private.reject_immutable_ledger_mutation();

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.members enable row level security;
alter table public.rule_definitions enable row level security;
alter table public.chit_groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.dynamic_ledgers enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.lucky_draw_sessions enable row level security;
alter table public.ai_presentations enable row level security;

alter table public.workspaces force row level security;
alter table public.workspace_members force row level security;
alter table public.members force row level security;
alter table public.rule_definitions force row level security;
alter table public.chit_groups force row level security;
alter table public.group_memberships force row level security;
alter table public.dynamic_ledgers force row level security;
alter table public.exchange_rates force row level security;
alter table public.lucky_draw_sessions force row level security;
alter table public.ai_presentations force row level security;

drop policy if exists workspaces_select on public.workspaces;
create policy workspaces_select on public.workspaces for select to authenticated using (private.is_workspace_member(id));
drop policy if exists workspaces_insert on public.workspaces;
create policy workspaces_insert on public.workspaces for insert to authenticated with check (auth.uid() is not null and created_by = auth.uid());
drop policy if exists workspaces_update on public.workspaces;
create policy workspaces_update on public.workspaces for update to authenticated
  using (private.has_workspace_role(id, array['owner','admin']::public.workspace_role[]))
  with check (private.has_workspace_role(id, array['owner','admin']::public.workspace_role[]));

drop policy if exists workspace_members_select on public.workspace_members;
create policy workspace_members_select on public.workspace_members for select to authenticated using (private.is_workspace_member(workspace_id));
drop policy if exists workspace_members_insert on public.workspace_members;
create policy workspace_members_insert on public.workspace_members for insert to authenticated
  with check (private.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));
drop policy if exists workspace_members_update on public.workspace_members;
create policy workspace_members_update on public.workspace_members for update to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]))
  with check (private.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));
drop policy if exists workspace_members_delete on public.workspace_members;
create policy workspace_members_delete on public.workspace_members for delete to authenticated
  using (private.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]));

do $$
declare
  target_table text;
begin
  foreach target_table in array array['rule_definitions','group_memberships','ai_presentations']
  loop
    execute format('drop policy if exists %I on public.%I', target_table || '_select', target_table);
    execute format('create policy %I on public.%I for select to authenticated using (private.is_workspace_member(workspace_id))', target_table || '_select', target_table);
    execute format('drop policy if exists %I on public.%I', target_table || '_insert', target_table);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.has_workspace_role(workspace_id, array[''owner'',''admin'',''operator'']::public.workspace_role[]) and created_by = auth.uid())', target_table || '_insert', target_table);
    execute format('drop policy if exists %I on public.%I', target_table || '_update', target_table);
    execute format('create policy %I on public.%I for update to authenticated using (private.has_workspace_role(workspace_id, array[''owner'',''admin'',''operator'']::public.workspace_role[])) with check (private.has_workspace_role(workspace_id, array[''owner'',''admin'',''operator'']::public.workspace_role[]))', target_table || '_update', target_table);
  end loop;
end $$;

drop policy if exists members_select on public.members;
create policy members_select on public.members for select to authenticated
  using (private.is_workspace_tenant_member(workspace_id, tenant_id));
drop policy if exists members_insert on public.members;
create policy members_insert on public.members for insert to authenticated
  with check (
    private.has_workspace_tenant_role(workspace_id, tenant_id, array['owner','admin','operator']::public.workspace_role[])
    and created_by = auth.uid()
  );
drop policy if exists members_update on public.members;
create policy members_update on public.members for update to authenticated
  using (private.has_workspace_tenant_role(workspace_id, tenant_id, array['owner','admin','operator']::public.workspace_role[]))
  with check (private.has_workspace_tenant_role(workspace_id, tenant_id, array['owner','admin','operator']::public.workspace_role[]));

drop policy if exists chit_groups_select on public.chit_groups;
create policy chit_groups_select on public.chit_groups for select to authenticated
  using (private.is_workspace_tenant_member(workspace_id, tenant_id));
drop policy if exists chit_groups_insert on public.chit_groups;
create policy chit_groups_insert on public.chit_groups for insert to authenticated
  with check (
    private.has_workspace_tenant_role(workspace_id, tenant_id, array['owner','admin','operator']::public.workspace_role[])
    and created_by = auth.uid()
  );
drop policy if exists chit_groups_update on public.chit_groups;
create policy chit_groups_update on public.chit_groups for update to authenticated
  using (private.has_workspace_tenant_role(workspace_id, tenant_id, array['owner','admin','operator']::public.workspace_role[]))
  with check (private.has_workspace_tenant_role(workspace_id, tenant_id, array['owner','admin','operator']::public.workspace_role[]));

drop policy if exists dynamic_ledgers_select on public.dynamic_ledgers;
create policy dynamic_ledgers_select on public.dynamic_ledgers for select to authenticated
  using (private.is_workspace_tenant_member(workspace_id, tenant_id));
drop policy if exists dynamic_ledgers_insert on public.dynamic_ledgers;
create policy dynamic_ledgers_insert on public.dynamic_ledgers for insert to authenticated
  with check (
    private.has_workspace_tenant_role(workspace_id, tenant_id, array['owner','admin','operator']::public.workspace_role[])
    and created_by = auth.uid()
  );

drop policy if exists exchange_rates_select on public.exchange_rates;
create policy exchange_rates_select on public.exchange_rates for select to authenticated using (auth.uid() is not null);

drop policy if exists lucky_draw_sessions_select on public.lucky_draw_sessions;
create policy lucky_draw_sessions_select on public.lucky_draw_sessions for select to authenticated using (private.is_workspace_member(workspace_id));

revoke all on all tables in schema public from anon;
grant select, insert, update on public.workspaces, public.workspace_members, public.members, public.rule_definitions, public.chit_groups, public.group_memberships, public.ai_presentations to authenticated;
grant delete on public.workspace_members to authenticated;
grant select, insert on public.dynamic_ledgers to authenticated;
grant select on public.exchange_rates, public.lucky_draw_sessions to authenticated;
grant usage, select on all sequences in schema public to authenticated;

commit;

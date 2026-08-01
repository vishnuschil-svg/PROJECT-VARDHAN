-- DEPENDS_ON: none
-- Additive bridge for legacy tables that are referenced by later CREATE TABLE statements.
-- It never drops, renames, truncates, or recreates a table and is safe to rerun.

create extension if not exists pgcrypto;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'chit_groups','chit_members','chit_collections','communication_templates','chit_auctions','tenant_backups'
  ] loop
    if pg_catalog.to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I add column if not exists id uuid default gen_random_uuid()', table_name);
      execute format('create unique index if not exists %I on public.%I(id)', 'ux_vardhan_legacy_' || table_name || '_id', table_name);
    end if;
  end loop;

  if pg_catalog.to_regclass('public.workspaces') is not null then
    alter table public.workspaces add column if not exists id uuid default gen_random_uuid();
    alter table public.workspaces add column if not exists tenant_id text;
    alter table public.workspaces add column if not exists data_scope text;
    create unique index if not exists ux_workspaces_identity_scope_compat
      on public.workspaces(id,tenant_id,data_scope);
  end if;
end;
$$;

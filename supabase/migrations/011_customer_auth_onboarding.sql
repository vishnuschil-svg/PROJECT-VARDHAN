-- DEPENDS_ON: 010_ingestion_jobs_queue.sql
-- Verified customer onboarding built on Supabase Auth and the canonical tenant model.
-- This migration is additive and safe to retry.

alter table public.user_profiles add column if not exists email text;
alter table public.user_profiles add column if not exists mobile text;
alter table public.user_profiles add column if not exists business_name text;
alter table public.user_profiles add column if not exists onboarding_status text not null default 'profile_ready';

create unique index if not exists ux_user_profiles_email
  on public.user_profiles (lower(email)) where email is not null;
create unique index if not exists ux_user_profiles_mobile
  on public.user_profiles (mobile) where mobile is not null;
create unique index if not exists ux_licenses_tenant_product
  on public.licenses (tenant_id, data_scope, product_id);

create or replace function public.upsert_verified_customer_profile()
returns public.user_profiles
language plpgsql
security definer
set search_path = pg_catalog, public, auth
set row_security = off
as $$
declare
  v_user auth.users%rowtype;
  v_profile public.user_profiles%rowtype;
  v_tenant_id text;
  v_full_name text;
  v_business_name text;
  v_mobile text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null or v_user.email_confirmed_at is null then
    raise exception 'EMAIL_VERIFICATION_REQUIRED';
  end if;

  v_full_name := nullif(btrim(coalesce(v_user.raw_user_meta_data ->> 'full_name', '')), '');
  v_business_name := nullif(btrim(coalesce(v_user.raw_user_meta_data ->> 'business_name', '')), '');
  v_mobile := nullif(btrim(coalesce(v_user.raw_user_meta_data ->> 'mobile', '')), '');
  if v_mobile is not null and v_mobile !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'INVALID_MOBILE';
  end if;
  v_tenant_id := 'customer-' || replace(v_user.id::text, '-', '');

  insert into public.user_profiles (
    id, tenant_id, data_scope, workspace_id, created_by, full_name,
    platform_role, is_platform_owner, email, mobile, business_name, onboarding_status
  ) values (
    v_user.id, v_tenant_id, 'real_tenant', null, v_user.id, v_full_name,
    'user', false, lower(v_user.email), v_mobile, v_business_name, 'profile_ready'
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.user_profiles.full_name),
    email = excluded.email,
    mobile = coalesce(excluded.mobile, public.user_profiles.mobile),
    business_name = coalesce(excluded.business_name, public.user_profiles.business_name),
    onboarding_status = case
      when public.user_profiles.onboarding_status = 'complete' then 'complete'
      else 'profile_ready'
    end,
    updated_at = now()
  returning * into v_profile;

  return v_profile;
exception
  when unique_violation then
    raise exception 'IDENTITY_ALREADY_REGISTERED';
end;
$$;

create or replace function public.provision_customer_workspace(
  p_business_name text,
  p_business_type text default 'chit_management'
)
returns table (result_workspace_id uuid, result_tenant_id text, result_onboarding_status text)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
set row_security = off
as $$
declare
  v_profile public.user_profiles%rowtype;
  v_workspace public.workspaces%rowtype;
  v_business_name text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_business_type is distinct from 'chit_management' then
    raise exception 'UNSUPPORTED_BUSINESS_TYPE';
  end if;
  v_business_name := nullif(btrim(coalesce(p_business_name, '')), '');
  if v_business_name is null then
    raise exception 'BUSINESS_NAME_REQUIRED';
  end if;

  select * into v_profile from public.user_profiles where id = auth.uid() for update;
  if v_profile.id is null then
    raise exception 'VERIFIED_PROFILE_REQUIRED';
  end if;

  insert into public.workspaces (
    tenant_id, data_scope, created_by, status, customer_id, business_name,
    business_type, module, plan, license_type, owner, route, settings
  ) values (
    v_profile.tenant_id, v_profile.data_scope, auth.uid(), 'active', v_profile.tenant_id,
    v_business_name, p_business_type, 'MITRA_NIDHI_CHITI_PRO', 'Free Trial', 'Trial',
    coalesce(v_profile.full_name, 'Business Owner'), '/dashboard',
    jsonb_build_object('onboarding_version', 1, 'product_id', 'chit_management')
  )
  on conflict (tenant_id, data_scope) do update set
    business_name = excluded.business_name,
    business_type = excluded.business_type,
    updated_at = now()
  where public.workspaces.created_by = auth.uid()
  returning * into v_workspace;

  if v_workspace.id is null or v_workspace.created_by is distinct from auth.uid() then
    raise exception 'WORKSPACE_OWNERSHIP_CONFLICT';
  end if;

  insert into public.workspace_memberships (
    tenant_id, data_scope, workspace_id, user_id, created_by, role, status
  ) values (
    v_workspace.tenant_id, v_workspace.data_scope, v_workspace.id, auth.uid(), auth.uid(), 'owner', 'active'
  )
  on conflict (workspace_id, user_id) do update set
    role = 'owner', status = 'active', updated_at = now()
  where public.workspace_memberships.created_by = auth.uid();

  insert into public.licenses (
    tenant_id, data_scope, created_by, status, customer_id, product_id,
    plan_type, billing_cycle, seats, used_seats, starts_on, expires_on, metadata
  ) values (
    v_workspace.tenant_id, v_workspace.data_scope, auth.uid(), 'trial', v_workspace.tenant_id,
    'chit_management', 'Free Trial', 'Trial', 10, 1, current_date, current_date + 30,
    jsonb_build_object('provisioned_by', 'customer_onboarding_v1')
  )
  on conflict (tenant_id, data_scope, product_id) do update set
    used_seats = greatest(public.licenses.used_seats, 1), updated_at = now();

  update public.user_profiles set
    workspace_id = v_workspace.id,
    business_name = v_business_name,
    onboarding_status = 'complete',
    updated_at = now()
  where id = auth.uid();

  return query select v_workspace.id, v_workspace.tenant_id, 'complete'::text;
end;
$$;

revoke all on function public.upsert_verified_customer_profile() from public, anon, authenticated;
revoke all on function public.provision_customer_workspace(text, text) from public, anon, authenticated;
grant execute on function public.upsert_verified_customer_profile() to authenticated;
grant execute on function public.provision_customer_workspace(text, text) to authenticated;

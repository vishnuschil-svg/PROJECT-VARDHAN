-- Run after migrations in a disposable Supabase test project, replacing the UUIDs.
-- Each transaction uses request.jwt.claim.sub to exercise authenticated RLS.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'tenant_a_user_id', true);
select count(*) as same_tenant_visible from public.chit_groups where tenant_id = :'tenant_a';
select count(*) as cross_tenant_must_be_zero from public.chit_groups where tenant_id = :'tenant_b';
savepoint unauthorized_insert;
insert into public.chit_groups (tenant_id,data_scope,chit_name,chit_code)
values (:'tenant_b','real_tenant','DENIED','RLS-DENIED'); -- expected: RLS violation
rollback to unauthorized_insert;
savepoint unauthorized_update;
update public.chit_groups set notes = 'DENIED' where tenant_id = :'tenant_b'; -- expected affected rows: 0
rollback to unauthorized_update;
savepoint unauthorized_delete;
delete from public.chit_groups where tenant_id = :'tenant_b'; -- expected affected rows: 0
rollback to unauthorized_delete;
rollback;

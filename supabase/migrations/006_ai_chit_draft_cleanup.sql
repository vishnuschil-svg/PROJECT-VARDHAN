begin;

create or replace function public.delete_pending_ai_chit_draft(
  p_extraction_id uuid,
  p_workspace_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  delete from public.ai_chit_extractions extraction
  where extraction.id = p_extraction_id
    and extraction.workspace_id = p_workspace_id
    and extraction.created_by = auth.uid()
    and extraction.status = 'PENDING_REVIEW'
    and exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = extraction.workspace_id
        and membership.tenant_id = extraction.tenant_id
        and membership.data_scope = extraction.data_scope
        and membership.user_id = auth.uid()
        and membership.status = 'active'
        and membership.role in ('owner', 'admin', 'operator')
    );

  get diagnostics deleted_count = row_count;
  return deleted_count = 1;
end;
$$;

revoke all on function public.delete_pending_ai_chit_draft(uuid, uuid) from public;
grant execute on function public.delete_pending_ai_chit_draft(uuid, uuid) to authenticated;

commit;

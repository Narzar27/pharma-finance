-- supabase/migrations/20260711075022_rename_tenant_function.sql
-- Lets an active owner/admin rename their own tenant's business name.
-- SECURITY DEFINER with a hardcoded, single-column SET clause (only ever
-- touches `name`), matching the pattern used throughout this project's
-- other sensitive mutations (request_add_teammate, claim_invited_membership).

create or replace function public.rename_tenant(p_tenant_id uuid, p_name text)
returns public.tenants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant public.tenants;
begin
  if not public.has_active_tenant_role(p_tenant_id, array['owner','admin']) then
    raise exception 'Not authorized.';
  end if;

  if trim(p_name) = '' then
    raise exception 'Business name cannot be empty.';
  end if;

  update public.tenants set name = trim(p_name) where id = p_tenant_id
  returning * into v_tenant;

  if v_tenant.id is null then
    raise exception 'Business not found.';
  end if;

  return v_tenant;
end;
$$;

revoke execute on function public.rename_tenant(uuid, text) from public;
grant execute on function public.rename_tenant(uuid, text) to authenticated;

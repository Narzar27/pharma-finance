-- supabase/migrations/20260711122749_tenant_default_exchange_rate.sql
-- A per-tenant default USD/LBP rate that pre-fills the cross-currency
-- payment field on invoices, so it doesn't need retyping every time.
-- Still overridable per payment; owner/admin can update it whenever the
-- real rate changes, same pattern as rename_tenant.

alter table public.tenants
  add column if not exists default_exchange_rate numeric check (default_exchange_rate is null or default_exchange_rate > 0);

create or replace function public.set_default_exchange_rate(p_tenant_id uuid, p_rate numeric)
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

  if p_rate is not null and p_rate <= 0 then
    raise exception 'Exchange rate must be greater than zero.';
  end if;

  update public.tenants set default_exchange_rate = p_rate where id = p_tenant_id
  returning * into v_tenant;

  if v_tenant.id is null then
    raise exception 'Business not found.';
  end if;

  return v_tenant;
end;
$$;

revoke execute on function public.set_default_exchange_rate(uuid, numeric) from public;
grant execute on function public.set_default_exchange_rate(uuid, numeric) to authenticated;

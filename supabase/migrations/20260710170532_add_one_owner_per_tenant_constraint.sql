-- Ensure at most one owner row per tenant to close TOCTOU race in RLS policy.
-- A unique partial index on role='owner' makes the guarantee atomic at constraint level,
-- preventing concurrent INSERT transactions from both succeeding under READ COMMITTED isolation.

create unique index if not exists tenant_members_one_owner_per_tenant
  on public.tenant_members(tenant_id)
  where role = 'owner';

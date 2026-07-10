-- supabase/migrations/20260710120300_tenant_scope_business_tables.sql

alter table public.suppliers add column if not exists tenant_id uuid references public.tenants(id);
alter table public.invoices add column if not exists tenant_id uuid references public.tenants(id);
alter table public.payments add column if not exists tenant_id uuid references public.tenants(id);
alter table public.income_records add column if not exists tenant_id uuid references public.tenants(id);

-- Backfill any existing rows (none today) to tenant #1 so the NOT NULL
-- constraint below can never fail.
update public.suppliers set tenant_id = (select id from public.tenants order by created_at limit 1) where tenant_id is null;
update public.invoices set tenant_id = (select id from public.tenants order by created_at limit 1) where tenant_id is null;
update public.payments set tenant_id = (select id from public.tenants order by created_at limit 1) where tenant_id is null;
update public.income_records set tenant_id = (select id from public.tenants order by created_at limit 1) where tenant_id is null;

alter table public.suppliers alter column tenant_id set not null;
alter table public.invoices alter column tenant_id set not null;
alter table public.payments alter column tenant_id set not null;
alter table public.income_records alter column tenant_id set not null;

create index if not exists suppliers_tenant_id_idx on public.suppliers(tenant_id);
create index if not exists invoices_tenant_id_idx on public.invoices(tenant_id);
create index if not exists payments_tenant_id_idx on public.payments(tenant_id);
create index if not exists income_records_tenant_id_idx on public.income_records(tenant_id);

-- Note: policies use public.is_active_tenant_member(tenant_id) instead of a raw
-- subquery against public.tenant_members. Task 3's review found that a raw
-- subquery of the form `tenant_id in (select tenant_id from tenant_members
-- where user_id = auth.uid() and status = 'active')` in a policy on
-- tenant_members itself causes infinite recursion (42P17). To avoid that whole
-- class of bug consistently, all tenant-scoped policies (including these,
-- which aren't on tenant_members but follow the same pattern) go through the
-- existing SECURITY DEFINER helper, which queries tenant_members bypassing RLS.

drop policy if exists suppliers_authenticated on public.suppliers;
create policy suppliers_tenant_access on public.suppliers
  for all to authenticated
  using (public.is_active_tenant_member(tenant_id))
  with check (public.is_active_tenant_member(tenant_id));

drop policy if exists invoices_authenticated on public.invoices;
create policy invoices_tenant_access on public.invoices
  for all to authenticated
  using (public.is_active_tenant_member(tenant_id))
  with check (public.is_active_tenant_member(tenant_id));

drop policy if exists payments_authenticated on public.payments;
create policy payments_tenant_access on public.payments
  for all to authenticated
  using (public.is_active_tenant_member(tenant_id))
  with check (public.is_active_tenant_member(tenant_id));

drop policy if exists income_records_authenticated on public.income_records;
create policy income_records_tenant_access on public.income_records
  for all to authenticated
  using (public.is_active_tenant_member(tenant_id))
  with check (public.is_active_tenant_member(tenant_id));

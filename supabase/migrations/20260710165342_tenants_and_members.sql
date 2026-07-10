-- supabase/migrations/20260710120100_tenants_and_members.sql

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id),
  email text not null,
  first_name text not null,
  last_name text not null,
  dob date not null,
  role text not null check (role in ('owner', 'admin', 'manager', 'user')),
  status text not null default 'pending' check (status in ('pending', 'invited', 'active', 'rejected')),
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id)
);

create index if not exists tenant_members_tenant_id_idx on public.tenant_members(tenant_id);
create index if not exists tenant_members_user_id_idx on public.tenant_members(user_id);
create index if not exists tenant_members_email_idx on public.tenant_members(email);

alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;

-- tenants policies
drop policy if exists tenants_member_select on public.tenants;
create policy tenants_member_select on public.tenants
  for select to authenticated
  using (id in (select tenant_id from public.tenant_members where user_id = auth.uid()));

drop policy if exists tenants_self_signup_insert on public.tenants;
create policy tenants_self_signup_insert on public.tenants
  for insert to authenticated
  with check (status = 'pending');

drop policy if exists tenants_platform_admin_all on public.tenants;
create policy tenants_platform_admin_all on public.tenants
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean = true)
  with check ((auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean = true);

-- tenant_members policies
drop policy if exists tenant_members_self_select on public.tenant_members;
create policy tenant_members_self_select on public.tenant_members
  for select to authenticated
  using (user_id = auth.uid() or email = auth.jwt() ->> 'email');

drop policy if exists tenant_members_team_select on public.tenant_members;
create policy tenant_members_team_select on public.tenant_members
  for select to authenticated
  using (
    tenant_id in (
      select tenant_id from public.tenant_members
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists tenant_members_self_signup_insert on public.tenant_members;
create policy tenant_members_self_signup_insert on public.tenant_members
  for insert to authenticated
  with check (user_id = auth.uid() and role = 'owner' and status = 'pending');

drop policy if exists tenant_members_owner_admin_insert on public.tenant_members;
create policy tenant_members_owner_admin_insert on public.tenant_members
  for insert to authenticated
  with check (
    role <> 'owner' and status = 'pending' and user_id is null
    and tenant_id in (
      select tenant_id from public.tenant_members
      where user_id = auth.uid() and status = 'active' and role in ('owner', 'admin')
    )
  );

drop policy if exists tenant_members_claim_invited on public.tenant_members;
create policy tenant_members_claim_invited on public.tenant_members
  for update to authenticated
  using (email = auth.jwt() ->> 'email' and user_id is null and status = 'invited')
  with check (user_id = auth.uid() and status = 'active');

drop policy if exists tenant_members_platform_admin_all on public.tenant_members;
create policy tenant_members_platform_admin_all on public.tenant_members
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean = true)
  with check ((auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean = true);

-- Bootstrap tenant #1 for the two existing accounts (both already active,
-- no approval needed for data that predates the approval system).
insert into public.tenants (name, status)
values ('Original Pharmacy (rename me)', 'active');

insert into public.tenant_members (tenant_id, user_id, email, first_name, last_name, dob, role, status, decided_at)
select
  (select id from public.tenants where name = 'Original Pharmacy (rename me)'),
  '7af4e554-1f43-469e-b2f0-c8c2db5857d7', 'nizarafiouni123@gmail.com', 'Nizar', 'Owner', '1990-01-01', 'owner', 'active', now();

insert into public.tenant_members (tenant_id, user_id, email, first_name, last_name, dob, role, status, decided_at)
select
  (select id from public.tenants where name = 'Original Pharmacy (rename me)'),
  'cd491987-bd9c-4b5c-b4bf-9a6cccd73e25', 'nizarafiouni321@gmail.com', 'Teammate', 'Member', '1990-01-01', 'user', 'active', now();

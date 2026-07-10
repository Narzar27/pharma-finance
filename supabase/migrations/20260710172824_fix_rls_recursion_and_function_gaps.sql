-- Fix: infinite recursion in tenant_members RLS policies (42P17), plus two
-- related function gaps found during real-authenticated-session review of
-- Task 3 (the earlier review only exercised these via the Supabase SQL
-- editor's superuser context, which bypasses RLS entirely and never
-- triggers the recursion).
--
-- Root cause: several policies on public.tenant_members subquery
-- tenant_members itself inside their USING/WITH CHECK clause. Evaluating
-- the policy requires re-applying RLS to resolve the inner subquery's rows
-- against the same table, which re-triggers the same policy -- recursing
-- without bound. tenants_member_select doesn't self-reference tenants, but
-- its subquery hits tenant_members, which triggers tenant_members's own
-- (recursive) policies transitively.
--
-- Standard fix: wrap each "check my own membership" lookup in a
-- SECURITY DEFINER SQL function. A SECURITY DEFINER function's internal
-- query bypasses RLS entirely (runs as the function owner), so it can
-- safely look up tenant_members rows without re-triggering the table's own
-- policies. Each function only ever checks the *calling user's own*
-- membership (auth.uid()), never an arbitrary other user, so it doesn't
-- create a privilege-escalation path -- it's a lookup helper, not an
-- authorization bypass for arbitrary access.

-- 1. Helper functions ---------------------------------------------------

create or replace function public.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.tenant_members
    where tenant_id = p_tenant_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_active_tenant_member(p_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.tenant_members
    where tenant_id = p_tenant_id and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.has_active_tenant_role(p_tenant_id uuid, p_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.tenant_members
    where tenant_id = p_tenant_id and user_id = auth.uid() and status = 'active' and role = any(p_roles)
  );
$$;

create or replace function public.tenant_has_any_member(p_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.tenant_members where tenant_id = p_tenant_id
  );
$$;

revoke execute on function public.is_tenant_member(uuid) from public;
revoke execute on function public.is_active_tenant_member(uuid) from public;
revoke execute on function public.has_active_tenant_role(uuid, text[]) from public;
revoke execute on function public.tenant_has_any_member(uuid) from public;
grant execute on function public.is_tenant_member(uuid) to authenticated;
grant execute on function public.is_active_tenant_member(uuid) to authenticated;
grant execute on function public.has_active_tenant_role(uuid, text[]) to authenticated;
grant execute on function public.tenant_has_any_member(uuid) to authenticated;

-- 2. Rewrite the 4 self-referencing policies to use the helpers ---------
-- (tenants_platform_admin_all, tenant_members_platform_admin_all,
-- tenant_members_self_select and tenants_self_signup_insert do not
-- self-reference and are left untouched.)

drop policy if exists tenants_member_select on public.tenants;
create policy tenants_member_select on public.tenants
  for select to authenticated
  using (public.is_tenant_member(id));

drop policy if exists tenant_members_self_signup_insert on public.tenant_members;
create policy tenant_members_self_signup_insert on public.tenant_members
  for insert to authenticated
  with check (
    user_id = auth.uid() and role = 'owner' and status = 'pending'
    and not public.tenant_has_any_member(tenant_id)
  );

drop policy if exists tenant_members_team_select on public.tenant_members;
create policy tenant_members_team_select on public.tenant_members
  for select to authenticated
  using (public.is_active_tenant_member(tenant_id));

drop policy if exists tenant_members_owner_admin_insert on public.tenant_members;
create policy tenant_members_owner_admin_insert on public.tenant_members
  for insert to authenticated
  with check (
    role <> 'owner' and status = 'pending' and user_id is null
    and public.has_active_tenant_role(tenant_id, array['owner','admin'])
  );

-- 3. decide_teammate_request: guard against matching an owner's own
--    pending signup row (that path belongs to decide_tenant_signup, which
--    also keeps tenants.status in sync -- decide_teammate_request does not
--    touch tenants at all, so running it against an owner row would
--    desync tenant_members.status from tenants.status and permanently
--    orphan the row, since claim_invited_membership requires user_id is
--    null but an owner's user_id is already set at signup time).

create or replace function public.decide_teammate_request(
  p_member_id uuid,
  p_approve boolean
) returns public.tenant_members
language plpgsql
security invoker
as $$
declare
  v_member public.tenant_members;
begin
  if not coalesce((auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean, false) then
    raise exception 'Not authorized.';
  end if;

  update public.tenant_members
  set status = case when p_approve then 'invited' else 'rejected' end,
      decided_at = now(), decided_by = auth.uid()
  where id = p_member_id and status = 'pending' and role <> 'owner'
  returning * into v_member;

  if v_member.id is null then
    raise exception 'This request was already handled.';
  end if;

  return v_member;
end;
$$;

-- 4. request_add_teammate: make SECURITY DEFINER so its own duplicate
--    checks run with full visibility (its cross-tenant duplicate check was
--    previously running under RLS as the calling user, who under
--    tenant_members_team_select has zero visibility into any other
--    tenant's rows -- so that guard could never fire). Since the function
--    now bypasses RLS for its own INSERT too, re-implement the
--    authorization check that tenant_members_owner_admin_insert would have
--    enforced, explicitly, inside the function body. Also fixes a Minor
--    case-sensitivity gap (Foo@Bar.com vs foo@bar.com bypassing both
--    duplicate checks) by comparing with lower() on both sides.

create or replace function public.request_add_teammate(
  p_tenant_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_dob date,
  p_role text
) returns public.tenant_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.tenant_members;
begin
  if not public.has_active_tenant_role(p_tenant_id, array['owner','admin']) then
    raise exception 'Not authorized.';
  end if;

  if p_role not in ('admin', 'manager', 'user') then
    raise exception 'Invalid role for a teammate: %', p_role;
  end if;

  if exists (
    select 1 from public.tenant_members
    where tenant_id = p_tenant_id and lower(email) = lower(p_email) and status in ('pending', 'invited', 'active')
  ) then
    raise exception 'This person is already on your team.';
  end if;

  if exists (
    select 1 from public.tenant_members
    where lower(email) = lower(p_email) and status = 'active' and tenant_id <> p_tenant_id
  ) then
    raise exception 'This email is already associated with another business account.';
  end if;

  insert into public.tenant_members (tenant_id, email, first_name, last_name, dob, role, status, invited_by)
  values (p_tenant_id, p_email, p_first_name, p_last_name, p_dob, p_role, 'pending', auth.uid())
  returning * into v_member;

  return v_member;
end;
$$;

revoke execute on function public.request_add_teammate(uuid,text,text,text,date,text) from public;
grant execute on function public.request_add_teammate(uuid,text,text,text,date,text) to authenticated;

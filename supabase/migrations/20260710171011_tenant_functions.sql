-- supabase/migrations/20260710120200_tenant_functions.sql

create or replace function public.create_tenant_signup(
  p_business_name text,
  p_first_name text,
  p_last_name text,
  p_dob date
) returns public.tenant_members
language plpgsql
security invoker
as $$
declare
  v_tenant_id uuid;
  v_member public.tenant_members;
begin
  insert into public.tenants (name, status) values (p_business_name, 'pending')
  returning id into v_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, email, first_name, last_name, dob, role, status)
  values (v_tenant_id, auth.uid(), auth.jwt() ->> 'email', p_first_name, p_last_name, p_dob, 'owner', 'pending')
  returning * into v_member;

  return v_member;
end;
$$;

create or replace function public.request_add_teammate(
  p_tenant_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_dob date,
  p_role text
) returns public.tenant_members
language plpgsql
security invoker
as $$
declare
  v_member public.tenant_members;
begin
  if p_role not in ('admin', 'manager', 'user') then
    raise exception 'Invalid role for a teammate: %', p_role;
  end if;

  if exists (
    select 1 from public.tenant_members
    where tenant_id = p_tenant_id and email = p_email and status in ('pending', 'invited', 'active')
  ) then
    raise exception 'This person is already on your team.';
  end if;

  if exists (
    select 1 from public.tenant_members
    where email = p_email and status = 'active' and tenant_id <> p_tenant_id
  ) then
    raise exception 'This email is already associated with another business account.';
  end if;

  insert into public.tenant_members (tenant_id, email, first_name, last_name, dob, role, status, invited_by)
  values (p_tenant_id, p_email, p_first_name, p_last_name, p_dob, p_role, 'pending', auth.uid())
  returning * into v_member;

  return v_member;
end;
$$;

create or replace function public.decide_tenant_signup(
  p_tenant_id uuid,
  p_approve boolean
) returns void
language plpgsql
security invoker
as $$
declare
  v_updated int;
begin
  if not coalesce((auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean, false) then
    raise exception 'Not authorized.';
  end if;

  update public.tenants
  set status = case when p_approve then 'active' else 'rejected' end
  where id = p_tenant_id and status = 'pending';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'This request was already handled.';
  end if;

  update public.tenant_members
  set status = case when p_approve then 'active' else 'rejected' end,
      decided_at = now(), decided_by = auth.uid()
  where tenant_id = p_tenant_id and role = 'owner';
end;
$$;

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
  where id = p_member_id and status = 'pending'
  returning * into v_member;

  if v_member.id is null then
    raise exception 'This request was already handled.';
  end if;

  return v_member;
end;
$$;

-- Restores the ability for a real invitee to activate their own membership
-- row, safely, after Task 2's self-review found that the raw client-side
-- UPDATE policy (tenant_members_claim_invited) let role/tenant_id/email be
-- tampered with alongside the claim, and removed that policy entirely.
--
-- This is a SECURITY DEFINER function (bypasses RLS), which is safe here
-- because:
--   1. The SET clause is hardcoded -- only user_id = auth.uid() and
--      status = 'active' are ever written. The caller's only input is
--      p_member_id, so there is no way to inject a different role,
--      tenant_id, or email through this function.
--   2. The WHERE clause is the authorization check: it only matches a row
--      whose email equals the caller's own authenticated email (from their
--      JWT), that has no user_id yet, and is specifically status =
--      'invited'. A caller can therefore only ever claim a row that was
--      genuinely invited under their own email -- never anyone else's --
--      and never before an admin has actually approved it (status =
--      'invited' is only produced by decide_teammate_request approving a
--      pending request).
--   3. execute is revoked from public and granted only to authenticated,
--      as defense in depth (the WHERE clause already makes it safe even
--      for an anonymous caller, since they'd have no email claim to match).
create or replace function public.claim_invited_membership(p_member_id uuid)
returns public.tenant_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.tenant_members;
begin
  update public.tenant_members
  set user_id = auth.uid(), status = 'active'
  where id = p_member_id
    and email = auth.jwt() ->> 'email'
    and user_id is null
    and status = 'invited'
  returning * into v_member;

  if v_member.id is null then
    raise exception 'This invite is no longer valid.';
  end if;

  return v_member;
end;
$$;

revoke execute on function public.claim_invited_membership(uuid) from public;
grant execute on function public.claim_invited_membership(uuid) to authenticated;

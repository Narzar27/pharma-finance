-- Fix: request_add_teammate stored the teammate's email as typed (raw case)
-- in tenant_members.email. But claim_invited_membership compares
-- `email = auth.jwt() ->> 'email'`, and SupabaseTenantMemberRepository
-- .getMyMembership() compares `.eq('email', email)` -- both against the
-- invitee's actual (likely lowercase) Supabase Auth email. So a teammate
-- invited as `Foo@Bar.com` whose real auth email is `foo@bar.com` never
-- matches, getMyMembership returns null, and they get permanently bounced
-- to /signup.
--
-- Fix: normalize at the source -- store the email lowercased when a
-- teammate request is created, so every downstream comparison (which
-- already correctly uses the real auth email as-is) matches consistently.
--
-- The duplicate-check queries already use lower(email) = lower(p_email)
-- (from the Task 3 fix), so they remain correct (and become a no-op on the
-- now-always-lowercase stored column, but are left in place as defense in
-- depth). Only the INSERT's stored value changes.

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
  values (p_tenant_id, lower(p_email), p_first_name, p_last_name, p_dob, p_role, 'pending', auth.uid())
  returning * into v_member;

  return v_member;
end;
$$;

revoke execute on function public.request_add_teammate(uuid,text,text,text,date,text) from public;
grant execute on function public.request_add_teammate(uuid,text,text,text,date,text) to authenticated;

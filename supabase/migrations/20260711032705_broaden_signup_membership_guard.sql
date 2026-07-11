-- Fix: guard_against_multi_membership only blocked callers with an
-- ACTIVE membership. A user with a pending or rejected tenant_members
-- row was not blocked from calling create_tenant_signup again, which
-- inserts a second row for the same user_id. getMyMembership() then runs
-- .eq('user_id', userId).maybeSingle(), which throws on 2+ rows -- the
-- exact crash the previous guard was meant to prevent, just reachable via
-- a different status than 'active'. Broaden the guard to reject ANY
-- existing membership row for that user, regardless of status. This is
-- safe: create_tenant_signup runs exactly once during signup and the
-- guard runs before the insert, so a genuinely fresh user has zero rows
-- at check time regardless of scope.

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
  v_tenant_id uuid := gen_random_uuid();
  v_member public.tenant_members;
begin
  if exists (select 1 from public.tenant_members where user_id = auth.uid()) then
    raise exception 'You already have a business account (or a pending/rejected request). Contact support if you believe this is a mistake.';
  end if;

  insert into public.tenants (id, name, status) values (v_tenant_id, p_business_name, 'pending');

  insert into public.tenant_members (tenant_id, user_id, email, first_name, last_name, dob, role, status)
  values (v_tenant_id, auth.uid(), auth.jwt() ->> 'email', p_first_name, p_last_name, p_dob, 'owner', 'pending')
  returning * into v_member;

  return v_member;
end;
$$;

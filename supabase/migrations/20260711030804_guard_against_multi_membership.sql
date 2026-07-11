-- Fix: nothing prevented a user from ending up with more than one
-- tenant_members row, but the read paths assume exactly one
-- (getMyMembership uses .maybeSingle(), the currentTenantId() helpers use
-- .single() after filtering status='active') -- both throw/error on 2+
-- rows. This is defense-in-depth at the DB level: reject a caller who
-- already has an active membership somewhere from creating a second
-- business signup. (The Angular-side fix is a route guard on /signup that
-- redirects an already-active user before they ever reach this function;
-- this guard covers the case where that client-side check is bypassed.)

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
  if exists (select 1 from public.tenant_members where user_id = auth.uid() and status = 'active') then
    raise exception 'You already belong to an active business account.';
  end if;

  insert into public.tenants (id, name, status) values (v_tenant_id, p_business_name, 'pending');

  insert into public.tenant_members (tenant_id, user_id, email, first_name, last_name, dob, role, status)
  values (v_tenant_id, auth.uid(), auth.jwt() ->> 'email', p_first_name, p_last_name, p_dob, 'owner', 'pending')
  returning * into v_member;

  return v_member;
end;
$$;

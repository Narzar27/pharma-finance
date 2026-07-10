-- Fixes create_tenant_signup's "insufficient privilege" bug found during the
-- Fix pass (RLS recursion + function gaps) verification: the first statement,
-- `insert into public.tenants (name, status) values (...) returning id into
-- v_tenant_id`, fails RLS for any real authenticated caller. Postgres
-- enforces the SELECT-visibility policy (tenants_member_select, `using
-- (public.is_tenant_member(id))`) on the row produced by an INSERT ...
-- RETURNING, not just the INSERT's WITH CHECK policy. At that point in the
-- function, no tenant_members row yet exists linking the caller to the
-- brand-new tenant (that only happens in the next statement), so
-- is_tenant_member(id) is false and the RETURNING is rejected with 42501 --
-- even though the INSERT itself would have been allowed by
-- tenants_self_signup_insert's `with check (status = 'pending')`.
--
-- Fix: generate the tenant's UUID client-side (inside the function) instead
-- of relying on the column's gen_random_uuid() default + RETURNING to learn
-- it, so the tenants insert no longer needs a RETURNING clause at all. The
-- function remains security invoker (least-privilege, unchanged) -- the
-- problem was the unnecessary RETURNING, not an authorization gap. The
-- tenant_members insert is unaffected and still uses RETURNING * into
-- v_member, since tenant_members_self_select grants the caller immediate
-- visibility into their own new row with no membership precondition.
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
  insert into public.tenants (id, name, status) values (v_tenant_id, p_business_name, 'pending');

  insert into public.tenant_members (tenant_id, user_id, email, first_name, last_name, dob, role, status)
  values (v_tenant_id, auth.uid(), auth.jwt() ->> 'email', p_first_name, p_last_name, p_dob, 'owner', 'pending')
  returning * into v_member;

  return v_member;
end;
$$;

-- Fix: close two RLS gaps found during Task 2 self-review.

-- 1. Prevent inserting a spurious "pending owner" row against a tenant
--    that already has any member (real or bogus) -- closes a
--    front-running window where an attacker could attach themselves as
--    a second 'owner' to someone else's still-pending signup before the
--    platform admin approves it, then get activated alongside the real
--    owner when decide_tenant_signup's blanket UPDATE runs.
drop policy if exists tenant_members_self_signup_insert on public.tenant_members;
create policy tenant_members_self_signup_insert on public.tenant_members
  for insert to authenticated
  with check (
    user_id = auth.uid() and role = 'owner' and status = 'pending'
    and not exists (select 1 from public.tenant_members tm2 where tm2.tenant_id = tenant_members.tenant_id)
  );

-- 2. Remove the raw client-side UPDATE path for claiming an invited
--    membership row. Its WITH CHECK only pinned user_id/status, leaving
--    role/tenant_id/email open to client-supplied tampering (e.g. a
--    real invitee could smuggle role='owner' into the same UPDATE that
--    claims their row). The safe replacement is a SECURITY DEFINER
--    Postgres function (added in a later task) with a fixed,
--    non-client-controlled SET clause.
drop policy if exists tenant_members_claim_invited on public.tenant_members;

# Multi-Tenancy, Signup & Admin Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn pharma-finance from a single-tenant, unscoped-data app into a multi-tenant platform where each business's data is isolated, new businesses must be approved by a platform super-admin before use, and business owners can add teammates (also gated by the same super-admin approval).

**Architecture:** New `tenants` / `tenant_members` tables enforce isolation via row-level security that looks up membership directly (not JWT claims), so an approval decision takes effect on the user's very next request. Two Postgres functions (`create_tenant_signup`, `request_add_teammate`) make multi-row writes atomic; two more (`decide_tenant_signup`, `decide_teammate_request`) centralize the approve/reject logic and its authorization check. A Supabase Edge Function sends the actual teammate invite email using the service-role key, since that key can never be used from the browser. Every existing business table (`suppliers`, `invoices`, `payments`, `income_records`) gets a `tenant_id` column and tenant-scoped RLS in place of the current `USING (true)` policy.

**Tech Stack:** Angular 20 (standalone components, signals, `inject()`), Supabase (Postgres 17, Auth, Edge Functions), Clean Architecture layers per `CLAUDE.md`.

## Global Constraints

- Design spec: `docs/superpowers/specs/2026-07-10-multi-tenancy-signup-approval-design.md` — every task below traces back to a section of it.
- Follow the codebase's **actual** established conventions, not `CLAUDE.md`'s where they've drifted (confirmed during planning): domain models are plain interfaces; repository interfaces are `abstract class` (Angular DI needs a class token, not a TS `interface`); use cases are `@Injectable({providedIn:'root'})` with `private repo = inject(X)` and an `execute()` method; Supabase repositories `extend` the abstract class, use `private get db() { return getSupabaseClient(); }`, and map snake_case rows to camelCase via a private `map()` method; components are standalone, `ChangeDetectionStrategy.OnPush`, use `inject()`, plain `signal()` + `ngOnInit` with manual `async/await` orchestration (the codebase does not use `resource()` despite `CLAUDE.md` mentioning it — do not introduce it here, that's a separate decision for a separate change).
- Styling: use the **actual** existing design system in `src/styles.css` (CSS custom properties, `.btn-primary` / `.btn-ghost` / `.input` / `.label` / `.table-wrap` / `.modal-overlay` / `.modal` / `.badge` classes, `font-mono` for data) — not the Tailwind-class spec in `CLAUDE.md`, which does not match what's actually built.
- Live Supabase project: `sixtdsvrohktvwceqvvg` ("Narzar27's Project", ap-south-1, Postgres 17.6). Confirmed reachable. Currently **zero** committed migrations and **zero rows** in any business table — there is no production data to protect during this work, which simplifies several steps below (no backfill risk).
- Two existing accounts, confirmed via `auth.users`: `nizarafiouni123@gmail.com` (id `7af4e554-1f43-469e-b2f0-c8c2db5857d7`, created 2026-03-17) and `nizarafiouni321@gmail.com` (id `cd491987-bd9c-4b5c-b4bf-9a6cccd73e25`, created 2026-07-08). The first becomes tenant #1's owner **and** the platform super-admin (per the spec's "dual role" decision); the second becomes a teammate of that same tenant.
- No automated test infrastructure exists in this repo (zero `*.spec.ts` files). This plan writes real Jasmine + `TestBed` unit tests for the **domain** and **application** layers (both are naturally unit-testable and this is genuinely cheap to add). For **infrastructure** (SQL/RLS) and **presentation** (Angular components), "test" means an explicit, concrete verification step (a SQL query with an expected result, or a manual flow through the running app) — introducing a full component-testing harness from scratch is out of scope for this plan.
- `tenant_members.status` has **four** values, not three: `pending` (awaiting approval) → `invited` (teammate approved, invite email sent, hasn't logged in yet) → `active`. Plus terminal `rejected`. This fourth value (`invited`) is a necessary refinement of the spec discovered during planning — the spec's flow ("approve → invite sent → flips to active on first login") requires distinguishing "approved but hasn't accepted yet" from "using the app," and the plan's RLS/claim-flow depends on it. The owner's own row skips `invited` entirely (pending → active directly, no invite step since they already have credentials).

---

## Task 1: Baseline migration — capture the live schema as version-controlled history

The repo has never had a `supabase/migrations/` directory; the schema only exists in the live project. Before adding anything, write a migration that represents exactly what's live today, so this and all future schema changes are tracked.

**Files:**
- Create: `supabase/migrations/20260710120000_baseline_schema.sql`

**Interfaces:** None (this task changes no application code, only establishes migration history for the already-live schema).

- [ ] **Step 1: Write the baseline migration file**

```sql
-- supabase/migrations/20260710120000_baseline_schema.sql
-- Baseline: captures the schema as it already exists live (no migration
-- history existed before this). Written to be safely re-runnable.

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_info text,
  notes text,
  archived boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id),
  amount numeric not null,
  currency text not null check (currency = any (array['USD'::text, 'LBP'::text])),
  issue_date date not null,
  due_date date not null,
  status text not null default 'unpaid' check (status = any (array['unpaid'::text, 'partial'::text, 'paid'::text])),
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id),
  amount_paid numeric not null,
  currency text not null check (currency = any (array['USD'::text, 'LBP'::text])),
  payment_date date not null,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.income_records (
  id uuid primary key default gen_random_uuid(),
  amount numeric not null,
  currency text not null check (currency = any (array['USD'::text, 'LBP'::text])),
  date date not null,
  source text,
  notes text,
  created_at timestamptz default now(),
  type text not null default 'income' check (type = any (array['income'::text, 'expense'::text]))
);

alter table public.suppliers enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.income_records enable row level security;

drop policy if exists suppliers_authenticated on public.suppliers;
create policy suppliers_authenticated on public.suppliers for all to authenticated using (true) with check (true);

drop policy if exists invoices_authenticated on public.invoices;
create policy invoices_authenticated on public.invoices for all to authenticated using (true) with check (true);

drop policy if exists payments_authenticated on public.payments;
create policy payments_authenticated on public.payments for all to authenticated using (true) with check (true);

drop policy if exists income_records_authenticated on public.income_records;
create policy income_records_authenticated on public.income_records for all to authenticated using (true) with check (true);
```

- [ ] **Step 2: Apply it against the live project and confirm zero-diff**

Use the `plugin:supabase:supabase` MCP `apply_migration` tool with `project_id: sixtdsvrohktvwceqvvg`, `name: baseline_schema`, and the SQL above.

Expected: succeeds with no errors (every statement is idempotent against the current live state — `IF NOT EXISTS` for tables, `DROP POLICY IF EXISTS` before each `CREATE POLICY`).

- [ ] **Step 3: Verify migration history now shows it**

Call `list_migrations` with `project_id: sixtdsvrohktvwceqvvg`.
Expected: one entry, `20260710120000_baseline_schema`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260710120000_baseline_schema.sql
git commit -m "chore: capture live schema as baseline migration"
```

---

## Task 2: Tenants & tenant_members tables + RLS

**Files:**
- Create: `supabase/migrations/20260710120100_tenants_and_members.sql`

**Interfaces:**
- Produces: tables `public.tenants(id, name, status, created_at)` and `public.tenant_members(id, tenant_id, user_id, email, first_name, last_name, dob, role, status, invited_by, created_at, decided_at, decided_by)`. `status` on both is `'pending' | 'active' | 'rejected'` for `tenants`, and `'pending' | 'invited' | 'active' | 'rejected'` for `tenant_members`. `role` is `'owner' | 'admin' | 'manager' | 'user'`.

- [ ] **Step 1: Write the migration**

```sql
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
```

> The bootstrap `first_name`/`last_name`/`dob` values are placeholders — real values don't exist anywhere yet (this predates the signup form). Update them directly in Supabase after this migration runs, or via the Users page once Task 16 ships. Same for the tenant name: it's meant to be renamed immediately; there's no rename-tenant UI in this plan (out of scope), so do it with a one-line `UPDATE public.tenants SET name = '<real name>' WHERE id = '<id>';` when ready.

- [ ] **Step 2: Apply via `apply_migration`** (`project_id: sixtdsvrohktvwceqvvg`, `name: tenants_and_members`)

Expected: succeeds.

- [ ] **Step 3: Verify**

Run via `execute_sql`:
```sql
select t.name, t.status, tm.email, tm.role, tm.status
from tenants t join tenant_members tm on tm.tenant_id = t.id;
```
Expected: 2 rows, both `status = 'active'`, tenant status `'active'`.

- [ ] **Step 4: Set the platform super-admin flag**

Run via `execute_sql`:
```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"is_platform_admin": true}'::jsonb
where id = '7af4e554-1f43-469e-b2f0-c8c2db5857d7';
```
Expected: 1 row updated. **Important:** this account must log out and back in before `is_platform_admin` appears in its JWT — RLS policies that check `auth.jwt()` only see claims from the token issued at last login.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260710120100_tenants_and_members.sql
git commit -m "feat: add tenants and tenant_members tables with tenant-scoped RLS"
```

---

## Task 3: Postgres functions for signup, add-teammate, and approve/reject

**Files:**
- Create: `supabase/migrations/20260710120200_tenant_functions.sql`

**Interfaces:**
- Produces (called via Supabase RPC from the Angular repositories in Task 8):
  - `create_tenant_signup(p_business_name text, p_first_name text, p_last_name text, p_dob date) returns tenant_members`
  - `request_add_teammate(p_tenant_id uuid, p_email text, p_first_name text, p_last_name text, p_dob date, p_role text) returns tenant_members`
  - `decide_tenant_signup(p_tenant_id uuid, p_approve boolean) returns void`
  - `decide_teammate_request(p_member_id uuid, p_approve boolean) returns tenant_members`

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Apply via `apply_migration`** (`name: tenant_functions`)

- [ ] **Step 3: Verify each function with a real call**

Run via `execute_sql`, using the existing owner's session context is not available from the SQL editor (it runs as postgres), so verify structurally instead — confirm all four exist and are callable:
```sql
select proname, pronargs from pg_proc where proname in
  ('create_tenant_signup','request_add_teammate','decide_tenant_signup','decide_teammate_request');
```
Expected: 4 rows returned. Full behavioral verification (as an actual authenticated user) happens in Task 18's end-to-end pass, once the Angular repositories in Task 8 can call these through a real session.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260710120200_tenant_functions.sql
git commit -m "feat: add signup, add-teammate, and approve/reject Postgres functions"
```

---

## Task 4: tenant_id on business tables + tenant-scoped RLS

**Files:**
- Create: `supabase/migrations/20260710120300_tenant_scope_business_tables.sql`

**Interfaces:**
- Produces: `tenant_id uuid not null` on `suppliers`, `invoices`, `payments`, `income_records`, each defaulting existing (currently zero) rows to tenant #1, then RLS rewritten to scope by tenant membership.

- [ ] **Step 1: Write the migration**

```sql
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

drop policy if exists suppliers_authenticated on public.suppliers;
create policy suppliers_tenant_access on public.suppliers
  for all to authenticated
  using (tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid() and status = 'active'))
  with check (tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid() and status = 'active'));

drop policy if exists invoices_authenticated on public.invoices;
create policy invoices_tenant_access on public.invoices
  for all to authenticated
  using (tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid() and status = 'active'))
  with check (tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid() and status = 'active'));

drop policy if exists payments_authenticated on public.payments;
create policy payments_tenant_access on public.payments
  for all to authenticated
  using (tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid() and status = 'active'))
  with check (tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid() and status = 'active'));

drop policy if exists income_records_authenticated on public.income_records;
create policy income_records_tenant_access on public.income_records
  for all to authenticated
  using (tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid() and status = 'active'))
  with check (tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid() and status = 'active'));
```

- [ ] **Step 2: Apply via `apply_migration`** (`name: tenant_scope_business_tables`)

- [ ] **Step 3: Verify with the security advisor**

Call `get_advisors` with `project_id: sixtdsvrohktvwceqvvg`, `type: security`.
Expected: no new advisories about these four tables (RLS enabled, policies present, no permissive `USING (true)` remaining).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260710120300_tenant_scope_business_tables.sql
git commit -m "feat: scope suppliers, invoices, payments, and income_records by tenant"
```

---

## Task 5: Edge Function to send teammate invites

The service-role key can never be used from the browser (Angular client), so sending an actual Supabase Auth invite (which requires the admin API) has to run server-side.

**Files:**
- Create: `supabase/functions/send-teammate-invite/index.ts`

**Interfaces:**
- Produces: an HTTP endpoint invoked via `supabase.functions.invoke('send-teammate-invite', { body: { memberId } })` from `SupabaseTenantMemberRepository` (Task 8). Expects the caller's JWT to carry `is_platform_admin = true`; looks up the `tenant_members` row for `memberId`, calls `admin.inviteUserByEmail` with that email, embedding `tenant_member_id` in the invite's `data` so the client can (optionally) use it later, and returns `{ ok: true }` or `{ ok: false, error: string }`.

- [ ] **Step 1: Write the function**

```typescript
// supabase/functions/send-teammate-invite/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ ok: false, error: 'Not authenticated.' }), { status: 401 });
    }
    const isPlatformAdmin = (userData.user.app_metadata as Record<string, unknown>)?.['is_platform_admin'] === true;
    if (!isPlatformAdmin) {
      return new Response(JSON.stringify({ ok: false, error: 'Not authorized.' }), { status: 403 });
    }

    const { memberId } = await req.json();
    if (!memberId) {
      return new Response(JSON.stringify({ ok: false, error: 'memberId is required.' }), { status: 400 });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: member, error: memberError } = await adminClient
      .from('tenant_members')
      .select('id, email, tenant_id')
      .eq('id', memberId)
      .single();
    if (memberError || !member) {
      return new Response(JSON.stringify({ ok: false, error: 'Teammate request not found.' }), { status: 404 });
    }

    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(member.email, {
      data: { tenant_member_id: member.id, tenant_id: member.tenant_id },
    });
    if (inviteError) {
      return new Response(JSON.stringify({ ok: false, error: inviteError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
});
```

- [ ] **Step 2: Deploy via the MCP tool**

Use `plugin:supabase:supabase` MCP `deploy_edge_function` with `project_id: sixtdsvrohktvwceqvvg`, `name: send-teammate-invite`, and the file content above.

- [ ] **Step 3: Verify deployment**

Call `list_edge_functions` with `project_id: sixtdsvrohktvwceqvvg`.
Expected: `send-teammate-invite` present with status `ACTIVE`. Full behavioral verification (a real invite actually sent) happens in Task 18, once there's a real approved teammate request to test against.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/send-teammate-invite/index.ts
git commit -m "feat: add send-teammate-invite edge function"
```

---

## Task 6: Domain layer — tenant & tenant-member models and repository interfaces

**Files:**
- Create: `src/domain/models/tenant.model.ts`
- Create: `src/domain/models/tenant-member.model.ts`
- Create: `src/domain/repositories/tenant.repository.ts`
- Create: `src/domain/repositories/tenant-member.repository.ts`

**Interfaces:**
- Produces: `Tenant`, `TenantStatus`, `TenantMember`, `MemberRole`, `MemberStatus`, `SignupBusinessDto`, `AddTeammateDto` models; `TenantRepository` and `TenantMemberRepository` abstract classes — consumed by every use case in Tasks 9–11.

- [ ] **Step 1: Write the models**

```typescript
// src/domain/models/tenant.model.ts
export type TenantStatus = 'pending' | 'active' | 'rejected';

export interface Tenant {
  id: string;
  name: string;
  status: TenantStatus;
  createdAt: string;
}
```

```typescript
// src/domain/models/tenant-member.model.ts
export type MemberRole = 'owner' | 'admin' | 'manager' | 'user';
export type MemberStatus = 'pending' | 'invited' | 'active' | 'rejected';

export interface TenantMember {
  id: string;
  tenantId: string;
  userId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  dob: string;
  role: MemberRole;
  status: MemberStatus;
  invitedBy: string | null;
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
}

export interface SignupBusinessDto {
  businessName: string;
  firstName: string;
  lastName: string;
  dob: string;
}

export interface AddTeammateDto {
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  dob: string;
  role: Exclude<MemberRole, 'owner'>;
}

export interface PendingApprovalItem {
  kind: 'business' | 'teammate';
  tenant: Tenant;
  member: TenantMember;
}
```

- [ ] **Step 2: Write the repository interfaces**

```typescript
// src/domain/repositories/tenant.repository.ts
import { Tenant } from '../models/tenant.model';

export abstract class TenantRepository {
  abstract getById(id: string): Promise<Tenant | null>;
}
```

```typescript
// src/domain/repositories/tenant-member.repository.ts
import { TenantMember, SignupBusinessDto, AddTeammateDto, PendingApprovalItem } from '../models/tenant-member.model';

export abstract class TenantMemberRepository {
  abstract signupBusiness(dto: SignupBusinessDto): Promise<TenantMember>;
  abstract getMyMembership(): Promise<TenantMember | null>;
  abstract claimInvitedMembership(memberId: string): Promise<void>;
  abstract listTeam(tenantId: string): Promise<TenantMember[]>;
  abstract requestAddTeammate(dto: AddTeammateDto): Promise<TenantMember>;
  abstract listPendingApprovals(): Promise<PendingApprovalItem[]>;
  abstract decideTenantSignup(tenantId: string, approve: boolean): Promise<void>;
  abstract decideTeammateRequest(memberId: string, approve: boolean): Promise<TenantMember>;
  abstract sendTeammateInvite(memberId: string): Promise<{ ok: boolean; error?: string }>;
}
```

- [ ] **Step 3: Verify the project still compiles**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors (these are new, unimported files — nothing references them yet, so nothing can break).

- [ ] **Step 4: Commit**

```bash
git add src/domain/models/tenant.model.ts src/domain/models/tenant-member.model.ts src/domain/repositories/tenant.repository.ts src/domain/repositories/tenant-member.repository.ts
git commit -m "feat: add tenant and tenant-member domain models and repository interfaces"
```

---

## Task 7: Domain layer — membership access logic (pure functions, TDD)

**Files:**
- Create: `src/domain/services/membership-access.service.ts`
- Test: `src/domain/services/membership-access.service.spec.ts`

**Interfaces:**
- Consumes: `TenantMember | null`, `MemberRole` from Task 6.
- Produces: `resolveAccessRoute(member: TenantMember | null): '/signup' | '/pending' | '/rejected' | null` (null = allowed through), `canManageTeam(role: MemberRole): boolean` — consumed by the guard in Task 12 and the Users page in Task 16.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/domain/services/membership-access.service.spec.ts
import { resolveAccessRoute, canManageTeam } from './membership-access.service';
import { TenantMember } from '../models/tenant-member.model';

function member(overrides: Partial<TenantMember>): TenantMember {
  return {
    id: 'm1', tenantId: 't1', userId: 'u1', email: 'a@b.com',
    firstName: 'A', lastName: 'B', dob: '1990-01-01',
    role: 'user', status: 'active', invitedBy: null,
    createdAt: '2026-01-01', decidedAt: null, decidedBy: null,
    ...overrides,
  };
}

describe('resolveAccessRoute', () => {
  it('sends a user with no membership row to /signup', () => {
    expect(resolveAccessRoute(null)).toBe('/signup');
  });

  it('sends a pending member to /pending', () => {
    expect(resolveAccessRoute(member({ status: 'pending' }))).toBe('/pending');
  });

  it('sends an invited-but-not-logged-in-yet member to /pending', () => {
    expect(resolveAccessRoute(member({ status: 'invited' }))).toBe('/pending');
  });

  it('sends a rejected member to /rejected', () => {
    expect(resolveAccessRoute(member({ status: 'rejected' }))).toBe('/rejected');
  });

  it('allows an active member through (returns null)', () => {
    expect(resolveAccessRoute(member({ status: 'active' }))).toBeNull();
  });
});

describe('canManageTeam', () => {
  it('allows owner', () => expect(canManageTeam('owner')).toBe(true));
  it('allows admin', () => expect(canManageTeam('admin')).toBe(true));
  it('disallows manager', () => expect(canManageTeam('manager')).toBe(false));
  it('disallows user', () => expect(canManageTeam('user')).toBe(false));
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx ng test --include='**/membership-access.service.spec.ts' --watch=false`
Expected: FAIL — `membership-access.service` has no exported members `resolveAccessRoute`/`canManageTeam`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/domain/services/membership-access.service.ts
import { TenantMember, MemberRole } from '../models/tenant-member.model';

export function resolveAccessRoute(member: TenantMember | null): '/signup' | '/pending' | '/rejected' | null {
  if (!member) return '/signup';
  if (member.status === 'pending' || member.status === 'invited') return '/pending';
  if (member.status === 'rejected') return '/rejected';
  return null;
}

export function canManageTeam(role: MemberRole): boolean {
  return role === 'owner' || role === 'admin';
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx ng test --include='**/membership-access.service.spec.ts' --watch=false`
Expected: PASS, 9 specs.

- [ ] **Step 5: Commit**

```bash
git add src/domain/services/membership-access.service.ts src/domain/services/membership-access.service.spec.ts
git commit -m "feat: add pure membership-access routing logic with tests"
```

---

## Task 8: Infrastructure — Supabase tenant & tenant-member repositories

**Files:**
- Create: `src/infrastructure/supabase/repositories/supabase-tenant.repository.ts`
- Create: `src/infrastructure/supabase/repositories/supabase-tenant-member.repository.ts`

**Interfaces:**
- Consumes: `TenantRepository`, `TenantMemberRepository` abstract classes (Task 6); `getSupabaseClient()` (existing).
- Produces: concrete implementations registered in Task 12's `app.config.ts` update.

- [ ] **Step 1: Write `SupabaseTenantRepository`**

```typescript
// src/infrastructure/supabase/repositories/supabase-tenant.repository.ts
import { Injectable } from '@angular/core';
import { TenantRepository } from '../../../domain/repositories/tenant.repository';
import { Tenant } from '../../../domain/models/tenant.model';
import { getSupabaseClient } from '../supabase.client';

@Injectable({ providedIn: 'root' })
export class SupabaseTenantRepository extends TenantRepository {
  private get db() { return getSupabaseClient(); }

  async getById(id: string): Promise<Tenant | null> {
    const { data, error } = await this.db.from('tenants').select('*').eq('id', id).single();
    if (error) return null;
    return this.map(data);
  }

  private map(row: any): Tenant {
    return { id: row.id, name: row.name, status: row.status, createdAt: row.created_at };
  }
}
```

- [ ] **Step 2: Write `SupabaseTenantMemberRepository`**

```typescript
// src/infrastructure/supabase/repositories/supabase-tenant-member.repository.ts
import { Injectable } from '@angular/core';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';
import {
  TenantMember, SignupBusinessDto, AddTeammateDto, PendingApprovalItem,
} from '../../../domain/models/tenant-member.model';
import { getSupabaseClient } from '../supabase.client';

@Injectable({ providedIn: 'root' })
export class SupabaseTenantMemberRepository extends TenantMemberRepository {
  private get db() { return getSupabaseClient(); }

  async signupBusiness(dto: SignupBusinessDto): Promise<TenantMember> {
    const { data, error } = await this.db.rpc('create_tenant_signup', {
      p_business_name: dto.businessName,
      p_first_name: dto.firstName,
      p_last_name: dto.lastName,
      p_dob: dto.dob,
    });
    if (error) throw error;
    return this.map(data);
  }

  async getMyMembership(): Promise<TenantMember | null> {
    const { data: userData } = await this.db.auth.getUser();
    const userId = userData.user?.id;
    const email = userData.user?.email;
    if (!userId) return null;

    const byUserId = await this.db.from('tenant_members').select('*').eq('user_id', userId).maybeSingle();
    if (byUserId.data) return this.map(byUserId.data);

    if (email) {
      const byEmail = await this.db
        .from('tenant_members').select('*').eq('email', email).eq('status', 'invited').is('user_id', null).maybeSingle();
      if (byEmail.data) {
        await this.claimInvitedMembership(byEmail.data.id);
        const claimed = await this.db.from('tenant_members').select('*').eq('id', byEmail.data.id).single();
        return this.map(claimed.data);
      }
    }
    return null;
  }

  async claimInvitedMembership(memberId: string): Promise<void> {
    const { data: userData } = await this.db.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated.');
    const { error } = await this.db
      .from('tenant_members')
      .update({ user_id: userData.user.id, status: 'active' })
      .eq('id', memberId);
    if (error) throw error;
  }

  async listTeam(tenantId: string): Promise<TenantMember[]> {
    const { data, error } = await this.db
      .from('tenant_members').select('*').eq('tenant_id', tenantId).order('created_at');
    if (error) throw error;
    return (data ?? []).map(this.map);
  }

  async requestAddTeammate(dto: AddTeammateDto): Promise<TenantMember> {
    const { data, error } = await this.db.rpc('request_add_teammate', {
      p_tenant_id: dto.tenantId,
      p_email: dto.email,
      p_first_name: dto.firstName,
      p_last_name: dto.lastName,
      p_dob: dto.dob,
      p_role: dto.role,
    });
    if (error) throw error;
    return this.map(data);
  }

  async listPendingApprovals(): Promise<PendingApprovalItem[]> {
    const { data, error } = await this.db
      .from('tenant_members')
      .select('*, tenants(*)')
      .in('status', ['pending'])
      .order('created_at');
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      kind: row.role === 'owner' ? 'business' : 'teammate',
      tenant: { id: row.tenants.id, name: row.tenants.name, status: row.tenants.status, createdAt: row.tenants.created_at },
      member: this.map(row),
    }));
  }

  async decideTenantSignup(tenantId: string, approve: boolean): Promise<void> {
    const { error } = await this.db.rpc('decide_tenant_signup', { p_tenant_id: tenantId, p_approve: approve });
    if (error) throw error;
  }

  async decideTeammateRequest(memberId: string, approve: boolean): Promise<TenantMember> {
    const { data, error } = await this.db.rpc('decide_teammate_request', { p_member_id: memberId, p_approve: approve });
    if (error) throw error;
    return this.map(data);
  }

  async sendTeammateInvite(memberId: string): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await this.db.functions.invoke('send-teammate-invite', { body: { memberId } });
    if (error) return { ok: false, error: error.message };
    return data as { ok: boolean; error?: string };
  }

  private map(row: any): TenantMember {
    return {
      id: row.id, tenantId: row.tenant_id, userId: row.user_id, email: row.email,
      firstName: row.first_name, lastName: row.last_name, dob: row.dob,
      role: row.role, status: row.status, invitedBy: row.invited_by,
      createdAt: row.created_at, decidedAt: row.decided_at, decidedBy: row.decided_by,
    };
  }
}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/supabase/repositories/supabase-tenant.repository.ts src/infrastructure/supabase/repositories/supabase-tenant-member.repository.ts
git commit -m "feat: add Supabase tenant and tenant-member repository implementations"
```

---

## Task 9: Application — signup and my-membership use cases (TDD)

**Files:**
- Create: `src/application/use-cases/tenants/signup-business.use-case.ts`
- Create: `src/application/use-cases/tenants/get-my-membership.use-case.ts`
- Test: `src/application/use-cases/tenants/signup-business.use-case.spec.ts`
- Test: `src/application/use-cases/tenants/get-my-membership.use-case.spec.ts`

**Interfaces:**
- Consumes: `TenantMemberRepository` (Task 6).
- Produces: `SignupBusinessUseCase.execute(dto: SignupBusinessDto): Promise<TenantMember>`, `GetMyMembershipUseCase.execute(): Promise<TenantMember | null>` — consumed by the signup component (Task 13) and the guard/`CurrentTenantService` (Task 12).

- [ ] **Step 1: Write the failing tests**

```typescript
// src/application/use-cases/tenants/signup-business.use-case.spec.ts
import { TestBed } from '@angular/core/testing';
import { SignupBusinessUseCase } from './signup-business.use-case';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';
import { TenantMember } from '../../../domain/models/tenant-member.model';

describe('SignupBusinessUseCase', () => {
  it('delegates to the repository and returns the created member', async () => {
    const fakeMember: TenantMember = {
      id: 'm1', tenantId: 't1', userId: 'u1', email: 'a@b.com',
      firstName: 'A', lastName: 'B', dob: '1990-01-01',
      role: 'owner', status: 'pending', invitedBy: null,
      createdAt: '2026-01-01', decidedAt: null, decidedBy: null,
    };
    const fakeRepo = { signupBusiness: jasmine.createSpy().and.resolveTo(fakeMember) };

    TestBed.configureTestingModule({
      providers: [{ provide: TenantMemberRepository, useValue: fakeRepo }],
    });
    const useCase = TestBed.inject(SignupBusinessUseCase);

    const result = await useCase.execute({ businessName: 'Acme', firstName: 'A', lastName: 'B', dob: '1990-01-01' });

    expect(result).toEqual(fakeMember);
    expect(fakeRepo.signupBusiness).toHaveBeenCalledWith({ businessName: 'Acme', firstName: 'A', lastName: 'B', dob: '1990-01-01' });
  });
});
```

```typescript
// src/application/use-cases/tenants/get-my-membership.use-case.spec.ts
import { TestBed } from '@angular/core/testing';
import { GetMyMembershipUseCase } from './get-my-membership.use-case';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';

describe('GetMyMembershipUseCase', () => {
  it('returns null when there is no membership', async () => {
    const fakeRepo = { getMyMembership: jasmine.createSpy().and.resolveTo(null) };
    TestBed.configureTestingModule({ providers: [{ provide: TenantMemberRepository, useValue: fakeRepo }] });
    const useCase = TestBed.inject(GetMyMembershipUseCase);

    expect(await useCase.execute()).toBeNull();
  });
});
```

- [ ] **Step 2: Run and verify both fail**

Run: `npx ng test --include='**/tenants/*.use-case.spec.ts' --watch=false`
Expected: FAIL — `signup-business.use-case`/`get-my-membership.use-case` modules don't exist.

- [ ] **Step 3: Write the implementations**

```typescript
// src/application/use-cases/tenants/signup-business.use-case.ts
import { inject, Injectable } from '@angular/core';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';
import { SignupBusinessDto, TenantMember } from '../../../domain/models/tenant-member.model';

@Injectable({ providedIn: 'root' })
export class SignupBusinessUseCase {
  private repo = inject(TenantMemberRepository);

  execute(dto: SignupBusinessDto): Promise<TenantMember> {
    return this.repo.signupBusiness(dto);
  }
}
```

```typescript
// src/application/use-cases/tenants/get-my-membership.use-case.ts
import { inject, Injectable } from '@angular/core';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';
import { TenantMember } from '../../../domain/models/tenant-member.model';

@Injectable({ providedIn: 'root' })
export class GetMyMembershipUseCase {
  private repo = inject(TenantMemberRepository);

  execute(): Promise<TenantMember | null> {
    return this.repo.getMyMembership();
  }
}
```

- [ ] **Step 4: Run and verify both pass**

Run: `npx ng test --include='**/tenants/*.use-case.spec.ts' --watch=false`
Expected: PASS, 2 specs.

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/tenants/signup-business.use-case.ts src/application/use-cases/tenants/get-my-membership.use-case.ts src/application/use-cases/tenants/signup-business.use-case.spec.ts src/application/use-cases/tenants/get-my-membership.use-case.spec.ts
git commit -m "feat: add signup-business and get-my-membership use cases with tests"
```

---

## Task 10: Application — admin approval use cases (TDD)

**Files:**
- Create: `src/application/use-cases/admin/list-pending-approvals.use-case.ts`
- Create: `src/application/use-cases/admin/decide-tenant-signup.use-case.ts`
- Create: `src/application/use-cases/admin/decide-teammate-request.use-case.ts`
- Test: `src/application/use-cases/admin/list-pending-approvals.use-case.spec.ts`
- Test: `src/application/use-cases/admin/decide-teammate-request.use-case.spec.ts`

**Interfaces:**
- Consumes: `TenantMemberRepository` (Task 6).
- Produces: `ListPendingApprovalsUseCase.execute(): Promise<PendingApprovalItem[]>`, `DecideTenantSignupUseCase.execute(tenantId: string, approve: boolean): Promise<void>`, `DecideTeammateRequestUseCase.execute(memberId: string, approve: boolean): Promise<{ member: TenantMember; inviteResult?: { ok: boolean; error?: string } }>` — consumed by the admin approvals page (Task 15).

- [ ] **Step 1: Write the failing tests**

```typescript
// src/application/use-cases/admin/list-pending-approvals.use-case.spec.ts
import { TestBed } from '@angular/core/testing';
import { ListPendingApprovalsUseCase } from './list-pending-approvals.use-case';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';

describe('ListPendingApprovalsUseCase', () => {
  it('returns whatever the repository provides', async () => {
    const items = [{ kind: 'business' as const, tenant: { id: 't1', name: 'Acme', status: 'pending' as const, createdAt: '2026-01-01' }, member: { id: 'm1', tenantId: 't1', userId: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', dob: '1990-01-01', role: 'owner' as const, status: 'pending' as const, invitedBy: null, createdAt: '2026-01-01', decidedAt: null, decidedBy: null } }];
    const fakeRepo = { listPendingApprovals: jasmine.createSpy().and.resolveTo(items) };
    TestBed.configureTestingModule({ providers: [{ provide: TenantMemberRepository, useValue: fakeRepo }] });

    const result = await TestBed.inject(ListPendingApprovalsUseCase).execute();

    expect(result).toEqual(items);
  });
});
```

```typescript
// src/application/use-cases/admin/decide-teammate-request.use-case.spec.ts
import { TestBed } from '@angular/core/testing';
import { DecideTeammateRequestUseCase } from './decide-teammate-request.use-case';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';
import { TenantMember } from '../../../domain/models/tenant-member.model';

describe('DecideTeammateRequestUseCase', () => {
  const invitedMember: TenantMember = {
    id: 'm1', tenantId: 't1', userId: null, email: 'a@b.com',
    firstName: 'A', lastName: 'B', dob: '1990-01-01',
    role: 'user', status: 'invited', invitedBy: 'owner1',
    createdAt: '2026-01-01', decidedAt: '2026-01-02', decidedBy: 'admin1',
  };

  it('sends an invite when the decision is approve', async () => {
    const fakeRepo = {
      decideTeammateRequest: jasmine.createSpy().and.resolveTo(invitedMember),
      sendTeammateInvite: jasmine.createSpy().and.resolveTo({ ok: true }),
    };
    TestBed.configureTestingModule({ providers: [{ provide: TenantMemberRepository, useValue: fakeRepo }] });

    const result = await TestBed.inject(DecideTeammateRequestUseCase).execute('m1', true);

    expect(fakeRepo.decideTeammateRequest).toHaveBeenCalledWith('m1', true);
    expect(fakeRepo.sendTeammateInvite).toHaveBeenCalledWith('m1');
    expect(result.inviteResult).toEqual({ ok: true });
  });

  it('does not send an invite when the decision is reject', async () => {
    const rejected = { ...invitedMember, status: 'rejected' as const };
    const fakeRepo = {
      decideTeammateRequest: jasmine.createSpy().and.resolveTo(rejected),
      sendTeammateInvite: jasmine.createSpy(),
    };
    TestBed.configureTestingModule({ providers: [{ provide: TenantMemberRepository, useValue: fakeRepo }] });

    const result = await TestBed.inject(DecideTeammateRequestUseCase).execute('m1', false);

    expect(fakeRepo.sendTeammateInvite).not.toHaveBeenCalled();
    expect(result.inviteResult).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run and verify both fail**

Run: `npx ng test --include='**/admin/*.use-case.spec.ts' --watch=false`
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Write the implementations**

```typescript
// src/application/use-cases/admin/list-pending-approvals.use-case.ts
import { inject, Injectable } from '@angular/core';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';
import { PendingApprovalItem } from '../../../domain/models/tenant-member.model';

@Injectable({ providedIn: 'root' })
export class ListPendingApprovalsUseCase {
  private repo = inject(TenantMemberRepository);

  execute(): Promise<PendingApprovalItem[]> {
    return this.repo.listPendingApprovals();
  }
}
```

```typescript
// src/application/use-cases/admin/decide-tenant-signup.use-case.ts
import { inject, Injectable } from '@angular/core';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';

@Injectable({ providedIn: 'root' })
export class DecideTenantSignupUseCase {
  private repo = inject(TenantMemberRepository);

  execute(tenantId: string, approve: boolean): Promise<void> {
    return this.repo.decideTenantSignup(tenantId, approve);
  }
}
```

```typescript
// src/application/use-cases/admin/decide-teammate-request.use-case.ts
import { inject, Injectable } from '@angular/core';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';
import { TenantMember } from '../../../domain/models/tenant-member.model';

@Injectable({ providedIn: 'root' })
export class DecideTeammateRequestUseCase {
  private repo = inject(TenantMemberRepository);

  async execute(memberId: string, approve: boolean): Promise<{ member: TenantMember; inviteResult?: { ok: boolean; error?: string } }> {
    const member = await this.repo.decideTeammateRequest(memberId, approve);
    if (!approve) return { member };
    const inviteResult = await this.repo.sendTeammateInvite(memberId);
    return { member, inviteResult };
  }
}
```

- [ ] **Step 4: Run and verify both pass**

Run: `npx ng test --include='**/admin/*.use-case.spec.ts' --watch=false`
Expected: PASS, 3 specs.

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/admin/
git commit -m "feat: add admin approval use cases with tests"
```

---

## Task 11: Application — team management use cases (TDD)

**Files:**
- Create: `src/application/use-cases/tenants/list-team-members.use-case.ts`
- Create: `src/application/use-cases/tenants/request-add-teammate.use-case.ts`
- Test: `src/application/use-cases/tenants/request-add-teammate.use-case.spec.ts`

**Interfaces:**
- Consumes: `TenantMemberRepository` (Task 6).
- Produces: `ListTeamMembersUseCase.execute(tenantId: string): Promise<TenantMember[]>`, `RequestAddTeammateUseCase.execute(dto: AddTeammateDto): Promise<TenantMember>` — consumed by the Users page (Task 16).

- [ ] **Step 1: Write the failing test**

```typescript
// src/application/use-cases/tenants/request-add-teammate.use-case.spec.ts
import { TestBed } from '@angular/core/testing';
import { RequestAddTeammateUseCase } from './request-add-teammate.use-case';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';

describe('RequestAddTeammateUseCase', () => {
  it('delegates to the repository', async () => {
    const dto = { tenantId: 't1', email: 'a@b.com', firstName: 'A', lastName: 'B', dob: '1990-01-01', role: 'user' as const };
    const fakeMember = { id: 'm1', tenantId: 't1', userId: null, email: 'a@b.com', firstName: 'A', lastName: 'B', dob: '1990-01-01', role: 'user' as const, status: 'pending' as const, invitedBy: 'owner1', createdAt: '2026-01-01', decidedAt: null, decidedBy: null };
    const fakeRepo = { requestAddTeammate: jasmine.createSpy().and.resolveTo(fakeMember) };
    TestBed.configureTestingModule({ providers: [{ provide: TenantMemberRepository, useValue: fakeRepo }] });

    const result = await TestBed.inject(RequestAddTeammateUseCase).execute(dto);

    expect(fakeRepo.requestAddTeammate).toHaveBeenCalledWith(dto);
    expect(result).toEqual(fakeMember);
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx ng test --include='**/request-add-teammate.use-case.spec.ts' --watch=false`
Expected: FAIL.

- [ ] **Step 3: Write the implementations**

```typescript
// src/application/use-cases/tenants/list-team-members.use-case.ts
import { inject, Injectable } from '@angular/core';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';
import { TenantMember } from '../../../domain/models/tenant-member.model';

@Injectable({ providedIn: 'root' })
export class ListTeamMembersUseCase {
  private repo = inject(TenantMemberRepository);

  execute(tenantId: string): Promise<TenantMember[]> {
    return this.repo.listTeam(tenantId);
  }
}
```

```typescript
// src/application/use-cases/tenants/request-add-teammate.use-case.ts
import { inject, Injectable } from '@angular/core';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';
import { AddTeammateDto, TenantMember } from '../../../domain/models/tenant-member.model';

@Injectable({ providedIn: 'root' })
export class RequestAddTeammateUseCase {
  private repo = inject(TenantMemberRepository);

  execute(dto: AddTeammateDto): Promise<TenantMember> {
    return this.repo.requestAddTeammate(dto);
  }
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `npx ng test --include='**/request-add-teammate.use-case.spec.ts' --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/tenants/list-team-members.use-case.ts src/application/use-cases/tenants/request-add-teammate.use-case.ts src/application/use-cases/tenants/request-add-teammate.use-case.spec.ts
git commit -m "feat: add team listing and add-teammate use cases with tests"
```

---

## Task 12: CurrentTenantService, guards, and provider/route wiring

This is the integration point: a small service that resolves and caches the signed-in user's membership once per session, two guards that use it, and registering everything in `app.config.ts` / `app.routes.ts`.

**Files:**
- Create: `src/presentation/core/tenant/current-tenant.service.ts`
- Create: `src/presentation/core/auth/tenant-access.guard.ts`
- Create: `src/presentation/core/auth/platform-admin.guard.ts`
- Modify: `src/app/app.config.ts`
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `GetMyMembershipUseCase` (Task 9), `resolveAccessRoute` (Task 7), `AuthService` (existing).
- Produces: `CurrentTenantService.membership: Signal<TenantMember | null>`, `CurrentTenantService.ready: Promise<void>`, `CurrentTenantService.refresh(): Promise<void>` — consumed by every existing create-use-case call site needing `tenantId` (Task 17) and by the Users/admin pages (Tasks 15–16).

- [ ] **Step 1: Write `CurrentTenantService`**

```typescript
// src/presentation/core/tenant/current-tenant.service.ts
import { Injectable, signal } from '@angular/core';
import { GetMyMembershipUseCase } from '../../../application/use-cases/tenants/get-my-membership.use-case';
import { TenantMember } from '../../../domain/models/tenant-member.model';
import { inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CurrentTenantService {
  private getMyMembership = inject(GetMyMembershipUseCase);

  readonly membership = signal<TenantMember | null>(null);

  private _readyResolve!: () => void;
  readonly ready = new Promise<void>(resolve => { this._readyResolve = resolve; });
  private loaded = false;

  async refresh(): Promise<void> {
    const member = await this.getMyMembership.execute();
    this.membership.set(member);
    if (!this.loaded) {
      this.loaded = true;
      this._readyResolve();
    }
  }
}
```

- [ ] **Step 2: Write `tenantAccessGuard`**

```typescript
// src/presentation/core/auth/tenant-access.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { CurrentTenantService } from '../tenant/current-tenant.service';
import { resolveAccessRoute } from '../../../domain/services/membership-access.service';

export const tenantAccessGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const tenant = inject(CurrentTenantService);
  const router = inject(Router);

  await auth.sessionReady;
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);

  await tenant.refresh();
  const redirect = resolveAccessRoute(tenant.membership());
  if (redirect) return router.createUrlTree([redirect]);
  return true;
};
```

- [ ] **Step 3: Write `platformAdminGuard`**

```typescript
// src/presentation/core/auth/platform-admin.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const platformAdminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.sessionReady;
  const isPlatformAdmin = (auth.user()?.app_metadata as Record<string, unknown>)?.['is_platform_admin'] === true;
  if (!isPlatformAdmin) return router.createUrlTree(['/dashboard']);
  return true;
};
```

- [ ] **Step 4: Register the new repositories in `app.config.ts`**

```typescript
// src/app/app.config.ts — add alongside the existing repository bindings
import { TenantRepository } from '../domain/repositories/tenant.repository';
import { TenantMemberRepository } from '../domain/repositories/tenant-member.repository';
import { SupabaseTenantRepository } from '../infrastructure/supabase/repositories/supabase-tenant.repository';
import { SupabaseTenantMemberRepository } from '../infrastructure/supabase/repositories/supabase-tenant-member.repository';

// ...inside the providers array, alongside the existing four:
{ provide: TenantRepository, useClass: SupabaseTenantRepository },
{ provide: TenantMemberRepository, useClass: SupabaseTenantMemberRepository },
```

- [ ] **Step 5: Update `app.routes.ts`** — swap the app-shell's guard, add signup/pending/rejected/admin routes

```typescript
// src/app/app.routes.ts — full replacement
import { Routes } from '@angular/router';
import { tenantAccessGuard } from '../presentation/core/auth/tenant-access.guard';
import { platformAdminGuard } from '../presentation/core/auth/platform-admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('../presentation/features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('../presentation/features/auth/signup/signup.component').then((m) => m.SignupComponent),
  },
  {
    path: 'pending',
    loadComponent: () =>
      import('../presentation/features/auth/pending/pending.component').then((m) => m.PendingComponent),
  },
  {
    path: 'rejected',
    loadComponent: () =>
      import('../presentation/features/auth/pending/pending.component').then((m) => m.PendingComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('../presentation/core/layout/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    canActivate: [tenantAccessGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../presentation/features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'suppliers',
        loadComponent: () =>
          import('../presentation/features/suppliers/suppliers.component').then((m) => m.SuppliersComponent),
      },
      {
        path: 'invoices',
        loadComponent: () =>
          import('../presentation/features/invoices/invoices.component').then((m) => m.InvoicesComponent),
      },
      {
        path: 'invoices/:id',
        loadComponent: () =>
          import('../presentation/features/invoices/details/invoice-detail.component').then((m) => m.InvoiceDetailComponent),
      },
      {
        path: 'income',
        loadComponent: () =>
          import('../presentation/features/income/income.component').then((m) => m.IncomeComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('../presentation/features/reports/reports.component').then((m) => m.ReportsComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('../presentation/features/tenant/users/tenant-users.component').then((m) => m.TenantUsersComponent),
      },
      {
        path: 'admin/approvals',
        canActivate: [platformAdminGuard],
        loadComponent: () =>
          import('../presentation/features/admin/approvals/admin-approvals.component').then((m) => m.AdminApprovalsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
```

> `pending.component.ts` (Task 14) reads its own route's URL to decide whether to show the "awaiting approval" or "rejected" message, rather than needing two separate components.

- [ ] **Step 6: Verify compilation**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: errors referencing the not-yet-created `signup.component`, `pending.component`, `tenant-users.component`, `admin-approvals.component` — expected at this point, resolved by Tasks 13–16. Confirm there are **no other** errors (i.e., `CurrentTenantService`, the two guards, and the provider wiring are all otherwise sound).

- [ ] **Step 7: Commit**

```bash
git add src/presentation/core/tenant/current-tenant.service.ts src/presentation/core/auth/tenant-access.guard.ts src/presentation/core/auth/platform-admin.guard.ts src/app/app.config.ts src/app/app.routes.ts
git commit -m "feat: wire tenant-aware routing, guards, and repository providers"
```

---

## Task 13: Presentation — business signup page

**Files:**
- Create: `src/presentation/features/auth/signup/signup.component.ts`
- Create: `src/presentation/features/auth/signup/signup.component.html`

**Interfaces:**
- Consumes: `SignupBusinessUseCase` (Task 9), `AuthService.signIn`-equivalent for account creation (needs a new `AuthService.signUp` method — add it in Step 1 below), `ThemeService` (existing).

- [ ] **Step 1: Add `signUp` to the existing `AuthService`**

```typescript
// src/presentation/core/auth/auth.service.ts — add this method alongside signIn/signInWithGoogle
signUp(email: string, password: string) {
  return this.db.auth.signUp({ email, password });
}
```

- [ ] **Step 2: Write the component**

```typescript
// src/presentation/features/auth/signup/signup.component.ts
import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { SignupBusinessUseCase } from '../../../../application/use-cases/tenants/signup-business.use-case';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './signup.component.html',
})
export class SignupComponent {
  private auth = inject(AuthService);
  private signupBusiness = inject(SignupBusinessUseCase);
  private router = inject(Router);
  theme = inject(ThemeService);

  businessName = '';
  firstName = '';
  lastName = '';
  dob = '';
  email = '';
  password = '';

  loading = signal(false);
  error = signal('');

  async onSubmit() {
    if (!this.businessName || !this.firstName || !this.lastName || !this.dob || !this.email || !this.password) {
      this.error.set('Please fill in every field.');
      return;
    }
    if (this.password.length < 8) {
      this.error.set('Password must be at least 8 characters.');
      return;
    }
    const today = new Date();
    const dobDate = new Date(this.dob);
    if (isNaN(dobDate.getTime()) || dobDate > today) {
      this.error.set('Please enter a valid date of birth.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const { error: signUpError } = await this.auth.signUp(this.email, this.password);
    if (signUpError) {
      this.loading.set(false);
      if (signUpError.message.toLowerCase().includes('already registered')) {
        this.error.set('An account with this email already exists. Log in instead.');
      } else {
        this.error.set(signUpError.message);
      }
      return;
    }

    try {
      await this.signupBusiness.execute({
        businessName: this.businessName,
        firstName: this.firstName,
        lastName: this.lastName,
        dob: this.dob,
      });
      this.router.navigate(['/pending']);
    } catch {
      this.error.set('We created your login but hit a problem setting up your business — please try logging in, or contact us if it happens again.');
    } finally {
      this.loading.set(false);
    }
  }
}
```

- [ ] **Step 3: Write the template**

```html
<!-- src/presentation/features/auth/signup/signup.component.html -->
<div style="min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg-base); padding:40px 20px;">
  <div style="width:100%; max-width:420px;" class="fade-up">
    <div style="margin-bottom:28px;">
      <h1 style="font-family:'DM Serif Display',serif;font-size:1.7rem;color:var(--text-primary);margin:0 0 6px;font-weight:400;">Set up your business</h1>
      <p style="font-size:.82rem;color:var(--text-secondary);margin:0;">Your account will be reviewed before you can sign in.</p>
    </div>

    <form (ngSubmit)="onSubmit()">
      <div style="margin-bottom:16px;">
        <label class="label" for="businessName">Business name</label>
        <input id="businessName" class="input" type="text" name="businessName" [(ngModel)]="businessName" required />
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
        <div>
          <label class="label" for="firstName">First name</label>
          <input id="firstName" class="input" type="text" name="firstName" [(ngModel)]="firstName" required />
        </div>
        <div>
          <label class="label" for="lastName">Last name</label>
          <input id="lastName" class="input" type="text" name="lastName" [(ngModel)]="lastName" required />
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <label class="label" for="dob">Date of birth</label>
        <input id="dob" class="input font-mono" type="date" name="dob" [(ngModel)]="dob" required />
      </div>

      <div style="margin-bottom:16px;">
        <label class="label" for="email">Email address</label>
        <input id="email" class="input" type="email" name="email" [(ngModel)]="email" required autocomplete="email" />
      </div>

      <div style="margin-bottom:22px;">
        <label class="label" for="password">Password</label>
        <input id="password" class="input" type="password" name="password" [(ngModel)]="password" required autocomplete="new-password" />
      </div>

      @if (error()) {
        <div style="background:var(--red-bg);border:1px solid rgba(231,76,60,.25);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:18px;">
          <p style="font-size:.8rem;color:var(--red);margin:0;">{{ error() }}</p>
        </div>
      }

      <button type="submit" class="btn-primary" [disabled]="loading()" style="width:100%;justify-content:center;padding:11px 18px;font-size:.875rem;">
        {{ loading() ? 'Creating your account...' : 'Create business account' }}
      </button>
    </form>

    <p style="text-align:center;font-size:.8rem;color:var(--text-secondary);margin-top:20px;">
      Already have an account? <a routerLink="/login" style="color:var(--gold);text-decoration:none;">Log in</a>
    </p>
  </div>
</div>
```

- [ ] **Step 4: Manual verification**

Run `ng serve`, navigate to `/signup`, submit the form with a throwaway email. Expected: redirected to `/pending`; a new row appears in both `tenants` and `tenant_members` with `status='pending'` (check via `execute_sql`).

- [ ] **Step 5: Commit**

```bash
git add src/presentation/features/auth/signup/ src/presentation/core/auth/auth.service.ts
git commit -m "feat: add business signup page"
```

---

## Task 14: Presentation — pending/rejected holding page

**Files:**
- Create: `src/presentation/features/auth/pending/pending.component.ts`
- Create: `src/presentation/features/auth/pending/pending.component.html`

**Interfaces:**
- Consumes: `CurrentTenantService` (Task 12), `AuthService.signOut` (existing), `Router` (to read whether the current URL is `/pending` or `/rejected`).

- [ ] **Step 1: Write the component**

```typescript
// src/presentation/features/auth/pending/pending.component.ts
import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentTenantService } from '../../../core/tenant/current-tenant.service';

@Component({
  selector: 'app-pending',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pending.component.html',
})
export class PendingComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  tenant = inject(CurrentTenantService);

  isRejected = computed(() => this.router.url.startsWith('/rejected') || this.tenant.membership()?.status === 'rejected');

  constructor() {
    this.tenant.refresh();
  }

  signOut() {
    this.auth.signOut().then(() => this.router.navigate(['/login']));
  }
}
```

- [ ] **Step 2: Write the template**

```html
<!-- src/presentation/features/auth/pending/pending.component.html -->
<div style="min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg-base); padding:40px 20px;">
  <div style="width:100%; max-width:420px; text-align:center;" class="fade-up">
    @if (isRejected()) {
      <h1 style="font-family:'DM Serif Display',serif;font-size:1.5rem;color:var(--text-primary);margin:0 0 12px;font-weight:400;">Request not approved</h1>
      <p style="font-size:.88rem;color:var(--text-secondary);margin:0 0 24px;">This request wasn't approved. Contact us if you think this is a mistake.</p>
    } @else {
      <h1 style="font-family:'DM Serif Display',serif;font-size:1.5rem;color:var(--text-primary);margin:0 0 12px;font-weight:400;">Awaiting approval</h1>
      <p style="font-size:.88rem;color:var(--text-secondary);margin:0 0 24px;">Your business is awaiting approval. Check back here for updates.</p>
    }
    <button type="button" class="btn-ghost" (click)="signOut()">Sign out</button>
  </div>
</div>
```

- [ ] **Step 3: Manual verification**

Log in as the throwaway pending account from Task 13. Expected: routed to `/pending`, shows "Awaiting approval." Manually reject that request in the DB (`update tenant_members set status='rejected' where email = '<throwaway>'`), reload. Expected: shows "Request not approved."

- [ ] **Step 4: Commit**

```bash
git add src/presentation/features/auth/pending/
git commit -m "feat: add pending/rejected holding page"
```

---

## Task 15: Presentation — admin approvals screen

**Files:**
- Create: `src/presentation/features/admin/approvals/admin-approvals.component.ts`
- Create: `src/presentation/features/admin/approvals/admin-approvals.component.html`
- Modify: `src/presentation/core/layout/sidebar/sidebar.component.ts` (add a conditional "Approvals" link)

**Interfaces:**
- Consumes: `ListPendingApprovalsUseCase`, `DecideTenantSignupUseCase`, `DecideTeammateRequestUseCase` (Task 10), `AuthService` (existing, for the platform-admin check to conditionally show the sidebar link).

- [ ] **Step 1: Write the component**

```typescript
// src/presentation/features/admin/approvals/admin-approvals.component.ts
import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { TopBarComponent } from '../../../core/layout/top-bar/top-bar.component';
import { ListPendingApprovalsUseCase } from '../../../../application/use-cases/admin/list-pending-approvals.use-case';
import { DecideTenantSignupUseCase } from '../../../../application/use-cases/admin/decide-tenant-signup.use-case';
import { DecideTeammateRequestUseCase } from '../../../../application/use-cases/admin/decide-teammate-request.use-case';
import { PendingApprovalItem } from '../../../../domain/models/tenant-member.model';

interface DecidedItem extends PendingApprovalItem {
  outcome: 'approved' | 'rejected';
  inviteFailed?: boolean;
}

@Component({
  selector: 'app-admin-approvals',
  standalone: true,
  imports: [TopBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-approvals.component.html',
})
export class AdminApprovalsComponent implements OnInit {
  private listPending = inject(ListPendingApprovalsUseCase);
  private decideTenantSignup = inject(DecideTenantSignupUseCase);
  private decideTeammateRequest = inject(DecideTeammateRequestUseCase);

  loading = signal(true);
  actingOn = signal<string | null>(null);
  pending = signal<PendingApprovalItem[]>([]);
  decided = signal<DecidedItem[]>([]);

  hasPending = computed(() => this.pending().length > 0);

  async ngOnInit() {
    await this.load();
  }

  private async load() {
    this.loading.set(true);
    this.pending.set(await this.listPending.execute());
    this.loading.set(false);
  }

  async decide(item: PendingApprovalItem, approve: boolean) {
    this.actingOn.set(item.member.id);
    try {
      if (item.kind === 'business') {
        await this.decideTenantSignup.execute(item.tenant.id, approve);
        this.decided.update(list => [{ ...item, outcome: approve ? 'approved' : 'rejected' }, ...list]);
      } else {
        const { inviteResult } = await this.decideTeammateRequest.execute(item.member.id, approve);
        this.decided.update(list => [
          { ...item, outcome: approve ? 'approved' : 'rejected', inviteFailed: approve && inviteResult?.ok === false },
          ...list,
        ]);
      }
      this.pending.update(list => list.filter(p => p.member.id !== item.member.id));
    } catch (e: any) {
      alert(e?.message ?? 'This request was already handled.');
      await this.load();
    } finally {
      this.actingOn.set(null);
    }
  }

  async resendInvite(item: DecidedItem) {
    this.actingOn.set(item.member.id);
    const { inviteResult } = await this.decideTeammateRequest.execute(item.member.id, true);
    this.decided.update(list =>
      list.map(d => d.member.id === item.member.id ? { ...d, inviteFailed: inviteResult?.ok === false } : d)
    );
    this.actingOn.set(null);
  }
}
```

> `resendInvite` calls `decideTeammateRequest.execute(id, true)` again deliberately — the member is already `invited`/decided, so `decide_teammate_request`'s "already handled" guard (which only matches rows still `status='pending'`) will no-op the DB write and just re-trigger the invite send via the use case's second half. This reuses the existing use case instead of adding a fifth one for what's really the same action.

- [ ] **Step 2: Write the template**

```html
<!-- src/presentation/features/admin/approvals/admin-approvals.component.html -->
<app-top-bar title="Approvals" />

<div style="padding:28px;">
  @if (loading()) {
    <div style="padding:56px;text-align:center;color:var(--text-dim);font-size:.875rem;">Loading approvals...</div>
  } @else {
    <h2 class="section-title" style="margin-bottom:14px;">Pending ({{ pending().length }})</h2>
    @if (!hasPending()) {
      <div style="text-align:center;padding:48px;color:var(--text-dim);font-size:.875rem;">Nothing waiting on you right now.</div>
    } @else {
      <div class="table-wrap fade-up" style="margin-bottom:36px;">
        <table>
          <thead>
            <tr>
              <th>Kind</th><th>Business</th><th>Name</th><th>Email</th><th>Role</th><th>Requested</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (item of pending(); track item.member.id) {
              <tr>
                <td>{{ item.kind === 'business' ? 'New business' : 'New teammate' }}</td>
                <td class="font-mono" style="font-size:.8rem;">{{ item.tenant.name }}</td>
                <td>{{ item.member.firstName }} {{ item.member.lastName }}</td>
                <td class="font-mono" style="font-size:.8rem;">{{ item.member.email }}</td>
                <td>{{ item.member.role }}</td>
                <td class="font-mono" style="font-size:.78rem;color:var(--text-secondary);">{{ item.member.createdAt | date:'mediumDate' }}</td>
                <td style="text-align:right;white-space:nowrap;">
                  <button class="btn-primary" style="padding:5px 12px;font-size:.75rem;margin-right:6px;"
                          [disabled]="actingOn() === item.member.id" (click)="decide(item, true)">Approve</button>
                  <button class="btn-ghost" style="padding:5px 12px;font-size:.75rem;"
                          [disabled]="actingOn() === item.member.id" (click)="decide(item, false)">Reject</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (decided().length > 0) {
      <h2 class="section-title" style="margin-bottom:14px;">History</h2>
      <div class="table-wrap fade-up">
        <table>
          <thead>
            <tr><th>Kind</th><th>Business</th><th>Name</th><th>Outcome</th><th></th></tr>
          </thead>
          <tbody>
            @for (item of decided(); track item.member.id) {
              <tr>
                <td>{{ item.kind === 'business' ? 'New business' : 'New teammate' }}</td>
                <td class="font-mono" style="font-size:.8rem;">{{ item.tenant.name }}</td>
                <td>{{ item.member.firstName }} {{ item.member.lastName }}</td>
                <td [style.color]="item.outcome === 'approved' ? 'var(--green)' : 'var(--red)'">{{ item.outcome }}</td>
                <td>
                  @if (item.inviteFailed) {
                    <button class="btn-ghost" style="padding:3px 10px;font-size:.72rem;color:var(--amber);"
                            [disabled]="actingOn() === item.member.id" (click)="resendInvite(item)">⚠ Invite failed — Resend</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  }
</div>
```

- [ ] **Step 3: Add a conditional sidebar link**

Read `src/presentation/core/layout/sidebar/sidebar.component.ts` and `.html` first to match the existing nav-item pattern exactly, then add an "Approvals" entry that only renders when `authService.user()?.app_metadata?.['is_platform_admin'] === true`, linking to `/admin/approvals`.

- [ ] **Step 4: Manual verification**

Log in as the platform-admin account (after having logged out/in post-Task-2-Step-4 so the JWT carries the claim). Expected: "Approvals" link visible in the sidebar; navigating to it shows the throwaway pending signup from Task 13; clicking Approve flips it to History with outcome "approved"; confirm via `execute_sql` that `tenants.status` and the owner's `tenant_members.status` are both `'active'`.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/features/admin/ src/presentation/core/layout/sidebar/
git commit -m "feat: add admin approvals screen"
```

---

## Task 16: Presentation — tenant Users page + Add User modal

**Files:**
- Create: `src/presentation/features/tenant/users/tenant-users.component.ts`
- Create: `src/presentation/features/tenant/users/tenant-users.component.html`
- Modify: `src/presentation/core/layout/sidebar/sidebar.component.ts` (add a "Users" link, visible to all active members)

**Interfaces:**
- Consumes: `ListTeamMembersUseCase`, `RequestAddTeammateUseCase` (Task 11), `CurrentTenantService` (Task 12), `canManageTeam` (Task 7).

- [ ] **Step 1: Write the component**

```typescript
// src/presentation/features/tenant/users/tenant-users.component.ts
import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopBarComponent } from '../../../core/layout/top-bar/top-bar.component';
import { CurrentTenantService } from '../../../core/tenant/current-tenant.service';
import { ListTeamMembersUseCase } from '../../../../application/use-cases/tenants/list-team-members.use-case';
import { RequestAddTeammateUseCase } from '../../../../application/use-cases/tenants/request-add-teammate.use-case';
import { canManageTeam } from '../../../../domain/services/membership-access.service';
import { TenantMember, MemberRole } from '../../../../domain/models/tenant-member.model';

@Component({
  selector: 'app-tenant-users',
  standalone: true,
  imports: [FormsModule, TopBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tenant-users.component.html',
})
export class TenantUsersComponent implements OnInit {
  private listTeam = inject(ListTeamMembersUseCase);
  private requestAddTeammate = inject(RequestAddTeammateUseCase);
  tenant = inject(CurrentTenantService);

  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  error = signal('');
  members = signal<TenantMember[]>([]);

  canManage = computed(() => {
    const role = this.tenant.membership()?.role;
    return role ? canManageTeam(role) : false;
  });

  form = { email: '', firstName: '', lastName: '', dob: '', role: 'user' as Exclude<MemberRole, 'owner'> };

  async ngOnInit() {
    const tenantId = this.tenant.membership()?.tenantId;
    if (tenantId) this.members.set(await this.listTeam.execute(tenantId));
    this.loading.set(false);
  }

  async onSubmit() {
    const tenantId = this.tenant.membership()?.tenantId;
    if (!tenantId) return;
    this.saving.set(true);
    this.error.set('');
    try {
      await this.requestAddTeammate.execute({ tenantId, ...this.form });
      this.showForm.set(false);
      this.members.set(await this.listTeam.execute(tenantId));
      this.form = { email: '', firstName: '', lastName: '', dob: '', role: 'user' };
    } catch (e: any) {
      this.error.set(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }

  closeIfBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) this.showForm.set(false);
  }
}
```

- [ ] **Step 2: Write the template**

```html
<!-- src/presentation/features/tenant/users/tenant-users.component.html -->
<app-top-bar title="Team">
  @if (canManage()) {
    <button class="btn-primary" (click)="showForm.set(true)">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Add User
    </button>
  }
</app-top-bar>

<div style="padding:28px;">
  @if (showForm()) {
    <div class="modal-overlay" (click)="closeIfBackdrop($event)">
      <div class="modal fade-up" style="max-width:460px;" (click)="$event.stopPropagation()">
        <h3 style="font-family:'DM Serif Display',serif;font-size:1.2rem;color:var(--text-primary);margin:0 0 24px;font-weight:400;">Add teammate</h3>
        <form (ngSubmit)="onSubmit()">
          <div style="margin-bottom:16px;">
            <label class="label" for="addEmail">Email</label>
            <input id="addEmail" class="input" type="email" name="email" [(ngModel)]="form.email" required />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
            <div>
              <label class="label" for="addFirstName">First name</label>
              <input id="addFirstName" class="input" type="text" name="firstName" [(ngModel)]="form.firstName" required />
            </div>
            <div>
              <label class="label" for="addLastName">Last name</label>
              <input id="addLastName" class="input" type="text" name="lastName" [(ngModel)]="form.lastName" required />
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
            <div>
              <label class="label" for="addDob">Date of birth</label>
              <input id="addDob" class="input font-mono" type="date" name="dob" [(ngModel)]="form.dob" required />
            </div>
            <div>
              <label class="label" for="addRole">Role</label>
              <select id="addRole" class="input" name="role" [(ngModel)]="form.role">
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          @if (error()) {
            <div style="background:var(--red-bg);border:1px solid rgba(231,76,60,.25);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:18px;">
              <p style="font-size:.8rem;color:var(--red);margin:0;">{{ error() }}</p>
            </div>
          }

          <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:4px;border-top:1px solid var(--border);">
            <button type="button" class="btn-ghost" (click)="showForm.set(false)">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Sending...' : 'Send for approval' }}</button>
          </div>
        </form>
      </div>
    </div>
  }

  @if (loading()) {
    <div style="padding:56px;text-align:center;color:var(--text-dim);font-size:.875rem;">Loading team...</div>
  } @else {
    <div class="table-wrap fade-up">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
        <tbody>
          @for (m of members(); track m.id) {
            <tr>
              <td style="font-weight:500;">{{ m.firstName }} {{ m.lastName }}</td>
              <td class="font-mono" style="font-size:.8rem;">{{ m.email }}</td>
              <td>{{ m.role }}</td>
              <td>
                <span class="badge" [class.badge-paid]="m.status === 'active'" [class.badge-partial]="m.status === 'pending' || m.status === 'invited'" [class.badge-unpaid]="m.status === 'rejected'">
                  {{ m.status }}
                </span>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  }
</div>
```

- [ ] **Step 3: Add a "Users" sidebar link** visible to any active member (not gated by role — everyone can see their teammates; only `canManage()` gates the Add button within the page itself).

- [ ] **Step 4: Manual verification**

As the owner, go to `/users`, confirm both bootstrap accounts appear with status `active`. Click Add User, submit a throwaway email with role `user`. Expected: appears in the admin's `/admin/approvals` pending queue as "New teammate"; approving it flips status to `invited` in the Users table and (per Task 5) triggers an actual invite email attempt.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/features/tenant/ src/presentation/core/layout/sidebar/
git commit -m "feat: add tenant Users page with add-teammate flow"
```

---

## Task 17: Thread tenant_id through existing business use cases

Every existing create-path (suppliers, invoices, payments, income) needs to stamp the current tenant onto new rows now that the tables require `tenant_id`. Read `SupabaseSupplierRepository`, `SupabaseInvoiceRepository`, `SupabasePaymentRepository`, `SupabaseIncomeRecordRepository`'s `create()` methods first — this task modifies all four the same way, so read one and apply the identical pattern to the rest.

**Files:**
- Modify: `src/infrastructure/supabase/repositories/supabase-supplier.repository.ts`
- Modify: `src/infrastructure/supabase/repositories/supabase-invoice.repository.ts`
- Modify: `src/infrastructure/supabase/repositories/supabase-payment.repository.ts`
- Modify: `src/infrastructure/supabase/repositories/supabase-income-record.repository.ts`

**Interfaces:**
- Consumes: nothing new from the application layer — `create()` signatures on all four repository interfaces stay unchanged. The tenant_id is resolved **inside** the Supabase repository itself via a direct lookup, not threaded through every use case's DTO — this avoids changing four `CreateXxxDto` shapes and every call site across the app for a value that's never user-supplied.

- [ ] **Step 1: Add a private tenant-id lookup shared across all four repos**

In each of the four files, add this private helper (identical in all four — this is deliberately small enough that a shared abstraction isn't worth the indirection):

```typescript
private async currentTenantId(): Promise<string> {
  const { data: userData } = await this.db.auth.getUser();
  const { data, error } = await this.db
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', userData.user?.id)
    .eq('status', 'active')
    .single();
  if (error || !data) throw new Error('No active business membership found.');
  return data.tenant_id;
}
```

- [ ] **Step 2: Use it in each `create()` method**

For `supabase-supplier.repository.ts`, change:
```typescript
async create(dto: CreateSupplierDto): Promise<Supplier> {
  const { data, error } = await this.db
    .from('suppliers')
    .insert({ name: dto.name, contact_info: dto.contactInfo, notes: dto.notes })
    .select()
    .single();
  if (error) throw error;
  return this.map(data);
}
```
to:
```typescript
async create(dto: CreateSupplierDto): Promise<Supplier> {
  const tenantId = await this.currentTenantId();
  const { data, error } = await this.db
    .from('suppliers')
    .insert({ tenant_id: tenantId, name: dto.name, contact_info: dto.contactInfo, notes: dto.notes })
    .select()
    .single();
  if (error) throw error;
  return this.map(data);
}
```

Apply the identical `tenant_id: await this.currentTenantId()` addition to the `insert(...)` call inside `create()` in the other three repositories (`supabase-invoice.repository.ts`, `supabase-payment.repository.ts`, `supabase-income-record.repository.ts`), alongside their existing fields. Do not touch their `getAll`/`getById`/`update`/`archive` methods — RLS (Task 4) already restricts reads/updates to the caller's own tenant, so no explicit tenant filter is needed there.

- [ ] **Step 3: Manual verification**

Log in as the bootstrap owner account, create a new supplier via the UI. Expected: succeeds, and `select tenant_id from suppliers order by created_at desc limit 1;` via `execute_sql` shows tenant #1's id. Repeat for one invoice, one payment, one income record.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/supabase/repositories/supabase-supplier.repository.ts src/infrastructure/supabase/repositories/supabase-invoice.repository.ts src/infrastructure/supabase/repositories/supabase-payment.repository.ts src/infrastructure/supabase/repositories/supabase-income-record.repository.ts
git commit -m "feat: stamp tenant_id on all new business records"
```

---

## Task 18: End-to-end verification pass

No e2e test harness exists in this repo (Global Constraints). This task is a scripted manual pass through the entire lifecycle, run against the live Supabase project.

**Files:** None (verification only).

- [ ] **Step 1: Full business signup → approval → login cycle**

1. Sign up a fresh throwaway business at `/signup`.
2. Confirm it lands on `/pending`.
3. As the platform-admin account, go to `/admin/approvals`, approve it.
4. Reload as the throwaway account. Expected: lands on `/dashboard`, not `/pending`.

- [ ] **Step 2: Rejection path**

1. Sign up a second throwaway business.
2. Reject it from `/admin/approvals`.
3. Reload as that account. Expected: `/rejected` with the "not approved" message.

- [ ] **Step 3: Teammate invite cycle**

1. As the first throwaway business's owner, go to `/users`, add a teammate with a real, reachable test email you control.
2. As platform-admin, approve the request from `/admin/approvals`.
3. Confirm the invite email actually arrives (check the test inbox). If it doesn't arrive and the row shows `⚠ Invite email failed`, check `get_logs` on the Edge Function via MCP before proceeding.
4. Accept the invite, set a password, log in. Expected: lands on `/dashboard` directly (not `/pending`), and `/users` shows their status as `active`.

- [ ] **Step 4: Tenant isolation check**

While logged in as the first throwaway business's owner, attempt (via browser devtools console, using the app's own Supabase client) to query a second tenant's data directly:
```javascript
const { data, error } = await window.ngSupabase.from('suppliers').select('*');
```
(Expose `getSupabaseClient()` temporarily on `window` for this check only, or run the equivalent query in the Supabase SQL editor `set role authenticated; set request.jwt.claims = '...';` impersonation if preferred.)
Expected: only rows belonging to that user's own tenant are returned, never another tenant's, confirming RLS isolation works end-to-end — this is the most important thing in the whole plan to get right, so don't skip it.

- [ ] **Step 5: Duplicate/edge-case error messages**

Confirm each row of the spec's error-handling table produces the stated user-facing message: re-signup with an already-used email, a too-short password, an already-teammate email, an email active on another tenant, and double-clicking Approve on an already-decided request.

- [ ] **Step 6: Clean up throwaway data**

Delete the throwaway tenants/tenant_members/auth.users rows created during this task via `execute_sql`, so they don't linger in the production project.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: multi-tenancy end-to-end verification pass" --allow-empty
```

(Empty commit is fine here — this task's changes, if any were needed to fix issues found during verification, would already be committed as part of the task where the fix belongs; this final commit is just a marker that the full pass was run.)

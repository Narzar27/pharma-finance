# Multi-tenancy, Signup & Admin Approval — Design

Date: 2026-07-10
Status: Approved, ready for implementation planning

## Context

pharma-finance is pivoting from a single-tenant, two-user (father + son) pharmacy
app into a generic multi-tenant business finance/treasury platform. Today there
is no concept of a tenant at all — every Supabase query is unscoped, and any
authenticated user sees all data. This spec covers the foundational piece the
rest of the pivot depends on: how a business gets onto the platform, how its
data is isolated from every other business, and how people join a business's
account.

Out of scope for this spec (tracked separately): currency generalization
(staying USD/LBP for now), the product rename, the responsive/mobile pass,
receipt/PDF upload, and finance/accounting-domain research.

## Decisions made

- **Tenant shape**: a business = a tenant. A tenant can have multiple users
  (owner + invited teammates), not strictly one user per tenant.
- **Membership**: one business per user account. No tenant switcher — a
  user's tenant is fixed. (Revisit later if someone needs to belong to more
  than one business, e.g. an accountant managing multiple clients.)
- **Approval gate**: platform-wide. A single super-admin (the existing
  nizar account, `is_platform_admin = true` in `raw_app_metadata`) approves
  every new business signup AND every new teammate added to an existing
  business. There is no separate "owner approves their own teammate" step —
  the owner's act of submitting an add-teammate request already reflects
  their decision; the platform gate is the only approval step.
- **Super-admin account**: dual role. The existing pharmacy account is both
  tenant #1's owner and the platform super-admin.
- **Currency**: unchanged. Stays the hardcoded `'USD' | 'LBP'` union. Not
  part of this piece of work.
- **Authorization mechanism**: RLS policies query a `tenant_members` table
  directly (`USING (tenant_id IN (SELECT ... WHERE user_id = auth.uid() AND
  status = 'active'))`), not JWT custom claims. Chosen over a Supabase Auth
  Hook because it needs no extra infra to maintain and an approval decision
  takes effect on the person's very next request rather than requiring a
  fresh login/token refresh.
- **Supabase project status**: confirmed back up and reachable (health
  check + a real REST query both succeeded). The auth bypass added during
  the outage (`environment.bypassAuth`) has been reverted to `false`.

## Data model

```sql
tenants
  id            uuid primary key default gen_random_uuid()
  name          text not null
  status        text not null check (status in ('pending','active','rejected')) default 'pending'
  created_at    timestamptz not null default now()

tenant_members
  id            uuid primary key default gen_random_uuid()
  tenant_id     uuid not null references tenants(id) on delete cascade
  user_id       uuid references auth.users(id)   -- null until the person has an actual Supabase Auth account
  email         text not null
  first_name    text not null
  last_name     text not null
  dob           date not null
  role          text not null check (role in ('owner','admin','manager','user'))
  status        text not null check (status in ('pending','active','rejected')) default 'pending'
  invited_by    uuid references auth.users(id)    -- null for the initial owner (self-signup)
  created_at    timestamptz not null default now()
  decided_at    timestamptz
  decided_by    uuid references auth.users(id)
```

Every existing business table (`suppliers`, `invoices`, `payments`,
`income_records`) gets a `tenant_id uuid not null references tenants(id)`
column. Every RLS policy on those tables is rewritten to scope by tenant
membership instead of the current blanket `USING (true)`.

**Roles** (informational default, not enforced with fine-grained permission
checks in this first pass beyond gating the admin/team-management screens):
- `owner` — auto-assigned to whoever signs the business up. Full control.
  Cannot be removed or demoted through the UI.
- `admin` — can add/remove teammates and manage tenant settings.
- `manager` — full day-to-day access plus reports; no teammate/tenant
  management.
- `user` — day-to-day data entry only; no admin screens.

**Platform super-admin** is a flag, not a role tied to any tenant:
`auth.users.raw_app_metadata.is_platform_admin = true`. There is no
self-serve way to become a super-admin — it's set manually, once, for the
initial account.

## Flows

### Business signup (creates a new tenant)

1. Prospective owner fills a signup form: business name, their own first/last
   name, email, password, DOB.
2. On submit: create their Supabase Auth account immediately (they choose
   their password now), then — in a single Postgres RPC/transaction, not two
   separate client-side inserts — create the `tenants` row (`status='pending'`)
   and their own `tenant_members` row (`role='owner'`, `status='pending'`).
   Doing this as one DB function call avoids a half-created state if the
   second write fails.
3. They can log in immediately. `authGuard` checks their membership status;
   if `pending`, route to a holding page ("Your business is awaiting
   approval. Check back here for updates.") instead of the dashboard.
4. Super-admin approves or rejects from `/admin/approvals`.
   - **Approve**: flips both the `tenants` row and the owner's
     `tenant_members` row to `active`. App unlocks immediately on their next
     request (no re-login needed, per the table-lookup RLS approach).
   - **Reject**: flips both to `rejected`. They stay logged in but
     permanently see "This request wasn't approved. Contact us if you think
     this is a mistake." No automatic account deletion — keeps a paper
     trail.

### Adding a teammate (existing, active tenant)

1. Owner/admin opens the tenant's **Users** page: a table of everyone in the
   tenant (name, email, role, status), with an **Add User** button.
2. The button opens a modal: email, first name, last name, DOB, role
   (`admin` / `manager` / `user` — not `owner`).
3. Before submitting, check for:
   - An existing active/pending member of *this* tenant with the same email
     → block with "This person is already on your team."
   - An existing active member of a *different* tenant with the same email
     → block with "This email is already associated with another business
     account." (enforced given the one-business-per-user decision)
4. Submitting creates a `tenant_members` row (`user_id = null`,
   `status='pending'`, `invited_by = <owner's user id>`). No Supabase Auth
   account exists yet — we don't create one until it's approved.
5. Super-admin approves or rejects from the same `/admin/approvals` queue.
   - **Approve**: Supabase sends a real invite (magic link) to that email.
     When they follow it and set a password, their new `auth.users.id` gets
     matched by email and written into that `tenant_members.user_id` on
     first successful login; status flips to `active`.
     - If the invite email fails to send, the request still shows as
       approved but flagged: "⚠ Invite email failed — **Resend**".
   - **Reject**: row marked `rejected`. No invite is ever sent, no account
     is ever created.
   - Re-checked for the cross-tenant-email race at approval time too, in
     case two pending requests for the same email exist across different
     tenants.

### Admin approval screen (`/admin/approvals`)

Visible only when `is_platform_admin = true`. One unified queue mixing both
request kinds (New Business / New Teammate), newest first. Each row: kind,
business name, person's name + email + role + DOB, requested date,
Approve/Reject. Approved/rejected items move to a collapsed history section
below (not deleted) so there's a record of past decisions. Approve/reject
actions are idempotent — re-clicking (e.g. two tabs open) on an
already-decided row shows "This request was already handled." and no-ops.

## Error handling reference

| Scenario | User sees | Mechanism |
|---|---|---|
| Email already has an account | "An account with this email already exists. Log in instead." | Supabase Auth unique-email constraint, caught & reworded |
| Password too weak | "Password must be at least 8 characters." | Client-side inline validation |
| Required field blank (business name, first/last name) | "Business name is required." (etc., per field) | Client-side inline validation |
| DOB missing/implausible | "Please enter a valid date of birth." | Client + server-side check |
| Signup RPC fails after auth account created | "We created your login but hit a problem setting up your business — please try logging in, or contact us if it happens again." | Atomic RPC for tenant+membership creation; failure logged server-side for manual fixup |
| Pending owner/teammate logs in | Holding page: "Your business is awaiting approval. Check back here for updates." | No email notification on decisions in this phase (flagged as a good later follow-up, needs new infra) |
| Rejected user logs in | "This request wasn't approved. Contact us if you think this is a mistake." | Terminal state, not an error |
| Duplicate teammate email (same tenant) | "This person is already on your team." | Checked at request creation |
| Teammate email active elsewhere | "This email is already associated with another business account." | Checked at request creation and again at approval |
| Invite email fails to send | "⚠ Invite email failed — Resend" action in admin history | Explicit resend action, not a silent failure |
| Same request approved/rejected twice | "This request was already handled." | Approve/reject checks row is still `pending` before acting |
| Any unexpected server/network error | "Something went wrong. Please try again." (never a raw error/stack trace) | Generic catch-all at use-case boundary; real error logged to console, never shown raw |

## Implementation notes / sequencing

1. Before adding `tenant_id` to anything: reconcile the live (undocumented)
   Supabase schema into real migration files under `supabase/migrations/`
   (currently empty in the repo — the actual schema only exists in the live
   project). This also resolves the known `income_records.type` drift found
   in the earlier audit.
2. Add `tenants` / `tenant_members` tables + RLS, `tenant_id` on business
   tables, migrate existing pharmacy data to tenant #1.
3. Build signup, holding page, admin approvals screen, add-teammate flow, in
   that rough order.
4. Set `is_platform_admin = true` manually on the existing account once,
   directly in Supabase — no UI for granting this flag.

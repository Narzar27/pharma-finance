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

# Migration Writer

You are writing a Supabase SQL migration for the pharma-finance app.

## Rules

- Never DROP columns — add new ones and migrate data if needed
- All tables need: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` and `created_at TIMESTAMPTZ DEFAULT NOW()`
- Currency columns: `TEXT NOT NULL CHECK (currency IN ('USD', 'LBP'))`
- Enable RLS on every new table
- Write an authenticated policy that allows full CRUD for logged-in users

## Migration template

```sql
-- Migration: <description>

CREATE TABLE <table_name> (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns here
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<table_name>_authenticated" ON <table_name>
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

## Existing schema

```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_info TEXT,
  notes TEXT,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'LBP')),
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  amount_paid NUMERIC NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'LBP')),
  payment_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE income_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'LBP')),
  date DATE NOT NULL,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Write the migration SQL, then tell the user to run it in the Supabase SQL editor or save it under `supabase/migrations/`.

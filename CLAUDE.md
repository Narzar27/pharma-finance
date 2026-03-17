# pharma-finance — Claude Code Instructions

## Project Overview

A web application for managing pharmacy finances. Replaces manual paper-based tracking of invoices, payments, and income for a pharmacy in Lebanon. Supports dual currency (USD and LBP).

**Users:** Father (pharmacist) + son — both need access via browser.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Angular v20+ (standalone, signals, OnPush) |
| Styling | TailwindCSS |
| Backend / DB | Supabase (Postgres + Row Level Security) |
| Auth | Supabase Auth (email/password) |
| Language | TypeScript (strict mode) |

---

## Architecture: Clean Architecture

The codebase is organized into four strict layers. **Dependencies only point inward** — outer layers depend on inner, never the reverse.

```
src/
  domain/          ← innermost: pure business logic, zero framework imports
  application/     ← use cases: orchestrate domain + repository interfaces
  infrastructure/  ← adapters: Supabase implementations of repository interfaces
  presentation/    ← Angular components, pages, services (UI only)
```

### Layer Rules

- **domain/**: Only TypeScript interfaces, enums, and pure functions. No Angular, no Supabase, no HTTP.
- **application/**: Imports domain only. Use cases take repository interfaces as constructor arguments (injected via Angular DI). No Supabase imports.
- **infrastructure/**: Implements repository interfaces. Imports Supabase SDK. Never imported by domain or application.
- **presentation/**: Angular components and pages. Calls use cases via Angular DI. Never calls Supabase directly.

---

## Folder Structure

```
src/
  domain/
    models/
      supplier.model.ts
      invoice.model.ts
      payment.model.ts
      income-record.model.ts
    repositories/
      supplier.repository.ts        ← abstract interface
      invoice.repository.ts
      payment.repository.ts
      income-record.repository.ts
    services/
      invoice-status.service.ts     ← domain logic: status calculation

  application/
    use-cases/
      suppliers/
        create-supplier.use-case.ts
        list-suppliers.use-case.ts
        get-supplier-balance.use-case.ts
      invoices/
        create-invoice.use-case.ts
        list-invoices.use-case.ts
        get-invoice-detail.use-case.ts
        add-payment.use-case.ts
      income/
        create-income-record.use-case.ts
        list-income-records.use-case.ts
      reports/
        generate-report.use-case.ts

  infrastructure/
    supabase/
      supabase.client.ts            ← singleton Supabase client
      repositories/
        supabase-supplier.repository.ts
        supabase-invoice.repository.ts
        supabase-payment.repository.ts
        supabase-income-record.repository.ts

  presentation/
    core/
      auth/
        auth.service.ts             ← wraps Supabase Auth
        auth.guard.ts
      layout/
        app-shell/
        sidebar/
        top-bar/
    features/
      auth/
        login/
      dashboard/
      suppliers/
      invoices/
      income/
      reports/
    shared/
      components/
        currency-badge/
        status-badge/
        data-table/
        confirm-dialog/
      pipes/
        currency-format.pipe.ts
```

---

## Angular Conventions

- **All components are standalone** (`standalone: true`) — no NgModules
- **Change detection**: `ChangeDetectionStrategy.OnPush` on all components
- **State**: Use `signal()`, `computed()`, `linkedSignal()` — avoid BehaviorSubject
- **Inputs/Outputs**: Use `input()` and `output()` signal-based APIs
- **HTTP / async**: Use `resource()` or `httpResource()` for data fetching
- **Routing**: Lazy-loaded feature routes via `loadComponent`
- **DI**: Use `inject()` function, not constructor injection
- **Host bindings**: Use `host: {}` in `@Component` decorator, not `@HostBinding`

---

## Supabase Conventions

- The Supabase client is a singleton in `infrastructure/supabase/supabase.client.ts`
- Repository implementations live in `infrastructure/supabase/repositories/`
- Use environment variables for Supabase URL and anon key (`environment.ts`)
- Row Level Security (RLS) is enabled on all tables
- All tables have `created_at TIMESTAMPTZ DEFAULT NOW()`
- Currency columns are always `TEXT CHECK (currency IN ('USD', 'LBP'))`
- Never call Supabase from Angular components — always go through a use case

---

## Multi-Currency Rules

**Critical:** Never auto-convert between USD and LBP in the data layer.

- Every monetary record stores `amount NUMERIC` + `currency TEXT`
- Reports show USD totals and LBP totals **separately** by default
- The reports page has an optional exchange rate input for a combined USD view
- Exchange rates are NOT stored in the database — they are ephemeral UI state only

---

## Database Schema

```sql
-- suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_info TEXT,
  notes TEXT,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- invoices
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

-- payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  amount_paid NUMERIC NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'LBP')),
  payment_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- income_records
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

---

## Development Commands

```bash
# Start dev server
ng serve

# Generate a new component
ng generate component presentation/features/<feature>/<component-name> --standalone

# Build for production
ng build --configuration production

# Run tests
ng test
```

---

## Agents

The following agents provide focused context for specific tasks. Invoke them when working on the area they cover.

---

### Agent: feature-builder

**Use when:** Adding a new feature or extending an existing one.

**Responsibilities:**
1. Define the domain model in `domain/models/`
2. Define the repository interface in `domain/repositories/`
3. Implement the use case(s) in `application/use-cases/<feature>/`
4. Implement the Supabase repository in `infrastructure/supabase/repositories/`
5. Register the repository as an Angular provider (provide concrete in root or feature module)
6. Build the Angular page component in `presentation/features/<feature>/`
7. Add the lazy-loaded route to `app.routes.ts`
8. Add a sidebar nav entry if it's a top-level page

**Checklist for every feature:**
- [ ] Domain model interface defined (no framework imports)
- [ ] Repository interface is abstract (no implementation details)
- [ ] Use case constructor receives repository interface, not concrete class
- [ ] Supabase repository implements the interface exactly
- [ ] Component uses `ChangeDetectionStrategy.OnPush`
- [ ] Component uses `signal()` for local state
- [ ] Component calls use case via `inject()`, never Supabase directly
- [ ] Route is lazy-loaded via `loadComponent`

---

### Agent: migration-writer

**Use when:** Creating or modifying Supabase database tables, columns, or policies.

**Responsibilities:**
- Write SQL migration files compatible with Supabase
- Follow schema conventions (UUID PKs, `created_at`, currency CHECK constraints)
- Enable RLS on new tables
- Write appropriate RLS policies (authenticated users can CRUD their own data)
- Never DROP columns — add new ones and migrate data if needed

**Migration file location:** `supabase/migrations/`

**Template for a new table migration:**
```sql
-- Migration: create_<table_name>
CREATE TABLE <table_name> (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns here
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<table_name>_authenticated" ON <table_name>
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

---

### Agent: report-builder

**Use when:** Working on the Reports page or any feature that aggregates financial data.

**Multi-currency rules (non-negotiable):**
- Always return USD and LBP totals as separate fields — never combined
- The exchange rate is UI state only — never passed to use cases or stored
- Filter by date range using `date >= start AND date <= end` (inclusive)

**Report data structure pattern:**
```typescript
interface CurrencySplit {
  usd: number;
  lbp: number;
}

interface ReportResult {
  totalIncome: CurrencySplit;
  totalExpenses: CurrencySplit;
  netBalance: CurrencySplit;
  supplierBalances: { supplier: Supplier; balance: CurrencySplit }[];
}
```

**Signal pattern for report page:**
- `dateRange` = `signal<DateRange>(...)`
- `exchangeRate` = `signal<number | null>(null)`
- `report` = `resource({ request: () => this.dateRange(), loader: ... })`
- Combined USD total = `computed(() => report.value()?.totalIncome.usd + (lbp / exchangeRate))` — only when exchange rate is set

---

### Agent: ui-component

**Use when:** Building or modifying Angular UI components, layouts, or pages.

**Design system:**
- Use TailwindCSS utility classes only — no custom CSS files except for base styles
- Color palette: use Tailwind slate/gray for neutrals, blue-600 for primary actions, red-500 for overdue/danger, amber-500 for warnings, green-600 for paid/success
- Typography: `text-sm` for body, `text-xs` for labels/badges, `text-lg font-semibold` for page titles
- Spacing: use `gap-4`, `p-4`, `p-6` consistently — avoid arbitrary values
- Cards: `bg-white rounded-xl shadow-sm border border-slate-200 p-6`
- Buttons: primary = `bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700`
- Inputs: `border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`

**Component checklist:**
- [ ] `standalone: true`
- [ ] `ChangeDetectionStrategy.OnPush`
- [ ] Inputs use `input()` signal API
- [ ] Outputs use `output()` signal API
- [ ] `inject()` for DI, not constructor
- [ ] No direct Supabase calls — only use cases
- [ ] Accessible: labels on form fields, aria attributes on interactive elements

**Currency badge colors:**
- USD: `bg-green-100 text-green-700`
- LBP: `bg-amber-100 text-amber-700`

**Invoice status badge colors:**
- unpaid: `bg-red-100 text-red-700`
- partial: `bg-amber-100 text-amber-700`
- paid: `bg-green-100 text-green-700`

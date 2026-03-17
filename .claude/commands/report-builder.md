# Report Builder

You are working on the Reports page or a feature that aggregates financial data in the pharma-finance app.

## Non-negotiable multi-currency rules

- Always return USD and LBP totals as **separate fields** — never combined into one number
- Exchange rate is UI state only — never passed to use cases, never stored in the database
- Date range filtering: `date >= from AND date <= to` (inclusive on both ends)

## Standard data shapes

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

## Signal pattern for report components

```typescript
preset = signal<Preset>('this-month');
report = signal<ReportResult | null>(null);
exchangeRate: number | null = null;
combinedUsdNet = signal<number | null>(null);

// Combined view only when exchange rate is set
onRateChange() {
  const r = this.report();
  if (!r || !this.exchangeRate || this.exchangeRate <= 0) {
    this.combinedUsdNet.set(null);
    return;
  }
  this.combinedUsdNet.set(r.netBalance.usd + r.netBalance.lbp / this.exchangeRate);
}
```

## Date preset ranges

| Preset | From | To |
|--------|------|----|
| this-week | Monday of current week | Sunday of current week |
| this-month | 1st of current month | Last day of current month |
| last-month | 1st of previous month | Last day of previous month |
| custom | user input | user input |

The existing `GenerateReportUseCase` in `src/application/use-cases/reports/generate-report.use-case.ts` covers the standard report. Extend it or create a new use case for new aggregations — never add Supabase queries directly to the component.

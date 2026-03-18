import { inject, Injectable } from '@angular/core';
import { InvoiceRepository } from '../../../domain/repositories/invoice.repository';
import { IncomeRecordRepository } from '../../../domain/repositories/income-record.repository';
import { SupplierRepository } from '../../../domain/repositories/supplier.repository';
import { Supplier } from '../../../domain/models/supplier.model';

export interface CurrencySplit {
  usd: number;
  lbp: number;
}

export interface SupplierBalance {
  supplier: Supplier;
  balance: CurrencySplit;
}

export interface ReportResult {
  totalIncome: CurrencySplit;
  totalExpenses: CurrencySplit;
  netBalance: CurrencySplit;
  supplierBalances: SupplierBalance[];
}

export interface DateRange {
  from: string;
  to: string;
}

@Injectable({ providedIn: 'root' })
export class GenerateReportUseCase {
  private invoiceRepo = inject(InvoiceRepository);
  private incomeRepo = inject(IncomeRecordRepository);
  private supplierRepo = inject(SupplierRepository);

  async execute(range: DateRange): Promise<ReportResult> {
    const [recordTotals, invoices, suppliers] = await Promise.all([
      this.incomeRepo.getTotals(range.from, range.to),
      this.invoiceRepo.getAll({ dateFrom: range.from, dateTo: range.to }),
      this.supplierRepo.getAll(),
    ]);

    // Invoice expenses in the period
    const invoiceExpenses = invoices.reduce(
      (acc, inv) => {
        if (inv.currency === 'USD') acc.usd += inv.amount;
        else acc.lbp += inv.amount;
        return acc;
      },
      { usd: 0, lbp: 0 }
    );

    // Total expenses = invoice expenses + cash expense records
    const totalExpenses: CurrencySplit = {
      usd: invoiceExpenses.usd + recordTotals.expense.usd,
      lbp: invoiceExpenses.lbp + recordTotals.expense.lbp,
    };

    const totalIncome = recordTotals.income;

    const netBalance: CurrencySplit = {
      usd: totalIncome.usd - totalExpenses.usd,
      lbp: totalIncome.lbp - totalExpenses.lbp,
    };

    // Per-supplier unpaid balances
    const supplierBalances: SupplierBalance[] = await Promise.all(
      suppliers.map(async (supplier) => {
        const supplierInvoices = await this.invoiceRepo.getAll({
          supplierId: supplier.id,
          status: 'unpaid',
        });
        const partialInvoices = await this.invoiceRepo.getAll({
          supplierId: supplier.id,
          status: 'partial',
        });
        const all = [...supplierInvoices, ...partialInvoices];
        const balance = all.reduce(
          (acc, inv) => {
            if (inv.currency === 'USD') acc.usd += inv.amount;
            else acc.lbp += inv.amount;
            return acc;
          },
          { usd: 0, lbp: 0 }
        );
        return { supplier, balance };
      })
    );

    return {
      totalIncome,
      totalExpenses,
      netBalance,
      supplierBalances: supplierBalances.filter(
        (sb) => sb.balance.usd > 0 || sb.balance.lbp > 0
      ),
    };
  }
}

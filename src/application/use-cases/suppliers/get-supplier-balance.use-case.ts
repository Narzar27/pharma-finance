import { inject, Injectable } from '@angular/core';
import { InvoiceRepository } from '../../../domain/repositories/invoice.repository';

export interface SupplierBalance {
  supplierId: string;
  unpaidUsd: number;
  unpaidLbp: number;
}

@Injectable({ providedIn: 'root' })
export class GetSupplierBalanceUseCase {
  private invoiceRepo = inject(InvoiceRepository);

  async execute(supplierId: string): Promise<SupplierBalance> {
    const invoices = await this.invoiceRepo.getAll({
      supplierId,
      status: 'unpaid',
    });
    const partial = await this.invoiceRepo.getAll({
      supplierId,
      status: 'partial',
    });
    const all = [...invoices, ...partial];

    return all.reduce(
      (acc, inv) => {
        if (inv.currency === 'USD') acc.unpaidUsd += inv.amount;
        else acc.unpaidLbp += inv.amount;
        return acc;
      },
      { supplierId, unpaidUsd: 0, unpaidLbp: 0 }
    );
  }
}

import { inject, Injectable } from '@angular/core';
import { InvoiceRepository } from '../../../domain/repositories/invoice.repository';
import { Invoice, InvoiceFilter } from '../../../domain/models/invoice.model';

@Injectable({ providedIn: 'root' })
export class ListInvoicesUseCase {
  private repo = inject(InvoiceRepository);

  execute(filter?: InvoiceFilter): Promise<Invoice[]> {
    return this.repo.getAll(filter);
  }
}

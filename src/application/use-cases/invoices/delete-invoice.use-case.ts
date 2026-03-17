import { inject, Injectable } from '@angular/core';
import { InvoiceRepository } from '../../../domain/repositories/invoice.repository';

@Injectable({ providedIn: 'root' })
export class DeleteInvoiceUseCase {
  private invoiceRepo = inject(InvoiceRepository);
  execute(id: string): Promise<void> { return this.invoiceRepo.delete(id); }
}

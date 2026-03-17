import { inject, Injectable } from '@angular/core';
import { InvoiceRepository } from '../../../domain/repositories/invoice.repository';
import { CreateInvoiceDto, Invoice } from '../../../domain/models/invoice.model';

@Injectable({ providedIn: 'root' })
export class CreateInvoiceUseCase {
  private repo = inject(InvoiceRepository);

  execute(dto: CreateInvoiceDto): Promise<Invoice> {
    return this.repo.create(dto);
  }
}

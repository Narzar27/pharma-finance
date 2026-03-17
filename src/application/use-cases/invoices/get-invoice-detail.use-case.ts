import { inject, Injectable } from '@angular/core';
import { InvoiceRepository } from '../../../domain/repositories/invoice.repository';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { Invoice } from '../../../domain/models/invoice.model';
import { Payment } from '../../../domain/models/payment.model';

export interface InvoiceDetail {
  invoice: Invoice;
  payments: Payment[];
  totalPaid: { usd: number; lbp: number };
}

@Injectable({ providedIn: 'root' })
export class GetInvoiceDetailUseCase {
  private invoiceRepo = inject(InvoiceRepository);
  private paymentRepo = inject(PaymentRepository);

  async execute(invoiceId: string): Promise<InvoiceDetail | null> {
    const [invoice, payments, totalPaid] = await Promise.all([
      this.invoiceRepo.getById(invoiceId),
      this.paymentRepo.getByInvoiceId(invoiceId),
      this.paymentRepo.getTotalPaidForInvoice(invoiceId),
    ]);
    if (!invoice) return null;
    return { invoice, payments, totalPaid };
  }
}

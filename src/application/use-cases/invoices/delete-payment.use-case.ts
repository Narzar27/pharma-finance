import { inject, Injectable } from '@angular/core';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { InvoiceRepository } from '../../../domain/repositories/invoice.repository';
import { calculateInvoiceStatus } from '../../../domain/services/invoice-status.service';

@Injectable({ providedIn: 'root' })
export class DeletePaymentUseCase {
  private paymentRepo = inject(PaymentRepository);
  private invoiceRepo = inject(InvoiceRepository);

  async execute(paymentId: string, invoiceId: string): Promise<void> {
    await this.paymentRepo.delete(paymentId);

    // Recalculate invoice status after deletion
    const invoice = await this.invoiceRepo.getById(invoiceId);
    if (invoice) {
      const totals = await this.paymentRepo.getTotalPaidForInvoice(invoiceId);
      const totalPaidSameCurrency = invoice.currency === 'USD' ? totals.usd : totals.lbp;
      const newStatus = calculateInvoiceStatus(invoice.amount, totalPaidSameCurrency);
      await this.invoiceRepo.updateStatus(invoiceId, newStatus);
    }
  }
}

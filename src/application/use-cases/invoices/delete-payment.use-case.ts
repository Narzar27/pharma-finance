import { inject, Injectable } from '@angular/core';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { InvoiceRepository } from '../../../domain/repositories/invoice.repository';
import { calculateInvoiceStatus, toInvoiceCurrency } from '../../../domain/services/invoice-status.service';

@Injectable({ providedIn: 'root' })
export class DeletePaymentUseCase {
  private paymentRepo = inject(PaymentRepository);
  private invoiceRepo = inject(InvoiceRepository);

  async execute(paymentId: string, invoiceId: string): Promise<void> {
    // Deleting the payment also deletes its linked expense record (DB cascade).
    await this.paymentRepo.delete(paymentId);

    // Recalculate invoice status across the remaining payments.
    const invoice = await this.invoiceRepo.getById(invoiceId);
    if (invoice) {
      const payments = await this.paymentRepo.getByInvoiceId(invoiceId);
      const totalPaidInInvoiceCurrency = payments.reduce(
        (sum, p) => sum + toInvoiceCurrency(p, invoice.currency),
        0
      );
      const newStatus = calculateInvoiceStatus(invoice.amount, totalPaidInInvoiceCurrency);
      await this.invoiceRepo.updateStatus(invoiceId, newStatus);
    }
  }
}

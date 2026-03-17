import { inject, Injectable } from '@angular/core';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { InvoiceRepository } from '../../../domain/repositories/invoice.repository';
import { CreatePaymentDto, Payment } from '../../../domain/models/payment.model';
import { calculateInvoiceStatus } from '../../../domain/services/invoice-status.service';

@Injectable({ providedIn: 'root' })
export class AddPaymentUseCase {
  private paymentRepo = inject(PaymentRepository);
  private invoiceRepo = inject(InvoiceRepository);

  async execute(dto: CreatePaymentDto): Promise<Payment> {
    const payment = await this.paymentRepo.create(dto);

    // Recalculate and update invoice status
    const invoice = await this.invoiceRepo.getById(dto.invoiceId);
    if (invoice) {
      const totals = await this.paymentRepo.getTotalPaidForInvoice(dto.invoiceId);
      // Compare same-currency totals to invoice amount
      const totalPaidSameCurrency =
        invoice.currency === 'USD' ? totals.usd : totals.lbp;
      const newStatus = calculateInvoiceStatus(invoice.amount, totalPaidSameCurrency);
      await this.invoiceRepo.updateStatus(dto.invoiceId, newStatus);
    }

    return payment;
  }
}

import { inject, Injectable } from '@angular/core';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { InvoiceRepository } from '../../../domain/repositories/invoice.repository';
import { IncomeRecordRepository } from '../../../domain/repositories/income-record.repository';
import { CreatePaymentDto, Payment } from '../../../domain/models/payment.model';
import { calculateInvoiceStatus, toInvoiceCurrency } from '../../../domain/services/invoice-status.service';

@Injectable({ providedIn: 'root' })
export class AddPaymentUseCase {
  private paymentRepo = inject(PaymentRepository);
  private invoiceRepo = inject(InvoiceRepository);
  private incomeRepo = inject(IncomeRecordRepository);

  async execute(dto: CreatePaymentDto): Promise<Payment> {
    const payment = await this.paymentRepo.create(dto);

    const invoice = await this.invoiceRepo.getById(dto.invoiceId);
    if (invoice) {
      // Recalculate status across every payment on this invoice, converting
      // any cross-currency payment into the invoice's own currency first.
      const payments = await this.paymentRepo.getByInvoiceId(dto.invoiceId);
      const totalPaidInInvoiceCurrency = payments.reduce(
        (sum, p) => sum + toInvoiceCurrency(p, invoice.currency),
        0
      );
      const newStatus = calculateInvoiceStatus(invoice.amount, totalPaidInInvoiceCurrency);
      await this.invoiceRepo.updateStatus(dto.invoiceId, newStatus);

      // A paid invoice is a real cash outflow on the day it was paid —
      // record it as an expense, linked back to this payment so deleting
      // the payment removes the expense too (DB cascade).
      await this.incomeRepo.create({
        amount: dto.amountPaid,
        currency: dto.currency,
        date: dto.paymentDate,
        type: 'expense',
        source: invoice.supplierName ?? 'Supplier payment',
        notes: `Payment for invoice (${invoice.amount} ${invoice.currency})`,
        paymentId: payment.id,
      });
    }

    return payment;
  }
}

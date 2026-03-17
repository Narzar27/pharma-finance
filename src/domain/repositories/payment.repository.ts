import { Payment, CreatePaymentDto } from '../models/payment.model';

export abstract class PaymentRepository {
  abstract getByInvoiceId(invoiceId: string): Promise<Payment[]>;
  abstract create(dto: CreatePaymentDto): Promise<Payment>;
  abstract delete(id: string): Promise<void>;
  abstract getTotalPaidForInvoice(invoiceId: string): Promise<{ usd: number; lbp: number }>;
  abstract getAllTotals(): Promise<Map<string, { usd: number; lbp: number }>>;
}

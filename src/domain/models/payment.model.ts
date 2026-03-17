import { Currency } from './invoice.model';

export interface Payment {
  id: string;
  invoiceId: string;
  amountPaid: number;
  currency: Currency;
  paymentDate: string;
  notes?: string;
  createdAt: string;
}

export interface CreatePaymentDto {
  invoiceId: string;
  amountPaid: number;
  currency: Currency;
  paymentDate: string;
  notes?: string;
}

import { Currency } from './invoice.model';

export interface Payment {
  id: string;
  invoiceId: string;
  amountPaid: number;
  currency: Currency;
  paymentDate: string;
  /** Only set when this payment's currency differs from its invoice's currency:
   *  how many units of the invoice's currency one unit of this payment's
   *  currency is worth, e.g. paying an LBP invoice in USD. */
  exchangeRate?: number;
  notes?: string;
  createdAt: string;
}

export interface CreatePaymentDto {
  invoiceId: string;
  amountPaid: number;
  currency: Currency;
  paymentDate: string;
  exchangeRate?: number;
  notes?: string;
}

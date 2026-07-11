import { Currency } from './invoice.model';

export type RecordType = 'income' | 'expense';

export interface IncomeRecord {
  id: string;
  amount: number;
  currency: Currency;
  date: string;
  type: RecordType;
  source?: string;
  notes?: string;
  createdAt: string;
  /** Set when this expense was auto-generated from an invoice payment.
   *  Deleting the payment deletes this record too (DB cascade) — it
   *  shouldn't be deleted independently from the Income page. */
  paymentId?: string;
}

export interface CreateIncomeRecordDto {
  amount: number;
  currency: Currency;
  date: string;
  type: RecordType;
  source?: string;
  notes?: string;
  paymentId?: string;
}

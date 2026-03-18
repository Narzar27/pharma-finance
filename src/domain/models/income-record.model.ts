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
}

export interface CreateIncomeRecordDto {
  amount: number;
  currency: Currency;
  date: string;
  type: RecordType;
  source?: string;
  notes?: string;
}

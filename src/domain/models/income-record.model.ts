import { Currency } from './invoice.model';

export interface IncomeRecord {
  id: string;
  amount: number;
  currency: Currency;
  date: string;
  source?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateIncomeRecordDto {
  amount: number;
  currency: Currency;
  date: string;
  source?: string;
  notes?: string;
}

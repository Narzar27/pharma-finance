import { IncomeRecord, CreateIncomeRecordDto } from '../models/income-record.model';

export abstract class IncomeRecordRepository {
  abstract getAll(dateFrom?: string, dateTo?: string): Promise<IncomeRecord[]>;
  abstract create(dto: CreateIncomeRecordDto): Promise<IncomeRecord>;
  abstract delete(id: string): Promise<void>;
  abstract getTotals(dateFrom?: string, dateTo?: string): Promise<{
    income: { usd: number; lbp: number };
    expense: { usd: number; lbp: number };
  }>;
}

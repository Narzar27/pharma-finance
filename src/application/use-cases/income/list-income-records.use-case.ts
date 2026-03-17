import { inject, Injectable } from '@angular/core';
import { IncomeRecordRepository } from '../../../domain/repositories/income-record.repository';
import { IncomeRecord } from '../../../domain/models/income-record.model';

@Injectable({ providedIn: 'root' })
export class ListIncomeRecordsUseCase {
  private repo = inject(IncomeRecordRepository);

  execute(dateFrom?: string, dateTo?: string): Promise<IncomeRecord[]> {
    return this.repo.getAll(dateFrom, dateTo);
  }
}

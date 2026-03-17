import { inject, Injectable } from '@angular/core';
import { IncomeRecordRepository } from '../../../domain/repositories/income-record.repository';

@Injectable({ providedIn: 'root' })
export class DeleteIncomeRecordUseCase {
  private incomeRepo = inject(IncomeRecordRepository);
  execute(id: string): Promise<void> { return this.incomeRepo.delete(id); }
}

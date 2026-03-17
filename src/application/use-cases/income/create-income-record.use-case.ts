import { inject, Injectable } from '@angular/core';
import { IncomeRecordRepository } from '../../../domain/repositories/income-record.repository';
import { CreateIncomeRecordDto, IncomeRecord } from '../../../domain/models/income-record.model';

@Injectable({ providedIn: 'root' })
export class CreateIncomeRecordUseCase {
  private repo = inject(IncomeRecordRepository);

  execute(dto: CreateIncomeRecordDto): Promise<IncomeRecord> {
    return this.repo.create(dto);
  }
}

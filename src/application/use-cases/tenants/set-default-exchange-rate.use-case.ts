import { inject, Injectable } from '@angular/core';
import { TenantRepository } from '../../../domain/repositories/tenant.repository';
import { Tenant } from '../../../domain/models/tenant.model';

@Injectable({ providedIn: 'root' })
export class SetDefaultExchangeRateUseCase {
  private repo = inject(TenantRepository);

  execute(id: string, rate: number | null): Promise<Tenant> {
    return this.repo.setDefaultExchangeRate(id, rate);
  }
}

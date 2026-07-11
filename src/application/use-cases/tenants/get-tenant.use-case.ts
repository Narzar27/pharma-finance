import { inject, Injectable } from '@angular/core';
import { TenantRepository } from '../../../domain/repositories/tenant.repository';
import { Tenant } from '../../../domain/models/tenant.model';

@Injectable({ providedIn: 'root' })
export class GetTenantUseCase {
  private repo = inject(TenantRepository);

  execute(id: string): Promise<Tenant | null> {
    return this.repo.getById(id);
  }
}

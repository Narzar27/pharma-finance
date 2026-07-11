import { inject, Injectable } from '@angular/core';
import { TenantRepository } from '../../../domain/repositories/tenant.repository';
import { Tenant } from '../../../domain/models/tenant.model';

@Injectable({ providedIn: 'root' })
export class RenameTenantUseCase {
  private repo = inject(TenantRepository);

  execute(id: string, name: string): Promise<Tenant> {
    return this.repo.rename(id, name);
  }
}

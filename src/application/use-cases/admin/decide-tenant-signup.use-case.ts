import { inject, Injectable } from '@angular/core';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';

@Injectable({ providedIn: 'root' })
export class DecideTenantSignupUseCase {
  private repo = inject(TenantMemberRepository);

  execute(tenantId: string, approve: boolean): Promise<void> {
    return this.repo.decideTenantSignup(tenantId, approve);
  }
}

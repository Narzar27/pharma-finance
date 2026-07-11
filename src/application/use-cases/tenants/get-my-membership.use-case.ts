import { inject, Injectable } from '@angular/core';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';
import { TenantMember } from '../../../domain/models/tenant-member.model';

@Injectable({ providedIn: 'root' })
export class GetMyMembershipUseCase {
  private repo = inject(TenantMemberRepository);

  execute(): Promise<TenantMember | null> {
    return this.repo.getMyMembership();
  }
}

import { inject, Injectable } from '@angular/core';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';
import { TenantMember } from '../../../domain/models/tenant-member.model';

@Injectable({ providedIn: 'root' })
export class ListTeamMembersUseCase {
  private repo = inject(TenantMemberRepository);

  execute(tenantId: string): Promise<TenantMember[]> {
    return this.repo.listTeam(tenantId);
  }
}

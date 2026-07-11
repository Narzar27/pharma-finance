import { inject, Injectable } from '@angular/core';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';
import { TenantMember } from '../../../domain/models/tenant-member.model';

@Injectable({ providedIn: 'root' })
export class DecideTeammateRequestUseCase {
  private repo = inject(TenantMemberRepository);

  async execute(memberId: string, approve: boolean): Promise<{ member: TenantMember; inviteResult?: { ok: boolean; error?: string } }> {
    const member = await this.repo.decideTeammateRequest(memberId, approve);
    if (!approve) return { member };
    const inviteResult = await this.repo.sendTeammateInvite(memberId);
    return { member, inviteResult };
  }
}

import { inject, Injectable } from '@angular/core';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';

@Injectable({ providedIn: 'root' })
export class ResendTeammateInviteUseCase {
  private repo = inject(TenantMemberRepository);

  execute(memberId: string): Promise<{ ok: boolean; error?: string }> {
    return this.repo.sendTeammateInvite(memberId);
  }
}

import { inject, Injectable } from '@angular/core';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';
import { PendingApprovalItem } from '../../../domain/models/tenant-member.model';

@Injectable({ providedIn: 'root' })
export class ListPendingApprovalsUseCase {
  private repo = inject(TenantMemberRepository);

  execute(): Promise<PendingApprovalItem[]> {
    return this.repo.listPendingApprovals();
  }
}

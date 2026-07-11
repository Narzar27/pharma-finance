import { inject, Injectable } from '@angular/core';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';
import { AddTeammateDto, TenantMember } from '../../../domain/models/tenant-member.model';

@Injectable({ providedIn: 'root' })
export class RequestAddTeammateUseCase {
  private repo = inject(TenantMemberRepository);

  execute(dto: AddTeammateDto): Promise<TenantMember> {
    return this.repo.requestAddTeammate(dto);
  }
}

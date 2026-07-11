import { inject, Injectable } from '@angular/core';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';
import { SignupBusinessDto, TenantMember } from '../../../domain/models/tenant-member.model';

@Injectable({ providedIn: 'root' })
export class SignupBusinessUseCase {
  private repo = inject(TenantMemberRepository);

  execute(dto: SignupBusinessDto): Promise<TenantMember> {
    return this.repo.signupBusiness(dto);
  }
}

import { TestBed } from '@angular/core/testing';
import { SignupBusinessUseCase } from './signup-business.use-case';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';
import { TenantMember } from '../../../domain/models/tenant-member.model';

describe('SignupBusinessUseCase', () => {
  it('delegates to the repository and returns the created member', async () => {
    const fakeMember: TenantMember = {
      id: 'm1', tenantId: 't1', userId: 'u1', email: 'a@b.com',
      firstName: 'A', lastName: 'B', dob: '1990-01-01',
      role: 'owner', status: 'pending', invitedBy: null,
      createdAt: '2026-01-01', decidedAt: null, decidedBy: null,
    };
    const fakeRepo = { signupBusiness: jasmine.createSpy().and.resolveTo(fakeMember) };

    TestBed.configureTestingModule({
      providers: [{ provide: TenantMemberRepository, useValue: fakeRepo }],
    });
    const useCase = TestBed.inject(SignupBusinessUseCase);

    const result = await useCase.execute({ businessName: 'Acme', firstName: 'A', lastName: 'B', dob: '1990-01-01' });

    expect(result).toEqual(fakeMember);
    expect(fakeRepo.signupBusiness).toHaveBeenCalledWith({ businessName: 'Acme', firstName: 'A', lastName: 'B', dob: '1990-01-01' });
  });
});

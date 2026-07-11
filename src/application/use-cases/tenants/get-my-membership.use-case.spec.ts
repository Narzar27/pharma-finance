import { TestBed } from '@angular/core/testing';
import { GetMyMembershipUseCase } from './get-my-membership.use-case';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';

describe('GetMyMembershipUseCase', () => {
  it('returns null when there is no membership', async () => {
    const fakeRepo = { getMyMembership: jasmine.createSpy().and.resolveTo(null) };
    TestBed.configureTestingModule({ providers: [{ provide: TenantMemberRepository, useValue: fakeRepo }] });
    const useCase = TestBed.inject(GetMyMembershipUseCase);

    expect(await useCase.execute()).toBeNull();
  });
});

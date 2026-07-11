import { TestBed } from '@angular/core/testing';
import { RequestAddTeammateUseCase } from './request-add-teammate.use-case';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';

describe('RequestAddTeammateUseCase', () => {
  it('delegates to the repository', async () => {
    const dto = { tenantId: 't1', email: 'a@b.com', firstName: 'A', lastName: 'B', dob: '1990-01-01', role: 'user' as const };
    const fakeMember = { id: 'm1', tenantId: 't1', userId: null, email: 'a@b.com', firstName: 'A', lastName: 'B', dob: '1990-01-01', role: 'user' as const, status: 'pending' as const, invitedBy: 'owner1', createdAt: '2026-01-01', decidedAt: null, decidedBy: null };
    const fakeRepo = { requestAddTeammate: jasmine.createSpy().and.resolveTo(fakeMember) };
    TestBed.configureTestingModule({ providers: [{ provide: TenantMemberRepository, useValue: fakeRepo }] });

    const result = await TestBed.inject(RequestAddTeammateUseCase).execute(dto);

    expect(fakeRepo.requestAddTeammate).toHaveBeenCalledWith(dto);
    expect(result).toEqual(fakeMember);
  });
});

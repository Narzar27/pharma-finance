import { TestBed } from '@angular/core/testing';
import { ListPendingApprovalsUseCase } from './list-pending-approvals.use-case';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';

describe('ListPendingApprovalsUseCase', () => {
  it('returns whatever the repository provides', async () => {
    const items = [{ kind: 'business' as const, tenant: { id: 't1', name: 'Acme', status: 'pending' as const, createdAt: '2026-01-01' }, member: { id: 'm1', tenantId: 't1', userId: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', dob: '1990-01-01', role: 'owner' as const, status: 'pending' as const, invitedBy: null, createdAt: '2026-01-01', decidedAt: null, decidedBy: null } }];
    const fakeRepo = { listPendingApprovals: jasmine.createSpy().and.resolveTo(items) };
    TestBed.configureTestingModule({ providers: [{ provide: TenantMemberRepository, useValue: fakeRepo }] });

    const result = await TestBed.inject(ListPendingApprovalsUseCase).execute();

    expect(result).toEqual(items);
  });
});

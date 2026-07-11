import { TestBed } from '@angular/core/testing';
import { DecideTeammateRequestUseCase } from './decide-teammate-request.use-case';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';
import { TenantMember } from '../../../domain/models/tenant-member.model';

describe('DecideTeammateRequestUseCase', () => {
  const invitedMember: TenantMember = {
    id: 'm1', tenantId: 't1', userId: null, email: 'a@b.com',
    firstName: 'A', lastName: 'B', dob: '1990-01-01',
    role: 'user', status: 'invited', invitedBy: 'owner1',
    createdAt: '2026-01-01', decidedAt: '2026-01-02', decidedBy: 'admin1',
  };

  it('sends an invite when the decision is approve', async () => {
    const fakeRepo = {
      decideTeammateRequest: jasmine.createSpy().and.resolveTo(invitedMember),
      sendTeammateInvite: jasmine.createSpy().and.resolveTo({ ok: true }),
    };
    TestBed.configureTestingModule({ providers: [{ provide: TenantMemberRepository, useValue: fakeRepo }] });

    const result = await TestBed.inject(DecideTeammateRequestUseCase).execute('m1', true);

    expect(fakeRepo.decideTeammateRequest).toHaveBeenCalledWith('m1', true);
    expect(fakeRepo.sendTeammateInvite).toHaveBeenCalledWith('m1');
    expect(result.inviteResult).toEqual({ ok: true });
  });

  it('does not send an invite when the decision is reject', async () => {
    const rejected = { ...invitedMember, status: 'rejected' as const };
    const fakeRepo = {
      decideTeammateRequest: jasmine.createSpy().and.resolveTo(rejected),
      sendTeammateInvite: jasmine.createSpy(),
    };
    TestBed.configureTestingModule({ providers: [{ provide: TenantMemberRepository, useValue: fakeRepo }] });

    const result = await TestBed.inject(DecideTeammateRequestUseCase).execute('m1', false);

    expect(fakeRepo.sendTeammateInvite).not.toHaveBeenCalled();
    expect(result.inviteResult).toBeUndefined();
  });
});

import { resolveAccessRoute, canManageTeam } from './membership-access.service';
import { TenantMember } from '../models/tenant-member.model';

function member(overrides: Partial<TenantMember>): TenantMember {
  return {
    id: 'm1', tenantId: 't1', userId: 'u1', email: 'a@b.com',
    firstName: 'A', lastName: 'B', dob: '1990-01-01',
    role: 'user', status: 'active', invitedBy: null,
    createdAt: '2026-01-01', decidedAt: null, decidedBy: null,
    ...overrides,
  };
}

describe('resolveAccessRoute', () => {
  it('sends a user with no membership row to /signup', () => {
    expect(resolveAccessRoute(null)).toBe('/signup');
  });

  it('sends a pending member to /pending', () => {
    expect(resolveAccessRoute(member({ status: 'pending' }))).toBe('/pending');
  });

  it('sends an invited-but-not-logged-in-yet member to /pending', () => {
    expect(resolveAccessRoute(member({ status: 'invited' }))).toBe('/pending');
  });

  it('sends a rejected member to /rejected', () => {
    expect(resolveAccessRoute(member({ status: 'rejected' }))).toBe('/rejected');
  });

  it('allows an active member through (returns null)', () => {
    expect(resolveAccessRoute(member({ status: 'active' }))).toBeNull();
  });
});

describe('canManageTeam', () => {
  it('allows owner', () => expect(canManageTeam('owner')).toBe(true));
  it('allows admin', () => expect(canManageTeam('admin')).toBe(true));
  it('disallows manager', () => expect(canManageTeam('manager')).toBe(false));
  it('disallows user', () => expect(canManageTeam('user')).toBe(false));
});

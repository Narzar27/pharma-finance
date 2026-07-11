import { TenantMember, MemberRole } from '../models/tenant-member.model';

export function resolveAccessRoute(member: TenantMember | null): '/signup' | '/pending' | '/rejected' | null {
  if (!member) return '/signup';
  if (member.status === 'pending' || member.status === 'invited') return '/pending';
  if (member.status === 'rejected') return '/rejected';
  return null;
}

export function canManageTeam(role: MemberRole): boolean {
  return role === 'owner' || role === 'admin';
}

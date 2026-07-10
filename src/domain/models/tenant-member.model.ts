import { Tenant } from './tenant.model';

export type MemberRole = 'owner' | 'admin' | 'manager' | 'user';
export type MemberStatus = 'pending' | 'invited' | 'active' | 'rejected';

export interface TenantMember {
  id: string;
  tenantId: string;
  userId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  dob: string;
  role: MemberRole;
  status: MemberStatus;
  invitedBy: string | null;
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
}

export interface SignupBusinessDto {
  businessName: string;
  firstName: string;
  lastName: string;
  dob: string;
}

export interface AddTeammateDto {
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  dob: string;
  role: Exclude<MemberRole, 'owner'>;
}

export interface PendingApprovalItem {
  kind: 'business' | 'teammate';
  tenant: Tenant;
  member: TenantMember;
}

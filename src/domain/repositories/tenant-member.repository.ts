import { TenantMember, SignupBusinessDto, AddTeammateDto, PendingApprovalItem } from '../models/tenant-member.model';

export abstract class TenantMemberRepository {
  abstract signupBusiness(dto: SignupBusinessDto): Promise<TenantMember>;
  abstract getMyMembership(): Promise<TenantMember | null>;
  abstract claimInvitedMembership(memberId: string): Promise<void>;
  abstract listTeam(tenantId: string): Promise<TenantMember[]>;
  abstract requestAddTeammate(dto: AddTeammateDto): Promise<TenantMember>;
  abstract listPendingApprovals(): Promise<PendingApprovalItem[]>;
  abstract decideTenantSignup(tenantId: string, approve: boolean): Promise<void>;
  abstract decideTeammateRequest(memberId: string, approve: boolean): Promise<TenantMember>;
  abstract sendTeammateInvite(memberId: string): Promise<{ ok: boolean; error?: string }>;
}

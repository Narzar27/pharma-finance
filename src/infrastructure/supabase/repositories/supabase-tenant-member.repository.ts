import { Injectable } from '@angular/core';
import { TenantMemberRepository } from '../../../domain/repositories/tenant-member.repository';
import {
  TenantMember, SignupBusinessDto, AddTeammateDto, PendingApprovalItem,
} from '../../../domain/models/tenant-member.model';
import { getSupabaseClient } from '../supabase.client';

@Injectable({ providedIn: 'root' })
export class SupabaseTenantMemberRepository extends TenantMemberRepository {
  private get db() { return getSupabaseClient(); }

  async signupBusiness(dto: SignupBusinessDto): Promise<TenantMember> {
    const { data, error } = await this.db.rpc('create_tenant_signup', {
      p_business_name: dto.businessName,
      p_first_name: dto.firstName,
      p_last_name: dto.lastName,
      p_dob: dto.dob,
    });
    if (error) throw error;
    return this.map(data);
  }

  async getMyMembership(): Promise<TenantMember | null> {
    const { data: userData } = await this.db.auth.getUser();
    const userId = userData.user?.id;
    const email = userData.user?.email;
    if (!userId) return null;

    const byUserId = await this.db.from('tenant_members').select('*').eq('user_id', userId).maybeSingle();
    if (byUserId.data) return this.map(byUserId.data);

    if (email) {
      const byEmail = await this.db
        .from('tenant_members').select('*').eq('email', email).eq('status', 'invited').is('user_id', null).maybeSingle();
      if (byEmail.data) {
        await this.claimInvitedMembership(byEmail.data.id);
        const claimed = await this.db.from('tenant_members').select('*').eq('id', byEmail.data.id).single();
        return this.map(claimed.data);
      }
    }
    return null;
  }

  async claimInvitedMembership(memberId: string): Promise<void> {
    const { error } = await this.db.rpc('claim_invited_membership', { p_member_id: memberId });
    if (error) throw error;
  }

  async listTeam(tenantId: string): Promise<TenantMember[]> {
    const { data, error } = await this.db
      .from('tenant_members').select('*').eq('tenant_id', tenantId).order('created_at');
    if (error) throw error;
    return (data ?? []).map(this.map);
  }

  async requestAddTeammate(dto: AddTeammateDto): Promise<TenantMember> {
    const { data, error } = await this.db.rpc('request_add_teammate', {
      p_tenant_id: dto.tenantId,
      p_email: dto.email,
      p_first_name: dto.firstName,
      p_last_name: dto.lastName,
      p_dob: dto.dob,
      p_role: dto.role,
    });
    if (error) throw error;
    return this.map(data);
  }

  async listPendingApprovals(): Promise<PendingApprovalItem[]> {
    const { data, error } = await this.db
      .from('tenant_members')
      .select('*, tenants(*)')
      .in('status', ['pending'])
      .order('created_at');
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      kind: row.role === 'owner' ? 'business' : 'teammate',
      tenant: { id: row.tenants.id, name: row.tenants.name, status: row.tenants.status, createdAt: row.tenants.created_at },
      member: this.map(row),
    }));
  }

  async decideTenantSignup(tenantId: string, approve: boolean): Promise<void> {
    const { error } = await this.db.rpc('decide_tenant_signup', { p_tenant_id: tenantId, p_approve: approve });
    if (error) throw error;
  }

  async decideTeammateRequest(memberId: string, approve: boolean): Promise<TenantMember> {
    const { data, error } = await this.db.rpc('decide_teammate_request', { p_member_id: memberId, p_approve: approve });
    if (error) throw error;
    return this.map(data);
  }

  async sendTeammateInvite(memberId: string): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await this.db.functions.invoke('send-teammate-invite', { body: { memberId } });
    if (error) return { ok: false, error: error.message };
    return data as { ok: boolean; error?: string };
  }

  private map(row: any): TenantMember {
    return {
      id: row.id, tenantId: row.tenant_id, userId: row.user_id, email: row.email,
      firstName: row.first_name, lastName: row.last_name, dob: row.dob,
      role: row.role, status: row.status, invitedBy: row.invited_by,
      createdAt: row.created_at, decidedAt: row.decided_at, decidedBy: row.decided_by,
    };
  }
}

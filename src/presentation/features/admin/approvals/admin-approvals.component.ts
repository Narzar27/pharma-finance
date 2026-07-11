import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { TopBarComponent } from '../../../core/layout/top-bar/top-bar.component';
import { ListPendingApprovalsUseCase } from '../../../../application/use-cases/admin/list-pending-approvals.use-case';
import { DecideTenantSignupUseCase } from '../../../../application/use-cases/admin/decide-tenant-signup.use-case';
import { DecideTeammateRequestUseCase } from '../../../../application/use-cases/admin/decide-teammate-request.use-case';
import { PendingApprovalItem } from '../../../../domain/models/tenant-member.model';

interface DecidedItem extends PendingApprovalItem {
  outcome: 'approved' | 'rejected';
  inviteFailed?: boolean;
}

@Component({
  selector: 'app-admin-approvals',
  standalone: true,
  imports: [TopBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-approvals.component.html',
})
export class AdminApprovalsComponent implements OnInit {
  private listPending = inject(ListPendingApprovalsUseCase);
  private decideTenantSignup = inject(DecideTenantSignupUseCase);
  private decideTeammateRequest = inject(DecideTeammateRequestUseCase);

  loading = signal(true);
  actingOn = signal<string | null>(null);
  pending = signal<PendingApprovalItem[]>([]);
  decided = signal<DecidedItem[]>([]);

  hasPending = computed(() => this.pending().length > 0);

  async ngOnInit() {
    await this.load();
  }

  private async load() {
    this.loading.set(true);
    this.pending.set(await this.listPending.execute());
    this.loading.set(false);
  }

  async decide(item: PendingApprovalItem, approve: boolean) {
    this.actingOn.set(item.member.id);
    try {
      if (item.kind === 'business') {
        await this.decideTenantSignup.execute(item.tenant.id, approve);
        this.decided.update(list => [{ ...item, outcome: approve ? 'approved' : 'rejected' }, ...list]);
      } else {
        const { inviteResult } = await this.decideTeammateRequest.execute(item.member.id, approve);
        this.decided.update(list => [
          { ...item, outcome: approve ? 'approved' : 'rejected', inviteFailed: approve && inviteResult?.ok === false },
          ...list,
        ]);
      }
      this.pending.update(list => list.filter(p => p.member.id !== item.member.id));
    } catch (e: any) {
      alert(e?.message ?? 'This request was already handled.');
      await this.load();
    } finally {
      this.actingOn.set(null);
    }
  }

  async resendInvite(item: DecidedItem) {
    this.actingOn.set(item.member.id);
    const { inviteResult } = await this.decideTeammateRequest.execute(item.member.id, true);
    this.decided.update(list =>
      list.map(d => d.member.id === item.member.id ? { ...d, inviteFailed: inviteResult?.ok === false } : d)
    );
    this.actingOn.set(null);
  }
}

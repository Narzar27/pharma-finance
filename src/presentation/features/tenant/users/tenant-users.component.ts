import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopBarComponent } from '../../../core/layout/top-bar/top-bar.component';
import { CurrentTenantService } from '../../../core/tenant/current-tenant.service';
import { ListTeamMembersUseCase } from '../../../../application/use-cases/tenants/list-team-members.use-case';
import { RequestAddTeammateUseCase } from '../../../../application/use-cases/tenants/request-add-teammate.use-case';
import { canManageTeam } from '../../../../domain/services/membership-access.service';
import { TenantMember, MemberRole } from '../../../../domain/models/tenant-member.model';

@Component({
  selector: 'app-tenant-users',
  standalone: true,
  imports: [FormsModule, TopBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tenant-users.component.html',
})
export class TenantUsersComponent implements OnInit {
  private listTeam = inject(ListTeamMembersUseCase);
  private requestAddTeammate = inject(RequestAddTeammateUseCase);
  tenant = inject(CurrentTenantService);

  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  error = signal('');
  members = signal<TenantMember[]>([]);

  canManage = computed(() => {
    const role = this.tenant.membership()?.role;
    return role ? canManageTeam(role) : false;
  });

  form = { email: '', firstName: '', lastName: '', dob: '', role: 'user' as Exclude<MemberRole, 'owner'> };

  async ngOnInit() {
    const tenantId = this.tenant.membership()?.tenantId;
    if (tenantId) this.members.set(await this.listTeam.execute(tenantId));
    this.loading.set(false);
  }

  async onSubmit() {
    const tenantId = this.tenant.membership()?.tenantId;
    if (!tenantId) return;
    this.saving.set(true);
    this.error.set('');
    try {
      await this.requestAddTeammate.execute({ tenantId, ...this.form });
      this.showForm.set(false);
      this.members.set(await this.listTeam.execute(tenantId));
      this.form = { email: '', firstName: '', lastName: '', dob: '', role: 'user' };
    } catch (e: any) {
      this.error.set(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }

  closeIfBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) this.showForm.set(false);
  }
}

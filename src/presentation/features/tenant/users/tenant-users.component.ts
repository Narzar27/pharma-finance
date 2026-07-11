import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopBarComponent } from '../../../core/layout/top-bar/top-bar.component';
import { CurrentTenantService } from '../../../core/tenant/current-tenant.service';
import { ListTeamMembersUseCase } from '../../../../application/use-cases/tenants/list-team-members.use-case';
import { RequestAddTeammateUseCase } from '../../../../application/use-cases/tenants/request-add-teammate.use-case';
import { GetTenantUseCase } from '../../../../application/use-cases/tenants/get-tenant.use-case';
import { RenameTenantUseCase } from '../../../../application/use-cases/tenants/rename-tenant.use-case';
import { SetDefaultExchangeRateUseCase } from '../../../../application/use-cases/tenants/set-default-exchange-rate.use-case';
import { canManageTeam } from '../../../../domain/services/membership-access.service';
import { TenantMember, MemberRole } from '../../../../domain/models/tenant-member.model';
import { Tenant } from '../../../../domain/models/tenant.model';

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
  private getTenant = inject(GetTenantUseCase);
  private renameTenant = inject(RenameTenantUseCase);
  private setDefaultExchangeRate = inject(SetDefaultExchangeRateUseCase);
  tenant = inject(CurrentTenantService);

  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  error = signal('');
  members = signal<TenantMember[]>([]);

  business = signal<Tenant | null>(null);
  editingName = signal(false);
  nameDraft = '';
  renaming = signal(false);
  renameError = signal('');

  editingRate = signal(false);
  rateDraft: number | null = null;
  savingRate = signal(false);
  rateError = signal('');

  canManage = computed(() => {
    const role = this.tenant.membership()?.role;
    return role ? canManageTeam(role) : false;
  });

  form = { email: '', firstName: '', lastName: '', dob: '', role: 'user' as Exclude<MemberRole, 'owner'> };

  async ngOnInit() {
    const tenantId = this.tenant.membership()?.tenantId;
    if (tenantId) {
      const [members, business] = await Promise.all([
        this.listTeam.execute(tenantId),
        this.getTenant.execute(tenantId),
      ]);
      this.members.set(members);
      this.business.set(business);
    }
    this.loading.set(false);
  }

  startEditName() {
    this.nameDraft = this.business()?.name ?? '';
    this.renameError.set('');
    this.editingName.set(true);
  }

  cancelEditName() {
    this.editingName.set(false);
    this.renameError.set('');
  }

  async saveName() {
    const tenantId = this.tenant.membership()?.tenantId;
    if (!tenantId || !this.nameDraft.trim()) return;
    this.renaming.set(true);
    this.renameError.set('');
    try {
      const updated = await this.renameTenant.execute(tenantId, this.nameDraft);
      this.business.set(updated);
      this.editingName.set(false);
    } catch (e: any) {
      this.renameError.set(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      this.renaming.set(false);
    }
  }

  startEditRate() {
    this.rateDraft = this.business()?.defaultExchangeRate ?? null;
    this.rateError.set('');
    this.editingRate.set(true);
  }

  cancelEditRate() {
    this.editingRate.set(false);
    this.rateError.set('');
  }

  async saveRate() {
    const tenantId = this.tenant.membership()?.tenantId;
    if (!tenantId) return;
    this.savingRate.set(true);
    this.rateError.set('');
    try {
      const updated = await this.setDefaultExchangeRate.execute(tenantId, this.rateDraft);
      this.business.set(updated);
      this.editingRate.set(false);
    } catch (e: any) {
      this.rateError.set(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      this.savingRate.set(false);
    }
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

import { Injectable, signal } from '@angular/core';
import { GetMyMembershipUseCase } from '../../../application/use-cases/tenants/get-my-membership.use-case';
import { TenantMember } from '../../../domain/models/tenant-member.model';
import { inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CurrentTenantService {
  private getMyMembership = inject(GetMyMembershipUseCase);

  readonly membership = signal<TenantMember | null>(null);

  private _readyResolve!: () => void;
  readonly ready = new Promise<void>(resolve => { this._readyResolve = resolve; });
  private loaded = false;

  async refresh(): Promise<void> {
    const member = await this.getMyMembership.execute();
    this.membership.set(member);
    if (!this.loaded) {
      this.loaded = true;
      this._readyResolve();
    }
  }
}

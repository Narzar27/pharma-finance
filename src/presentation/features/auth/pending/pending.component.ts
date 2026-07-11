import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentTenantService } from '../../../core/tenant/current-tenant.service';

@Component({
  selector: 'app-pending',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pending.component.html',
})
export class PendingComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  tenant = inject(CurrentTenantService);

  isRejected = computed(() => this.router.url.startsWith('/rejected') || this.tenant.membership()?.status === 'rejected');

  constructor() {
    this.tenant.refresh();
  }

  signOut() {
    this.auth.signOut().then(() => this.router.navigate(['/login']));
  }
}

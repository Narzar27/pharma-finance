import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { CurrentTenantService } from '../tenant/current-tenant.service';

export const noActiveMembershipGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const tenant = inject(CurrentTenantService);
  const router = inject(Router);

  await auth.sessionReady;
  if (!auth.isAuthenticated()) return true;

  await tenant.refresh();
  if (tenant.membership()?.status === 'active') return router.createUrlTree(['/dashboard']);
  return true;
};

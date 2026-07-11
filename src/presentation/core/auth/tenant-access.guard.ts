import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { CurrentTenantService } from '../tenant/current-tenant.service';
import { resolveAccessRoute } from '../../../domain/services/membership-access.service';

export const tenantAccessGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const tenant = inject(CurrentTenantService);
  const router = inject(Router);

  await auth.sessionReady;
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);

  await tenant.refresh();
  const redirect = resolveAccessRoute(tenant.membership());
  if (redirect) return router.createUrlTree([redirect]);
  return true;
};

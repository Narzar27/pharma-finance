import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { CurrentTenantService } from '../tenant/current-tenant.service';

// Named for its broadened scope: redirects away from /signup whenever the
// user already has ANY tenant_members row (active, pending, or rejected),
// not just an active one. A pending/rejected user who reaches /dashboard
// is immediately redirected again by tenantAccessGuard to /pending or
// /rejected -- the net effect is they land on the correct holding page
// instead of being able to spam signup and create duplicate rows.
export const noExistingMembershipGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const tenant = inject(CurrentTenantService);
  const router = inject(Router);

  await auth.sessionReady;
  if (!auth.isAuthenticated()) return true;

  await tenant.refresh();
  if (tenant.membership()) return router.createUrlTree(['/dashboard']);
  return true;
};

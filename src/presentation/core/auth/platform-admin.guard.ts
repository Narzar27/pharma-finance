import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const platformAdminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.sessionReady;
  const isPlatformAdmin = (auth.user()?.app_metadata as Record<string, unknown>)?.['is_platform_admin'] === true;
  if (!isPlatformAdmin) return router.createUrlTree(['/dashboard']);
  return true;
};

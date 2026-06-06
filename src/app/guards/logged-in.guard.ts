import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const loggedInGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return true;

  const role = auth.getUserRole();
  router.navigate(role === 'ADMIN' ? ['/admin'] : ['/user']);
  return false;
};

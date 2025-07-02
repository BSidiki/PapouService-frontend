import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const expectedRole = route.data['expectedRole']; // 'ADMIN' ou 'USER'
  const userRole = authService.getUserRole();

  const isLoggedIn = authService.isLoggedIn();
  const url = state.url;

  // ✅ Exception : permettre à un ADMIN d'accéder aux détails de retrait/dépôt d’un utilisateur
  const isAdminAccessingUserDetails =
    userRole === 'ADMIN' && (
      url.match(/^\/user\/depot\/\d+$/) ||
      url.match(/^\/user\/retrait\/\d+$/)
    );

  if (isLoggedIn && (userRole === expectedRole || isAdminAccessingUserDetails)) {
    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
};

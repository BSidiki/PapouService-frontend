import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ErrorService } from '../services/error.service';
import { catchError, throwError } from 'rxjs';

/**
 * Intercepteur HTTP :
 * - Ajoute l'en-tête X-User-Id sur toutes les requêtes (si connecté)
 * - Redirige vers /login sur 401/403
 * - Affiche un toast sur erreur 500
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const errorService = inject(ErrorService);
  const auth = inject(AuthService);

  const user = auth.getUser();
  const cloned = user?.idUtilisateur
    ? req.clone({ setHeaders: { 'X-User-Id': String(user.idUtilisateur) } })
    : req;

  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        auth.logout();
        router.navigate(['/login']);
      } else if (error.status === 403) {
        auth.logout();
        errorService.toast('Accès refusé. Veuillez vous reconnecter.', 'danger', 4000);
        router.navigate(['/login']);
      } else if (error.status >= 500) {
        errorService.toast('Erreur serveur. Veuillez réessayer dans quelques instants.', 'danger', 5000);
      }
      return throwError(() => error);
    })
  );
};

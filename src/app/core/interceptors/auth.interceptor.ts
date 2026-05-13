import {
  HttpInterceptorFn,
  HttpErrorResponse
} from '@angular/common/http';

import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const authService = inject(AuthService);
  const router = inject(Router);
  const isPublicJobsGet =
    req.method === 'GET' &&
    /\/api\/v1\/jobs(\/search|\/\d+)?(\?|$)/.test(req.url);

  // Skip auth endpoints
  if (
    isPublicJobsGet ||
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/forgot-password') ||
    req.url.includes('/auth/reset-password') ||
    req.url.includes('/auth/refresh')
  ) {
    return next(req);
  }

  const token = authService.getAccessToken();
  const user = authService.getCurrentUser();

  // Attach token
  if (token || user) {
    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (user) {
      headers['X-User-Id'] = String(user.userId);
      headers['X-User-Role'] = user.role;
      headers['X-User-Email'] = user.email;

      if (user.fullName) {
        headers['X-User-Name'] = user.fullName;
      }
    }

    req = req.clone({
      setHeaders: headers
    });
  }

  return next(req).pipe(

    catchError((error: HttpErrorResponse) => {

      // Only refresh on 401
      if (error.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          router.navigate(['/auth/login'], {
            queryParams: { returnUrl: router.url },
          });
          return throwError(() => error);
        }

        return authService.refreshToken().pipe(

          switchMap((response) => {

            const newReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${response.accessToken}`
              }
            });

            return next(newReq);
          }),

          catchError((refreshError) => {

            // Clear auth immediately
            localStorage.clear();

            router.navigate(['/auth/login']);

            return throwError(() => refreshError);
          })
        );
      }

      return throwError(() => error);
    })
  );
};

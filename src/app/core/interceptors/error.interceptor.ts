// src/app/core/interceptors/error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastr = inject(ToastrService);
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      // 🚨 Skip 401 (handled by auth interceptor)
      if (
        error.status === 401 ||
        (error.status === 404 && req.method === 'GET' && req.url.includes('/profiles/candidate/me')) ||
        (error.status === 404 && req.method === 'GET' && req.url.includes('/profiles/recruiter/me'))
      ) {
        return throwError(() => error);
      }

      let errorMessage = 'An error occurred';
      
      if (error.error instanceof ErrorEvent) {
        errorMessage = error.error.message;
      } else {
        switch (error.status) {
          case 400:
            errorMessage = error.error?.message || 'Bad request';
            break;
          case 403:
            errorMessage = 'You do not have permission to perform this action';
            break;
          case 404:
            errorMessage = 'Resource not found';
            break;
          case 409:
            errorMessage = error.error?.message || 'Conflict occurred';
            break;
          case 500:
            errorMessage = 'Internal server error. Please try again later.';
            break;
          default:
            errorMessage = error.error?.message || `Error: ${error.status}`;
        }
      }
      
      toastr.error(errorMessage, 'Error');
      return throwError(() => error);
    })
  );
};

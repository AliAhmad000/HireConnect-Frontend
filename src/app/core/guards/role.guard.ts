// src/app/core/guards/role.guard.ts
import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const requiredRole = route.data['role'] as string;
  
  if (authService.hasRole(requiredRole)) {
    return true;
  }
  
  router.navigate(['/home']);
  return false;
};
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'jobs',
    loadComponent: () => import('./features/jobs/job-list/job-list.component').then(m => m.JobListComponent)
  },
  {
    path: 'jobs/:id',
    loadComponent: () => import('./features/jobs/job-detail/job-detail.component').then(m => m.JobDetailComponent)
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () => import('./features/candidate/notifications/notifications.component')
      .then(m => m.NotificationsComponent),
    title: 'Notifications - HireConnect'
  },
  {
    path: 'candidate',
    canActivate: [authGuard, roleGuard],
    data: { role: 'CANDIDATE' },
    loadChildren: () => import('./features/candidate/candidate.routes').then(m => m.candidateRoutes)
  },
  {
    path: 'recruiter',
    canActivate: [authGuard, roleGuard],
    data: { role: 'RECRUITER' },
    loadChildren: () => import('./features/recruiter/recruiter.routes').then(m => m.recruiterRoutes)
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' },
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes)
  },
  { path: '**', redirectTo: '/home' }
];

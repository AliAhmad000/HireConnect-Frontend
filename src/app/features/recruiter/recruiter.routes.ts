// src/app/features/recruiter/recruiter.routes.ts
import { Routes } from '@angular/router';

export const recruiterRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/recruiter-dashboard.component').then(m => m.RecruiterDashboardComponent)
  },
  {
    path: 'post-job',
    loadComponent: () => import('./post-job/post-job.component').then(m => m.PostJobComponent)
  },
  {
    path: 'jobs',
    loadComponent: () => import('./manage-jobs/manage-jobs.component').then(m => m.ManageJobsComponent)
  },
  {
    path: 'jobs/:id',
    loadComponent: () => import('./job-detail/job-detail.component').then(m => m.JobDetailComponent)
  },
  {
    path: 'applications',
    loadComponent: () => import('./applications/applications.component').then(m => m.ApplicationsComponent)
  },
  {
    path: 'applications/:id',
    loadComponent: () => import('./application-detail/application-detail.component').then(m => m.ApplicationDetailComponent)
  },
  {
    path: 'analytics',
    loadComponent: () => import('./analytics/analytics.component').then(m => m.AnalyticsComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/recruiter-profile.component').then(m => m.RecruiterProfileComponent)
  },
  {
    path: 'subscription',
    loadComponent: () => import('./subscription/subscription.component').then(m => m.SubscriptionComponent)
  },
  {
    path: 'notifications',
    loadComponent: () => import('../candidate/notifications/notifications.component')
      .then(m => m.NotificationsComponent),
    title: 'Recruiter Notifications - HireConnect'
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

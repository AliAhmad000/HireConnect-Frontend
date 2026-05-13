// src/app/features/admin/admin.routes.ts
import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/admin-dashboard.component')
      .then(m => m.AdminDashboardComponent),
    title: 'Admin Dashboard - HireConnect'
  },
  {
    path: 'users',
    loadComponent: () => import('./users/users.component')
      .then(m => m.UsersComponent),
    title: 'Manage Users - HireConnect'
  },
  {
    path: 'users/:id',
    loadComponent: () => import('./user-detail/user-detail.component')
      .then(m => m.UserDetailComponent),
    title: 'User Details - HireConnect'
  },
  {
    path: 'jobs',
    loadComponent: () => import('./jobs/jobs.component')
      .then(m => m.JobsComponent),
    title: 'Manage Jobs - HireConnect'
  },
  {
    path: 'jobs/:id',
    loadComponent: () => import('./job-detail/job-detail.component')
      .then(m => m.JobDetailComponent),
    title: 'Job Details - HireConnect'
  },
  {
    path: 'subscriptions',
    loadComponent: () => import('./subscriptions/subscriptions.component')
      .then(m => m.SubscriptionsComponent),
    title: 'Manage Subscriptions - HireConnect'
  },
  {
    path: 'analytics',
    loadComponent: () => import('./analytics/admin-analytics.component')
      .then(m => m.AdminAnalyticsComponent),
    title: 'Platform Analytics - HireConnect'
  },
  {
    path: 'reports',
    loadComponent: () => import('./reports/reports.component')
      .then(m => m.ReportsComponent),
    title: 'Reports - HireConnect'
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings.component')
      .then(m => m.SettingsComponent),
    title: 'Platform Settings - HireConnect'
  },
  {
    path: 'notifications',
    loadComponent: () => import('../candidate/notifications/notifications.component')
      .then(m => m.NotificationsComponent),
    title: 'Admin Notifications - HireConnect'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];

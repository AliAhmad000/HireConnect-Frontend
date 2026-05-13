// src/app/features/candidate/candidate.routes.ts
import { Routes } from '@angular/router';

export const candidateRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/candidate-dashboard.component')
      .then(m => m.CandidateDashboardComponent),
    title: 'Candidate Dashboard - HireConnect'
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/candidate-profile.component')
      .then(m => m.CandidateProfileComponent),
    title: 'My Profile - HireConnect'
  },
  {
    path: 'profile/setup',
    loadComponent: () => import('./profile/candidate-profile.component')
      .then(m => m.CandidateProfileComponent),
    title: 'Setup Profile - HireConnect'
  },
  {
    path: 'applications',
    loadComponent: () => import('./applications/my-applications.component')
      .then(m => m.MyApplicationsComponent),
    title: 'My Applications - HireConnect'
  },
  {
    path: 'applications/:id',
    loadComponent: () => import('./applications/application-detail.component')
      .then(m => m.ApplicationDetailComponent),
    title: 'Application Details - HireConnect'
  },
  {
    path: 'saved-jobs',
    loadComponent: () => import('./saved-jobs/saved-jobs.component')
      .then(m => m.SavedJobsComponent),
    title: 'Saved Jobs - HireConnect'
  },
  {
    path: 'jobs',
    loadComponent: () => import('../jobs/job-list/job-list.component')
      .then(m => m.JobListComponent),
    title: 'Find Jobs - HireConnect'
  },
  {
    path: 'jobs/:id',
    loadComponent: () => import('../jobs/job-detail/job-detail.component')
      .then(m => m.JobDetailComponent),
    title: 'Job Details - HireConnect'
  },
  {
    path: 'interviews',
    loadComponent: () => import('./interviews/interviews.component')
      .then(m => m.InterviewsComponent),
    title: 'My Interviews - HireConnect'
  },
  // {
  //   path: 'interviews/:id',
  //   loadComponent: () => import('./interviews/interview-detail.component')
  //     .then(m => m.InterviewDetailComponent),
  //   title: 'Interview Details - HireConnect'
  // },
  {
    path: 'notifications',
    loadComponent: () => import('./notifications/notifications.component')
      .then(m => m.NotificationsComponent),
    title: 'Notifications - HireConnect'
  },
  {
    path: 'wallet',
    loadComponent: () => import('./wallet/wallet.component')
      .then(m => m.WalletComponent),
    title: 'My Wallet - HireConnect'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];

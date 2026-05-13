// src/app/core/components/footer/footer.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';

interface FooterLink {
  label: string;
  route: string;
  icon: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();
  currentUser: User | null = null;
  brandCopy = this.buildBrandCopy(null);
  footerTagline = this.buildFooterTagline(null);
  footerSections: FooterSection[] = this.buildFooterSections(null);
  private authSubscription?: Subscription;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authSubscription = this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.brandCopy = this.buildBrandCopy(user);
      this.footerTagline = this.buildFooterTagline(user);
      this.footerSections = this.buildFooterSections(user);
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  private buildBrandCopy(user: User | null): string {
    switch (user?.role) {
      case 'CANDIDATE':
        return 'Track applications, discover relevant jobs, and keep your career workspace organized.';
      case 'RECRUITER':
        return 'Manage job posts, applications, interviews, subscriptions, and hiring analytics.';
      case 'ADMIN':
        return 'Monitor users, jobs, reports, subscriptions, and platform performance from one console.';
      default:
        return 'Live job discovery, recruiter hiring tools, and platform operations in one clean workspace.';
    }
  }

  private buildFooterTagline(user: User | null): string {
    switch (user?.role) {
      case 'CANDIDATE':
        return 'Candidate workspace';
      case 'RECRUITER':
        return 'Recruiter hiring workspace';
      case 'ADMIN':
        return 'Admin operations workspace';
      default:
        return 'Built for focused hiring workflows';
    }
  }

  private buildFooterSections(user: User | null): FooterSection[] {
    switch (user?.role) {
      case 'CANDIDATE':
        return [
          {
            title: 'Candidate',
            links: [
              { label: 'Dashboard', route: '/candidate/dashboard', icon: 'space_dashboard' },
              { label: 'Find Jobs', route: '/candidate/jobs', icon: 'work' },
              { label: 'Applications', route: '/candidate/applications', icon: 'description' },
            ],
          },
          {
            title: 'Profile',
            links: [
              { label: 'Saved Jobs', route: '/candidate/saved-jobs', icon: 'bookmark' },
              { label: 'Interviews', route: '/candidate/interviews', icon: 'event' },
              { label: 'Settings', route: '/candidate/profile', icon: 'manage_accounts' },
            ],
          },
          {
            title: 'Updates',
            links: [
              { label: 'Notifications', route: '/candidate/notifications', icon: 'notifications' },
              { label: 'Home', route: '/home', icon: 'home' },
            ],
          },
        ];
      case 'RECRUITER':
        return [
          {
            title: 'Recruiter',
            links: [
              { label: 'Dashboard', route: '/recruiter/dashboard', icon: 'space_dashboard' },
              { label: 'Applications', route: '/recruiter/applications', icon: 'folder_shared' },
              { label: 'My Jobs', route: '/recruiter/jobs', icon: 'business_center' },
            ],
          },
          {
            title: 'Hiring',
            links: [
              { label: 'Post a Job', route: '/recruiter/post-job', icon: 'post_add' },
              { label: 'Analytics', route: '/recruiter/analytics', icon: 'monitoring' },
              { label: 'Profile', route: '/recruiter/profile', icon: 'badge' },
            ],
          },
          {
            title: 'Billing',
            links: [
              { label: 'Subscription', route: '/recruiter/subscription', icon: 'workspace_premium' },
              { label: 'Notifications', route: '/recruiter/notifications', icon: 'notifications' },
            ],
          },
        ];
      case 'ADMIN':
        return [
          {
            title: 'Admin',
            links: [
              { label: 'Dashboard', route: '/admin/dashboard', icon: 'space_dashboard' },
              { label: 'Users', route: '/admin/users', icon: 'groups' },
              { label: 'Jobs', route: '/admin/jobs', icon: 'work' },
            ],
          },
          {
            title: 'Insights',
            links: [
              { label: 'Analytics', route: '/admin/analytics', icon: 'monitoring' },
              { label: 'Reports', route: '/admin/reports', icon: 'summarize' },
              { label: 'Subscriptions', route: '/admin/subscriptions', icon: 'payments' },
            ],
          },
          {
            title: 'Platform',
            links: [
              { label: 'Settings', route: '/admin/settings', icon: 'settings' },
              { label: 'Notifications', route: '/admin/notifications', icon: 'notifications' },
            ],
          },
        ];
      default:
        return [
          {
            title: 'Candidates',
            links: [
              { label: 'Browse Jobs', route: '/jobs', icon: 'work' },
              { label: 'Create Account', route: '/auth/register', icon: 'person_add' },
              { label: 'Sign In', route: '/auth/login', icon: 'login' },
            ],
          },
          {
            title: 'Recruiters',
            links: [
              { label: 'Post a Job', route: '/auth/register', icon: 'post_add' },
              { label: 'Plans', route: '/auth/register', icon: 'workspace_premium' },
              { label: 'Sign In', route: '/auth/login', icon: 'login' },
            ],
          },
          {
            title: 'Platform',
            links: [
              { label: 'Home', route: '/home', icon: 'home' },
              { label: 'Find Jobs', route: '/jobs', icon: 'search' },
            ],
          },
        ];
    }
  }
}

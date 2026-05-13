// src/app/core/components/header/header.component.ts
import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ElementRef,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { User } from '../../models/user.model';
import { Notification } from '../../models/notification.model';

interface NavLink {
  label: string;
  route: string;
  primary?: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  currentUser: User | null = null;
  unreadCount = 0;
  recentNotifications: Notification[] = [];
  isMenuOpen = false;
  isProfileMenuOpen = false;
  isNotificationOpen = false;
  desktopLinks: NavLink[] = this.buildLinks(null);

 constructor(
  private authService: AuthService,
  private notificationService: NotificationService,
  private router: Router,
  private cdr: ChangeDetectorRef,
  private elementRef: ElementRef<HTMLElement>
) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInsideHeader = this.elementRef.nativeElement.contains(event.target as Node);

    if (!clickedInsideHeader) {
      this.closeDrawers();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeDrawers();
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      setTimeout(() => {
        this.currentUser = user;
        this.desktopLinks = this.buildLinks(user);
        this.isMenuOpen = false;
        this.isProfileMenuOpen = false;
        this.isNotificationOpen = false;

        if (user) {
          this.loadUnreadCount();
          this.loadRecentNotifications();
        } else {
          this.unreadCount = 0;
          this.recentNotifications = [];
        }

        this.cdr.markForCheck();
      });
    });
  }

  loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => {
        this.unreadCount = count;
        this.cdr.markForCheck();
      },
      error: () => {
        this.unreadCount = 0;
        this.cdr.markForCheck();
      },
    });
  }

  loadRecentNotifications(): void {
    this.notificationService.getMyNotifications().subscribe({
      next: (notifications) => {
        this.recentNotifications = notifications.slice(0, 5);
        this.cdr.markForCheck();
      },
      error: () => {
        this.recentNotifications = [];
        this.cdr.markForCheck();
      },
    });
  }

  logout(): void {
  this.closeDrawers();
  this.authService.logout();

this.router.navigate(['/home']);
}

  getLogoLink(): string {
    if (!this.currentUser) {
      return '/home';
    }

    return this.getDashboardLink();
  }

  isLogoClickable(): boolean {
    return !this.currentUser || this.currentUser.role !== 'RECRUITER';
  }

  getRoleLabel(): string {
    if (!this.currentUser) {
      return 'Hiring platform';
    }

    return this.currentUser.role.toLowerCase().replace('_', ' ');
  }

  private buildLinks(user: User | null): NavLink[] {
    if (!user) {
      return [
        { label: 'Find Jobs', route: '/jobs' },
        { label: 'Sign In', route: '/auth/login' },
        { label: 'Post a Job', route: '/auth/register', primary: true },
      ];
    }

    switch (user.role) {
      case 'CANDIDATE':
        return [
          { label: 'Find Jobs', route: '/candidate/jobs' },
          { label: 'Dashboard', route: '/candidate/dashboard' },
          { label: 'Applications', route: '/candidate/applications' },
          { label: 'Saved Jobs', route: '/candidate/saved-jobs' },
        ];
      case 'RECRUITER':
        return [
          { label: 'Dashboard', route: '/recruiter/dashboard' },
          { label: 'Applications', route: '/recruiter/applications' },
          { label: 'My Jobs', route: '/recruiter/jobs' },
          { label: 'Post a Job', route: '/recruiter/post-job', primary: true },
        ];
      case 'ADMIN':
        return [
          { label: 'Dashboard', route: '/admin/dashboard' },
          { label: 'Users', route: '/admin/users' },
          { label: 'Jobs', route: '/admin/jobs' },
          { label: 'Analytics', route: '/admin/analytics' },
        ];
      default:
        return [{ label: 'Home', route: '/home' }];
    }
  }

  getNotificationLink(): string {
    if (!this.currentUser) {
      return '/notifications';
    }

    switch (this.currentUser.role) {
      case 'CANDIDATE': return '/candidate/notifications';
      case 'RECRUITER': return '/recruiter/notifications';
      case 'ADMIN': return '/admin/notifications';
      default: return '/notifications';
    }
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) {
      this.isProfileMenuOpen = false;
      this.isNotificationOpen = false;
    }
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
    if (this.isProfileMenuOpen) {
      this.isNotificationOpen = false;
      this.isMenuOpen = false;
    }
  }

  toggleNotification(): void {
    this.isNotificationOpen = !this.isNotificationOpen;
    if (this.isNotificationOpen) {
      this.isProfileMenuOpen = false;
      this.isMenuOpen = false;
      this.loadRecentNotifications();
      this.loadUnreadCount();
    }
  }

  closeDrawers(): void {
    if (!this.isMenuOpen && !this.isProfileMenuOpen && !this.isNotificationOpen) {
      return;
    }

    this.isMenuOpen = false;
    this.isProfileMenuOpen = false;
    this.isNotificationOpen = false;
    this.cdr.markForCheck();
  }

  getDashboardLink(): string {
    if (!this.currentUser) return '/home';
    switch (this.currentUser.role) {
      case 'CANDIDATE': return '/candidate/dashboard';
      case 'RECRUITER': return '/recruiter/dashboard';
      case 'ADMIN': return '/admin/dashboard';
      default: return '/home';
    }
  }

  getProfileLink(): string {
    if (!this.currentUser) return '/home';
    switch (this.currentUser.role) {
      case 'CANDIDATE': return '/candidate/profile';
      case 'RECRUITER': return '/recruiter/profile';
      default: return this.getDashboardLink();
    }
  }

  getJobsLink(): string {
    return this.currentUser?.role === 'CANDIDATE' ? '/candidate/jobs' : '/jobs';
  }
}

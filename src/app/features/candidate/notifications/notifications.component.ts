// src/app/features/candidate/notifications/notifications.component.ts
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { Notification } from '../../../core/models/notification.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit {
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  isLoading = true;
  activeFilter: 'ALL' | 'UNREAD' | 'READ' = 'ALL';
  unreadCount = 0;

  constructor(
    private notificationService: NotificationService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.notificationService.getMyNotifications().subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        this.unreadCount = notifications.filter(n => !n.isRead).length;
        this.applyFilter(this.activeFilter);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilter(filter: 'ALL' | 'UNREAD' | 'READ'): void {
    this.activeFilter = filter;
    
    switch (filter) {
      case 'UNREAD':
        this.filteredNotifications = this.notifications.filter(n => !n.isRead);
        break;
      case 'READ':
        this.filteredNotifications = this.notifications.filter(n => n.isRead);
        break;
      default:
        this.filteredNotifications = [...this.notifications];
    }
  }

  markAsRead(notificationId: string): void {
    this.notificationService.markAsRead(notificationId).subscribe({
      next: () => {
        const notification = this.notifications.find(n => n.notificationId === notificationId);
        if (notification) {
          notification.isRead = true;
          this.unreadCount = this.notifications.filter(n => !n.isRead).length;
          this.applyFilter(this.activeFilter);
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.toastr.error('Failed to mark notification as read');
      }
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
        this.unreadCount = 0;
        this.applyFilter(this.activeFilter);
        this.toastr.success('All notifications marked as read');
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Failed to mark all as read');
      }
    });
  }

  deleteNotification(notificationId: string): void {
    this.notificationService.deleteNotification(notificationId).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.notificationId !== notificationId);
        this.unreadCount = this.notifications.filter(n => !n.isRead).length;
        this.applyFilter(this.activeFilter);
        this.toastr.success('Notification deleted');
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Failed to delete notification');
      }
    });
  }

  getNotificationIcon(type: string): string {
    if (type.includes('APPLICATION')) return 'description';
    if (type.includes('INTERVIEW')) return 'event';
    if (type.includes('JOB')) return 'notifications';
    if (type.includes('MESSAGE')) return 'chat';
    if (type.includes('SYSTEM')) return 'settings';
    return 'push_pin';
  }

  getNotificationColor(type: string): string {
    if (type.includes('APPLICATION')) return 'application';
    if (type.includes('INTERVIEW')) return 'interview';
    if (type.includes('JOB')) return 'job';
    if (type.includes('MESSAGE')) return 'message';
    return 'system';
  }

  getTimeAgo(date: string): string {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notificationDate.toLocaleDateString();
  }
}

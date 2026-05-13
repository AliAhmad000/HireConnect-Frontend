// src/app/core/models/notification.model.ts
export interface Notification {
  notificationId: string;
  userId: string;
  userEmail?: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  referenceId?: string;
  referenceType?: string;
  actionUrl?: string;
  createdAt: string;
  readAt?: string;
}

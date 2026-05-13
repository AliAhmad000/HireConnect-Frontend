// src/app/core/services/notification.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notification } from '../models/notification.model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly API_URL = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getMyNotifications(): Observable<Notification[]> {
    return this.http
      .get<any>(`${this.API_URL}/my`)
      .pipe(map((response) => response?.data?.content || response?.data || []));
  }

  getUnreadCount(): Observable<number> {
    return this.http
      .get<any>(`${this.API_URL}/unread/count`)
      .pipe(map((response) => response?.data?.unreadCount || response?.data?.count || 0));
  }

  markAsRead(id: string): Observable<Notification> {
    return this.http
      .patch<any>(`${this.API_URL}/${id}/read`, {})
      .pipe(map((response) => response?.data || response));
  }

  markAllAsRead(): Observable<number> {
    return this.http
      .patch<any>(`${this.API_URL}/read-all`, {})
      .pipe(map((response) => response?.data || 0));
  }

  deleteNotification(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}

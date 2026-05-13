// src/app/core/services/interview.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Interview, InterviewRequest, RescheduleInterviewRequest } from '../models/interview.model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class InterviewService {
  private readonly API_URL = `${environment.apiUrl}/interviews`;

  constructor(private http: HttpClient) {}

  scheduleInterview(request: InterviewRequest): Observable<Interview> {
    return this.http
      .post<any>(this.API_URL, request)
      .pipe(map((response) => response?.data || response));
  }

  getMyInterviews(): Observable<Interview[]> {
    return this.http
      .get<any>(`${this.API_URL}/my`)
      .pipe(
        map((response) => {
          const data = response?.data ?? response ?? [];
          return Array.isArray(data) ? data : data?.content || [];
        })
      );
  }

  getInterviewById(id: string): Observable<Interview> {
    return this.http
      .get<any>(`${this.API_URL}/${id}`)
      .pipe(map((response) => response?.data || response));
  }

  confirmInterview(id: string): Observable<Interview> {
    return this.http
      .patch<any>(`${this.API_URL}/${id}/confirm`, {})
      .pipe(map((response) => response?.data || response));
  }

  rescheduleInterview(id: string, request: RescheduleInterviewRequest): Observable<Interview> {
    return this.http
      .patch<any>(`${this.API_URL}/${id}/reschedule`, request)
      .pipe(map((response) => response?.data || response));
  }

  cancelInterview(id: string, reason?: string): Observable<void> {
    return this.http.patch<void>(`${this.API_URL}/${id}/cancel`, null, { params: reason ? { reason } : {} });
  }



  requestReschedule(id: string, request: RescheduleInterviewRequest): Observable<Interview> {
    return this.http
      .patch<any>(`${this.API_URL}/${id}/request-reschedule`, request, {
        params: {
          newScheduledAt: request.newScheduledAt,
          reason: request.rescheduleReason || '',
          rescheduleReason: request.rescheduleReason || ''
        }
      })
      .pipe(map((response) => response?.data || response));
  }

  rejectReschedule(id: string, reason: string): Observable<Interview> {
    return this.http
      .patch<any>(`${this.API_URL}/${id}/reject-reschedule`, null, { params: { reason } })
      .pipe(map((response) => response?.data || response));
  }

  getInterviewsByRecruiter(recruiterId: string, status?: Interview['status'], size = 200): Observable<Interview[]> {
    const params: Record<string, string> = { size: String(size) };
    if (status) {
      params['status'] = status;
    }

    return this.http
      .get<any>(`${this.API_URL}/recruiter/${recruiterId}`, { params })
      .pipe(map((response) => response?.data?.content || response?.data || []));
  }

  getUpcomingInterviewsByRecruiter(recruiterId: string): Observable<Interview[]> {
    return this.http
      .get<any>(`${this.API_URL}/recruiter/${recruiterId}/upcoming`)
      .pipe(map((response) => response?.data || []));
  }
  
  getInterviewsByApplication(applicationId: string): Observable<Interview[]> {
    return this.http
      .get<any>(`${this.API_URL}/application/${applicationId}`)
      .pipe(map((response) => response?.data || response || []));
  }
}

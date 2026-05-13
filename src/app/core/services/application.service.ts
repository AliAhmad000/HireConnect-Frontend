// src/app/core/services/application.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';
import { Application, ApplicationStatusUpdate } from '../models/application.model';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}

interface PageResponse<T> {
  content?: T[];
}

@Injectable({
  providedIn: 'root'
})
export class ApplicationService {
  private readonly API_URL = `${environment.apiUrl}/applications`;

  constructor(private http: HttpClient) {}

  submitApplication(jobId: string, data: Partial<Application>): Observable<Application> {
    return this.http
      .post<ApiResponse<Application>>(this.API_URL, { jobId: Number(jobId), ...data })
      .pipe(map((response) => response.data));
  }

  getMyApplications(): Observable<Application[]> {
    return this.http
      .get<any>(`${this.API_URL}/my`)
      .pipe(
        map((response) => this.toArray(response?.data))
      );
  }

  getApplicationsByJob(jobId: string, size = 200): Observable<Application[]> {
    return this.http
      .get<ApiResponse<Application[] | PageResponse<Application>>>(`${this.API_URL}/job/${jobId}`, {
        params: { size: String(size) }
      })
      .pipe(map((response) => this.toArray(response?.data)));
  }

  getApplicationsByRecruiter(recruiterId: string, size = 200): Observable<Application[]> {
    return this.http
      .get<ApiResponse<Application[] | PageResponse<Application>>>(`${this.API_URL}/recruiter/${recruiterId}`, {
        params: { size: String(size) }
      })
      .pipe(map((response) => this.toArray(response?.data)));
  }

  countApplicationsByJob(jobId: string): Observable<number> {
    return this.http
      .get<ApiResponse<number>>(`${this.API_URL}/job/${jobId}/count`)
      .pipe(map((response) => Number(response?.data || 0)));
  }

  getApplicationById(id: string): Observable<Application> {
    return this.http
      .get<ApiResponse<Application>>(`${this.API_URL}/${id}`)
      .pipe(map((response) => response.data));
  }

  updateApplicationStatus(id: string, update: ApplicationStatusUpdate): Observable<Application> {
    return this.http
      .patch<ApiResponse<Application>>(`${this.API_URL}/${id}/status`, update)
      .pipe(map((response) => response.data));
  }

  sendMessageToCandidate(id: string, message: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.API_URL}/${id}/messages`, { message })
      .pipe(map(() => undefined));
  }

  withdrawApplication(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.API_URL}/${id}/withdraw`)
      .pipe(map(() => undefined));
  }

  shortlistCandidate(applicationId: string): Observable<Application> {
    return this.updateApplicationStatus(applicationId, { status: 'SHORTLISTED' });
  }

  rejectCandidate(applicationId: string): Observable<Application> {
    return this.updateApplicationStatus(applicationId, { status: 'REJECTED' });
  }

  private toArray(data: Application[] | PageResponse<Application> | null | undefined): Application[] {
    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.content)) {
      return data.content;
    }

    return [];
  }
}

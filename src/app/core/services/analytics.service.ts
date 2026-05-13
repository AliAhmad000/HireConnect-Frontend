// src/app/core/services/analytics.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AnalyticsSummary, JobAnalytics } from '../models/analytics.model';
import { map } from 'rxjs/operators';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}

interface RecruiterAnalyticsResponse {
  recruiterId: string;
  totalJobsPosted: number;
  totalApplicationsReceived: number;
  totalJobViews: number;
  shortlistedCount: number;
  interviewScheduledCount: number;
  offeredCount: number;
  rejectedCount: number;
  viewToApplyRatio: number;
  avgTimeToHireDays: number;
  applicationsByStatus?: Record<string, number>;
  topJobsByApplications?: Record<string, number>;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly API_URL = `${environment.apiUrl}/analytics`;

  constructor(private http: HttpClient) {}

  getRecruiterAnalytics(): Observable<AnalyticsSummary> {
    return this.http
      .get<ApiResponse<RecruiterAnalyticsResponse>>(`${this.API_URL}/recruiter`)
      .pipe(map((response) => this.toAnalyticsSummary(response.data)));
  }

  getJobAnalytics(jobId: string): Observable<any> {

  return this.http.get<ApiResponse<number>>(
    `${this.API_URL}/jobs/${jobId}/views`
  ).pipe(
    map((response) => ({
      jobId,
      views: response.data || 0,
      applications: 0,
      shortlisted: 0,
      interviews: 0,
      offered: 0,
      rejected: 0,
      conversionRate: 0,
    }))
  );

}

  getJobsAnalytics(): Observable<JobAnalytics[]> {
    return this.http.get<JobAnalytics[]>(`${this.API_URL}/jobs`);
  }

  getPipelineStats(): Observable<any> {
    return this.http.get(`${this.API_URL}/pipeline`);
  }

  getPlatformAnalytics(): Observable<any> {
    return this.http
      .get<ApiResponse<any>>(`${this.API_URL}/admin`)
      .pipe(map((response) => response.data));
  }

  private toAnalyticsSummary(data: RecruiterAnalyticsResponse): AnalyticsSummary {
    return {
      recruiterId: data.recruiterId,
      totalJobs: data.totalJobsPosted || 0,
      totalApplications: data.totalApplicationsReceived || 0,
      totalJobViews: data.totalJobViews || 0,
      shortlistedCount: data.shortlistedCount || 0,
      interviewScheduledCount: data.interviewScheduledCount || 0,
      offeredCount: data.offeredCount || 0,
      rejectedCount: data.rejectedCount || 0,
      avgTimeToHireDays: data.avgTimeToHireDays || 0,
      viewToApplyRatio: data.viewToApplyRatio || 0,
      applicationsByStatus: data.applicationsByStatus || {},
      topJobsByApplications: data.topJobsByApplications || {},
    };
  }
}

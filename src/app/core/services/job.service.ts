// src/app/core/services/job.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Job, JobSearchFilters } from '../models/job.model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class JobService {
  private readonly API_URL = `${environment.apiUrl}/jobs`;

  constructor(private http: HttpClient) {}

  getJobs(filters?: JobSearchFilters): Observable<Job[]> {

  let params = new HttpParams();

  let hasFilters = false;

  if (filters) {

    Object.entries(filters).forEach(([key, value]) => {

      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {

        hasFilters = true;

        params = params.set(
          key,
          value.toString()
        );

      }

    });

  }

  const endpoint =
    hasFilters
      ? `${this.API_URL}/search`
      : this.API_URL;

  if (!hasFilters) {
    params = params.set('size', '200');
  }

  return this.http
    .get<any>(endpoint, { params })
    .pipe(map(response => this.extractJobs(response)));

}

  getJobById(id: string): Observable<Job> {
    return this.http.get<any>(`${this.API_URL}/${id}`).pipe(map((response) => response.data));
  }

  createJob(job: Partial<Job>): Observable<Job> {
    return this.http.post<any>(this.API_URL, job).pipe(map((response) => response.data));
  }

  updateJob(id: string, job: Partial<Job>): Observable<Job> {
    return this.http.put<any>(`${this.API_URL}/${id}`, job).pipe(map((response) => response.data));
  }

  deleteJob(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }

  searchJobs(query: string): Observable<Job[]> {
    return this.http
      .get<any>(`${this.API_URL}/search`, {
        params: { title: query, size: 200 },
      })
      .pipe(map((response) => this.extractJobs(response)));
  }

  getRecruiterJobs(status?: Job['status'], size = 200): Observable<Job[]> {
    let params = new HttpParams().set('size', String(size));
    if (status) {
      params = params.set('status', status);
    }

    return this.http
      .get<any>(`${this.API_URL}/recruiter`, { params })
      .pipe(map((response) => this.extractJobs(response)));
  }

  pauseJob(id: string): Observable<Job> {
    return this.http
      .patch<any>(`${this.API_URL}/${id}/pause`, {})
      .pipe(map((response) => response.data));
  }

  resumeJob(id: string): Observable<Job> {
    return this.http
      .patch<any>(`${this.API_URL}/${id}/status`, null, {
        params: { status: 'ACTIVE' },
      })
      .pipe(map((response) => response.data));
  }

  closeJob(id: string): Observable<Job> {
    return this.http
      .patch<any>(`${this.API_URL}/${id}/close`, {})
      .pipe(map((response) => response.data));
  }

  updateJobStatus(id: string, status: 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'DRAFT'): Observable<Job> {
    return this.http
      .patch<any>(`${this.API_URL}/${id}/status`, null, { params: { status } })
      .pipe(map((response) => response.data));
  }

  private extractJobs(response: any): Job[] {
    const payload = response?.data ?? response;

    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.content)) {
      return payload.content;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.data?.content)) {
      return payload.data.content;
    }

    return [];
  }
}

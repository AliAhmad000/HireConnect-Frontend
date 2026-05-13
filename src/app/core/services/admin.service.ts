import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../models/page-response.model';
import { Job } from '../models/job.model';

export interface AdminUser {
  id: string;
  userId: string;
  name: string;
  fullName: string;
  email: string;
  role: 'CANDIDATE' | 'RECRUITER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  isActive: boolean;
  provider?: string;
  joinedAt: string;
  createdAt: string;
  lastLogin?: string;
  applications?: number;
  jobsPosted?: number;
  permissions?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly AUTH_URL = `${environment.apiUrl}/auth`;
  private readonly JOBS_URL = `${environment.apiUrl}/jobs`;

  constructor(private http: HttpClient) {}

  getUsers(options: {
    page?: number;
    size?: number;
    role?: string | null;
    active?: boolean | null;
    search?: string | null;
  } = {}): Observable<PageResponse<AdminUser>> {
    let params = new HttpParams()
      .set('page', String(options.page ?? 0))
      .set('size', String(options.size ?? 100));

    if (options.role && options.role !== 'ALL') params = params.set('role', options.role);
    if (options.active !== null && options.active !== undefined) params = params.set('active', String(options.active));
    if (options.search) params = params.set('search', options.search);

    return this.http
      .get<ApiResponse<PageResponse<any>>>(`${this.AUTH_URL}/users`, { params })
      .pipe(map((response) => ({
        ...response.data,
        content: (response.data?.content || []).map((user) => this.toAdminUser(user)),
      })));
  }

  getUser(userId: string): Observable<AdminUser> {
    return this.http
      .get<ApiResponse<any>>(`${this.AUTH_URL}/users/${userId}`)
      .pipe(map((response) => this.toAdminUser(response.data)));
  }

  setUserActive(userId: string, active: boolean): Observable<AdminUser> {
    return this.http
      .patch<ApiResponse<any>>(`${this.AUTH_URL}/users/${userId}/active`, null, {
        params: { active },
      })
      .pipe(map((response) => this.toAdminUser(response.data)));
  }

  deleteUser(userId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.AUTH_URL}/users/${userId}`)
      .pipe(map(() => undefined));
  }

  getJobs(status?: string | null): Observable<Job[]> {
    let params = new HttpParams().set('size', '200');
    if (status && status !== 'ALL') params = params.set('status', status);

    return this.http
      .get<ApiResponse<PageResponse<Job>>>(`${this.JOBS_URL}/admin`, { params })
      .pipe(map((response) => response.data?.content || []));
  }

  setJobStatus(jobId: string, status: 'ACTIVE' | 'PAUSED' | 'CLOSED'): Observable<Job> {
    return this.http
      .patch<ApiResponse<Job>>(`${this.JOBS_URL}/${jobId}/status`, null, { params: { status } })
      .pipe(map((response) => response.data));
  }

  deleteJob(jobId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.JOBS_URL}/${jobId}`)
      .pipe(map(() => undefined));
  }

  private toAdminUser(user: any): AdminUser {
    const name = user.fullName || user.name || user.email?.split('@')[0] || 'User';
    const isActive = user.isActive !== false;
    return {
      id: String(user.userId || user.id),
      userId: String(user.userId || user.id),
      name,
      fullName: name,
      email: user.email || '',
      role: user.role,
      status: isActive ? 'ACTIVE' : 'SUSPENDED',
      isActive,
      provider: user.provider,
      joinedAt: user.createdAt,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      applications: 0,
      jobsPosted: 0,
      permissions: user.role === 'ADMIN' ? 'Full' : '',
    };
  }
}

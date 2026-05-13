// src/app/core/services/profile.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CandidateProfile } from '../models/candidate.model';
import { RecruiterProfile } from '../models/recruiter.model';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly API_URL = `${environment.apiUrl}/profiles`;

  constructor(private http: HttpClient) {}

  getCandidateProfile(): Observable<CandidateProfile> {
    return this.http
      .get<ApiResponse<CandidateProfile>>(`${this.API_URL}/candidate/me`)
      .pipe(map((response) => response.data));
  }

  createCandidateProfile(profile: Pick<CandidateProfile, 'fullName' | 'email'>): Observable<CandidateProfile> {
    return this.http
      .post<ApiResponse<CandidateProfile>>(`${this.API_URL}/candidate`, profile)
      .pipe(map((response) => response.data));
  }

  updateCandidateProfile(profile: Partial<CandidateProfile>): Observable<CandidateProfile> {
    return this.http
      .put<ApiResponse<CandidateProfile>>(`${this.API_URL}/candidate`, profile)
      .pipe(map((response) => response.data));
  }

  uploadResume(file: File): Observable<{ resumeUrl: string }> {
    const formData = new FormData();
    formData.append('resume', file);
    return this.http
      .post<ApiResponse<{ resumeUrl: string }>>(`${this.API_URL}/candidate/resume`, formData)
      .pipe(map((response) => response.data));
  }

  getCandidateResumeUrl(candidateId: string): Observable<string> {
    return this.http
      .get<ApiResponse<string>>(`${this.API_URL}/candidate/${candidateId}/resume-url`)
      .pipe(map((response) => response.data || ''));
  }

  getRecruiterProfile(): Observable<RecruiterProfile> {
    return this.http
      .get<ApiResponse<RecruiterProfile>>(`${this.API_URL}/recruiter/me`)
      .pipe(map((response) => response.data));
  }

  getRecruiterProfileByUserId(userId: string | number): Observable<RecruiterProfile> {
    return this.http
      .get<ApiResponse<RecruiterProfile>>(`${this.API_URL}/recruiter/${userId}`)
      .pipe(map((response) => response.data));
  }

  createRecruiterProfile(profile: Partial<RecruiterProfile>): Observable<RecruiterProfile> {
    return this.http
      .post<ApiResponse<RecruiterProfile>>(`${this.API_URL}/recruiter`, profile)
      .pipe(map((response) => response.data));
  }

  updateRecruiterProfile(profile: Partial<RecruiterProfile>): Observable<RecruiterProfile> {
    return this.http
      .put<ApiResponse<RecruiterProfile>>(`${this.API_URL}/recruiter`, profile)
      .pipe(map((response) => response.data));
  }

  uploadCompanyLogo(file: File): Observable<{ logoUrl: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    return this.http.post<{ logoUrl: string }>(`${this.API_URL}/recruiter/logo`, formData);
  }
}

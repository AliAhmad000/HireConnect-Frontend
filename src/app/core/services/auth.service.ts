// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');

    if (token && user && user !== 'undefined') {
      try {
        this.currentUserSubject.next(JSON.parse(user));
      } catch (error) {
        console.error('Invalid user data in localStorage');

        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/login`, credentials)
      .pipe(tap((response) => this.handleAuthResponse(response)));
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/register`, data)
      .pipe(tap((response) => this.handleAuthResponse(response)));
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/reset-password`, { token, newPassword });
  }

  loginWithGitHub(code: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/oauth/github`, { code })
      .pipe(tap((response) => this.handleAuthResponse(response)));
  }

  logout(): void {
  this.clearAuthData();
}

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http
      .post<AuthResponse>(`${this.API_URL}/refresh`, { refreshToken })
      .pipe(tap((response) => this.handleAuthResponse(response)));
  }

  handleOAuthLogin(authData: any): void {
    localStorage.setItem('accessToken', authData.accessToken);

    localStorage.setItem('refreshToken', authData.refreshToken);

    const user = {
      userId:(authData.userId),
      email: authData.email,
      fullName: authData.fullName,
      role: authData.role,
      provider: authData.provider,
    };

    localStorage.setItem('user', JSON.stringify(user));

    this.currentUserSubject.next(user);
  }

  private handleAuthResponse(response: any): void {
    const authData = response.data;

    // Store tokens
    localStorage.setItem('accessToken', authData.accessToken);

    localStorage.setItem('refreshToken', authData.refreshToken);

    // Build user object
    const user = {
      userId: authData.userId,
      email: authData.email,
      fullName: authData.fullName,
      role: authData.role,
      provider: authData.provider,
    };

    // Store user
    localStorage.setItem('user', JSON.stringify(user));

    // Update observable
    this.currentUserSubject.next(user);
  }

  private clearAuthData(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: string): boolean {
    return this.getCurrentUser()?.role === role;
  }
}

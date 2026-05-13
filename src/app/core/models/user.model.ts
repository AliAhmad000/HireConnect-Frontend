// src/app/core/models/user.model.ts
export interface User {
  userId: string;
  email: string;
  fullName?: string;
  role: 'CANDIDATE' | 'RECRUITER' | 'ADMIN';
  provider?: 'LOCAL' | 'GITHUB';
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  role: 'CANDIDATE' | 'RECRUITER';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

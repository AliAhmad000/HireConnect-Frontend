// src/app/core/models/recruiter.model.ts
export interface RecruiterProfile {
  profileId: string | number;
  userId: string | number;
  fullName: string;
  email: string;
  mobile?: string;
  companyName: string;
  companySize?: string;
  industry?: string;
  website?: string;
  companyDescription?: string;
  linkedinUrl?: string;
  logoUrl?: string;
  designation?: string;
  logo?: string;
  verified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  memberId: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  invitedAt: string;
  acceptedAt: string;
}

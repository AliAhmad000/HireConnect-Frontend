// src/app/core/models/application.model.ts
import { Job } from './job.model';                     // ✅ ADD
import { CandidateProfile } from './candidate.model';

export interface Application {
  applicationId: string;
  jobId: string;
  candidateId: string;
  appliedAt: string;
  status: ApplicationStatus;
  coverLetter: string;
  resumeUrl: string;
  recruiterId?: string;
  jobTitle?: string;
  companyName?: string;
  candidateName?: string;
  candidateEmail?: string;
  isWithdrawn?: boolean;
  job?: Job;
  candidate?: CandidateProfile;
}

export type ApplicationStatus = 
  | 'APPLIED'
  | 'SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'OFFERED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface ApplicationStatusUpdate {
  status: ApplicationStatus;
  notes?: string;
  rejectionReason?: string;
}

// src/app/core/models/interview.model.ts
export interface Interview {
  interviewId: string;
  applicationId: string;
  candidateId?: string;
  recruiterId?: string;
  jobId?: string;
  jobTitle?: string;
  candidateName?: string;
  candidateEmail?: string;
  companyName?: string;
  scheduledAt: string;
  durationMinutes?: number;
  mode: 'ONLINE' | 'IN_PERSON';
  meetLink?: string;
  location?: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'RESCHEDULE_REQUESTED' | 'RESCHEDULED' | 'CANCELLED' | 'COMPLETED';
  cancellationReason?: string;
  rescheduleReason?: string;
  requestedScheduledAt?: string;
  statusBeforeRescheduleRequest?: 'SCHEDULED' | 'CONFIRMED' | 'RESCHEDULED';
  notes: string;
  createdAt: string;
  updatedAt: string;
  application?: {
    job?: {
      title: string;
      companyName: string;
    }
  };
}

export interface InterviewRequest {
  applicationId: string;
  candidateId?: string;
  jobId?: string;
  jobTitle?: string;
  candidateName?: string;
  candidateEmail?: string;
  companyName?: string;
  scheduledAt: string;
  mode: 'ONLINE' | 'IN_PERSON';
  durationMinutes?: number;
  meetLink?: string;
  location?: string;
  notes?: string;
  interviewerName?: string;
  roundNumber?: number;
}

export interface RescheduleInterviewRequest {
  newScheduledAt: string;
  rescheduleReason?: string;
  meetLink?: string;
  location?: string;
}

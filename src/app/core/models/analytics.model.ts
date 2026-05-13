// src/app/core/models/analytics.model.ts
export interface AnalyticsSummary {
  recruiterId?: string;
  totalJobs: number;
  totalApplications: number;
  totalJobViews?: number;
  shortlistedCount: number;
  interviewScheduledCount?: number;
  offeredCount: number;
  rejectedCount: number;
  avgTimeToHireDays: number;
  viewToApplyRatio: number;
  applicationsByStatus?: Record<string, number>;
  topJobsByApplications?: Record<string, number>;
}

export interface JobAnalytics {
  jobId: string;
  title: string;
  views: number;
  applications: number;
  shortlisted: number;
  interviews: number;
  offered: number;
  rejected: number;
  conversionRate: number;
}

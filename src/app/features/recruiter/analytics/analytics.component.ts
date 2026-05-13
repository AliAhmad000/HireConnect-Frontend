// src/app/features/recruiter/analytics/analytics.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { JobService } from '../../../core/services/job.service';
import { ApplicationService } from '../../../core/services/application.service';
import { AuthService } from '../../../core/services/auth.service';
import { AnalyticsSummary, JobAnalytics } from '../../../core/models/analytics.model';
import { Job } from '../../../core/models/job.model';
import { Application } from '../../../core/models/application.model';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss']
})
export class AnalyticsComponent implements OnInit {
  summary: AnalyticsSummary | null = null;
  jobs: Job[] = [];
  applications: Application[] = [];
  jobAnalytics: JobAnalytics[] = [];
  selectedJobAnalytics: JobAnalytics | null = null;
  isLoading = true;
  selectedJobId: string | null = null;
  errorMessage = '';

  constructor(
    private analyticsService: AnalyticsService,
    private jobService: JobService,
    private applicationService: ApplicationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const recruiterId = this.getRecruiterId();

    if (!recruiterId) {
      this.errorMessage = 'Unable to identify the current recruiter.';
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    forkJoin({
      summary: this.analyticsService.getRecruiterAnalytics().pipe(
        timeout(3000),
        catchError(() => of(null))
      ),
      jobs: this.jobService.getRecruiterJobs().pipe(catchError(() => of([] as Job[]))),
      applications: this.applicationService.getApplicationsByRecruiter(recruiterId).pipe(catchError(() => of([] as Application[]))),
    }).subscribe({
      next: ({ summary, jobs, applications }) => {
        this.jobs = jobs;
        this.applications = applications;
        this.buildAnalytics(summary);
        this.selectedJobId = this.selectedJobId || this.jobAnalytics[0]?.jobId || '';
        this.selectedJobAnalytics = this.jobAnalytics.find(job => job.jobId === this.selectedJobId) || null;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load analytics right now.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private getRecruiterId(): string | null {
    const currentUserId = this.authService.getCurrentUser()?.userId;
    if (currentUserId) {
      return currentUserId;
    }

    const storedUser = localStorage.getItem('user');
    if (!storedUser || storedUser === 'undefined') {
      return null;
    }

    try {
      return JSON.parse(storedUser)?.userId || null;
    } catch {
      return null;
    }
  }

  selectJob(jobId: string): void {
    this.selectedJobId = jobId;
    this.selectedJobAnalytics = this.jobAnalytics.find(job => job.jobId === jobId) || null;
    this.cdr.detectChanges();
  }

  exportReport(): void {
    const rows = [
      ['Metric', 'Value'],
      ['Total Jobs', this.summary?.totalJobs ?? 0],
      ['Total Applications', this.summary?.totalApplications ?? 0],
      ['Total Job Views', this.summary?.totalJobViews ?? 0],
      ['Shortlisted', this.summary?.shortlistedCount ?? 0],
      ['Interviews', this.summary?.interviewScheduledCount ?? 0],
      ['Offers Made', this.summary?.offeredCount ?? 0],
      ['Rejected', this.summary?.rejectedCount ?? 0],
      ['View-to-Apply Ratio', `${this.summary?.viewToApplyRatio ?? 0}%`],
      [],
      ['Job', 'Views', 'Applications', 'Conversion %', 'Shortlisted', 'Interviews', 'Offered', 'Rejected'],
      ...this.jobAnalytics.map(job => [
        job.title,
        job.views,
        job.applications,
        job.conversionRate,
        job.shortlisted,
        job.interviews,
        job.offered,
        job.rejected,
      ]),
    ];

    const csv = rows
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const link = document.createElement('a');
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = `recruiter-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getPipelineWidth(value: number): number {
    if (!this.selectedJobAnalytics?.applications) {
      return 0;
    }

    return Math.max(4, Math.round((value / this.selectedJobAnalytics.applications) * 100));
  }

  private buildAnalytics(apiSummary: AnalyticsSummary | null): void {
    const statusCounts = this.applications.reduce<Record<string, number>>((counts, app) => {
      counts[app.status] = (counts[app.status] || 0) + 1;
      return counts;
    }, {});

    const totalJobViews = this.jobs.reduce((total, job) => total + (job.viewCount || 0), 0);
    this.jobAnalytics = this.jobs.map((job) => this.toJobAnalytics(job));

    this.summary = {
      recruiterId: apiSummary?.recruiterId,
      totalJobs: this.jobs.length,
      totalApplications: this.applications.length,
      totalJobViews,
      shortlistedCount: statusCounts['SHORTLISTED'] || 0,
      interviewScheduledCount: statusCounts['INTERVIEW_SCHEDULED'] || 0,
      offeredCount: statusCounts['OFFERED'] || 0,
      rejectedCount: statusCounts['REJECTED'] || 0,
      avgTimeToHireDays: this.calculateAvgTimeToHireDays(),
      viewToApplyRatio: totalJobViews > 0
        ? Math.round((this.applications.length / totalJobViews) * 10000) / 100
        : 0,
      applicationsByStatus: statusCounts,
      topJobsByApplications: this.jobAnalytics.reduce<Record<string, number>>((acc, job) => {
        acc[job.title] = job.applications;
        return acc;
      }, {}),
    };
  }

  private toJobAnalytics(job: Job): JobAnalytics {
    const jobApplications = this.applications.filter(app => app.jobId === job.jobId);
    const views = job.viewCount || 0;

    return {
      jobId: job.jobId,
      title: job.title,
      views,
      applications: jobApplications.length,
      shortlisted: jobApplications.filter(app => app.status === 'SHORTLISTED').length,
      interviews: jobApplications.filter(app => app.status === 'INTERVIEW_SCHEDULED').length,
      offered: jobApplications.filter(app => app.status === 'OFFERED').length,
      rejected: jobApplications.filter(app => app.status === 'REJECTED').length,
      conversionRate: views > 0 ? Math.round((jobApplications.length / views) * 10000) / 100 : 0,
    };
  }

  private calculateAvgTimeToHireDays(): number {
    const offered = this.applications.filter(app => app.status === 'OFFERED');
    const durations = offered
      .map(app => {
        const start = new Date(app.appliedAt).getTime();
        const end = new Date((app as any).statusUpdatedAt || (app as any).updatedAt || '').getTime();
        return Number.isFinite(start) && Number.isFinite(end) && end >= start
          ? (end - start) / (1000 * 60 * 60 * 24)
          : null;
      })
      .filter((value): value is number => value !== null);

    if (durations.length === 0) {
      return 0;
    }

    return Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10;
  }
}

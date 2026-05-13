// src/app/features/candidate/dashboard/candidate-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApplicationService } from '../../../core/services/application.service';
import { JobService } from '../../../core/services/job.service';
import { InterviewService } from '../../../core/services/interview.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Application } from '../../../core/models/application.model';
import { Job } from '../../../core/models/job.model';
import { Interview } from '../../../core/models/interview.model';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-candidate-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './candidate-dashboard.component.html',
  styleUrls: ['./candidate-dashboard.component.scss'],
})
export class CandidateDashboardComponent implements OnInit {
  stats = {
    totalApplications: 0,
    shortlisted: 0,
    interviews: 0,
    offers: 0,
  };

  recentApplications: Application[] = [];
  recommendedJobs: Job[] = [];
  upcomingInterviews: Interview[] = [];
  isLoading = true;
  rescheduleInterviewId: string | null = null;
  rescheduleError = '';
  rescheduleForm = {
    newScheduledAt: '',
    rescheduleReason: '',
  };
  isSubmittingReschedule = false;

  constructor(
    private applicationService: ApplicationService,
    private jobService: JobService,
    private interviewService: InterviewService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    Promise.all([
      this.loadApplications(),
      this.loadRecommendedJobs(),
      this.loadUpcomingInterviews(),
    ]).then(() => {
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }

  loadApplications(): Promise<void> {
    return new Promise((resolve) => {
      this.applicationService.getMyApplications().subscribe({
        next: (applications) => {
          this.recentApplications = applications
            .filter((application) => !application.isWithdrawn)
            .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
            .slice(0, 5);
          this.calculateStats(applications);
          this.cdr.detectChanges();
          resolve();
        },
        error: () => {
          this.recentApplications = [];
          this.calculateStats([]);
          this.cdr.detectChanges();
          resolve();
        },
      });
    });
  }

  calculateStats(applications: Application[]): void {
    const activeApplications = applications.filter((application) => !application.isWithdrawn);
    this.stats.totalApplications = activeApplications.length;
    this.stats.shortlisted = activeApplications.filter((a) => a.status === 'SHORTLISTED').length;
    this.stats.interviews = activeApplications.filter((a) => a.status === 'INTERVIEW_SCHEDULED').length;
    this.stats.offers = activeApplications.filter((a) => a.status === 'OFFERED').length;
  }

  getApplicationTitle(application: Application): string {
    return application.jobTitle || application.job?.title || 'Job application';
  }

  getApplicationCompany(application: Application): string {
    return application.companyName || application.job?.companyName || 'Company not specified';
  }

  loadRecommendedJobs(): Promise<void> {
    return new Promise((resolve) => {
      this.jobService.getJobs({}).subscribe({
        next: (jobs) => {
          this.recommendedJobs = jobs.slice(0, 6);
          this.cdr.detectChanges();
          resolve();
        },
        error: () => resolve(),
      });
    });
  }

  loadUpcomingInterviews(): Promise<void> {
    return new Promise((resolve) => {
      this.interviewService.getMyInterviews().subscribe({
        next: (interviews) => {
          const now = new Date();
          this.upcomingInterviews = interviews
            .filter((i) => ['SCHEDULED', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'RESCHEDULED'].includes(i.status) && new Date(i.scheduledAt) > now)
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
            .slice(0, 3);
            this.cdr.detectChanges();
          resolve();
        },
        error: () => resolve(),
      });
    });
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      APPLIED: 'status-applied',
      SHORTLISTED: 'status-shortlisted',
      INTERVIEW_SCHEDULED: 'status-interview',
      OFFERED: 'status-offered',
      REJECTED: 'status-rejected',
    };
    return classes[status] || '';
  }

  openRescheduleRequest(interview: Interview): void {
    this.rescheduleInterviewId = interview.interviewId;
    this.rescheduleForm = {
      newScheduledAt: '',
      rescheduleReason: '',
    };
    this.rescheduleError = '';
  }

  submitRescheduleRequest(): void {
    if (this.isSubmittingReschedule) {
      return;
    }

    if (!this.rescheduleInterviewId || !this.rescheduleForm.newScheduledAt || !this.rescheduleForm.rescheduleReason.trim()) {
      this.rescheduleError = 'Please select a new date/time and enter a reason.';
      return;
    }

    if (!this.isFutureDateTime(this.rescheduleForm.newScheduledAt)) {
      this.rescheduleError = 'Please choose a future date and time.';
      return;
    }

    this.isSubmittingReschedule = true;
    this.rescheduleError = '';
    this.interviewService.requestReschedule(this.rescheduleInterviewId, {
      newScheduledAt: this.rescheduleForm.newScheduledAt,
      rescheduleReason: this.rescheduleForm.rescheduleReason.trim()
    }).subscribe({
      next: () => {
        this.isSubmittingReschedule = false;
        this.closeRescheduleRequest();
        this.loadUpcomingInterviews();
      },
      error: (err) => {
        console.error(err);
        this.isSubmittingReschedule = false;
        this.rescheduleError = err?.error?.message || 'Failed to request reschedule. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  closeRescheduleRequest(): void {
    this.rescheduleInterviewId = null;
    this.rescheduleError = '';
    this.isSubmittingReschedule = false;
  }

  getMinimumDateTime(): string {
    return this.toDateTimeLocalValue(new Date());
  }

  private isFutureDateTime(value: string): boolean {
    return new Date(value).getTime() > Date.now();
  }

  private toDateTimeLocalValue(date: Date): string {
    const pad = (number: number) => number.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}

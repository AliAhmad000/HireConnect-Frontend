// src/app/features/recruiter/dashboard/recruiter-dashboard.component.ts
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JobService } from '../../../core/services/job.service';
import { ApplicationService } from '../../../core/services/application.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { InterviewService } from '../../../core/services/interview.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { Job } from '../../../core/models/job.model';
import { Application } from '../../../core/models/application.model';
import { AnalyticsSummary } from '../../../core/models/analytics.model';
import { Interview } from '../../../core/models/interview.model';
import { Subscription } from '../../../core/models/subscription.model';
import { ToastrService } from 'ngx-toastr';
import { ChartConfiguration } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { getApiOrigin } from '../../../core/utils/url.util';

@Component({
  selector: 'app-recruiter-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NgChartsModule, FormsModule],
  templateUrl: './recruiter-dashboard.component.html',
  styleUrls: ['./recruiter-dashboard.component.scss'],
})
export class RecruiterDashboardComponent implements OnInit {
  analytics: AnalyticsSummary = {
    totalJobs: 0,
    totalApplications: 0,
    shortlistedCount: 0,
    offeredCount: 0,
    rejectedCount: 0,
    avgTimeToHireDays: 0,
    viewToApplyRatio: 0,
  };
  recruiterJobs: Job[] = [];
  allApplications: Application[] = [];
  activeJobs: Job[] = [];
  activeJobsCount = 0;
  recentApplications: Application[] = [];
  pendingRescheduleRequests: Interview[] = [];
  currentSubscription: Subscription | null = null;
  reschedulingInterviewId: string | null = null;
  rescheduleForm = {
    newScheduledAt: '',
    rescheduleReason: '',
    meetLink: '',
    location: '',
  };
  rescheduleError = '';
  isLoading = true;
  isProcessingAction = false;

  // Quick action cards
  quickActions = [
    { label: 'Post New Job', icon: 'add_box', route: '/recruiter/post-job', color: '#667eea' },
    {
      label: 'Review Applications',
      icon: 'rule_folder',
      route: '/recruiter/applications',
      color: '#4caf50',
    },
    {
      label: 'Schedule Interview',
      icon: 'event',
      route: '/recruiter/applications',
      color: '#ff9800',
    },
    { label: 'View Analytics', icon: 'monitoring', route: '/recruiter/analytics', color: '#9c27b0' },
  ];

  // Chart configurations
  applicationChartData: ChartConfiguration<'line'>['data'] = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [65, 59, 80, 81, 56, 55],
        label: 'Applications',
        fill: true,
        tension: 0.5,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
      },
    ],
  };

  pipelineChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Applied', 'Shortlisted', 'Interview', 'Offered', 'Rejected'],
    datasets: [
      {
        data: [0, 0, 0, 0, 0],
        backgroundColor: ['#1976d2', '#f57c00', '#7b1fa2', '#2e7d32', '#c62828'],
        borderWidth: 0,
      },
    ],
  };

  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };
  private toastr = inject(ToastrService);
  constructor(
    private jobService: JobService,
    private applicationService: ApplicationService,
    private analyticsService: AnalyticsService,
    private authService: AuthService,
    private profileService: ProfileService,
    private interviewService: InterviewService,
    private subscriptionService: SubscriptionService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    const recruiterId = this.authService.getCurrentUser()?.userId;

    Promise.all([
      this.loadAnalytics(),
      this.loadCurrentSubscription(),
      this.loadActiveJobs(),
      recruiterId ? this.loadRecentApplicationsByRecruiter(recruiterId) : this.loadRecentApplications(),
      recruiterId ? this.loadRescheduleRequests(recruiterId) : Promise.resolve(),
    ]).then(() => {
      this.applyDashboardMetrics();
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }

  loadAnalytics(): Promise<void> {
    return new Promise((resolve) => {
      this.analyticsService.getRecruiterAnalytics().subscribe({
        next: (data) => {
          this.analytics = data;
          this.setupCharts(data);
          this.cdr.detectChanges();
          resolve();
        },
        error: () => {
          // Set default analytics if API fails
          this.analytics = {
            totalJobs: 0,
            totalApplications: 0,
            shortlistedCount: 0,
            offeredCount: 0,
            rejectedCount: 0,
            avgTimeToHireDays: 0,
            viewToApplyRatio: 0,
          };
          this.cdr.detectChanges();
          resolve();
        },
      });
    });
  }

  loadActiveJobs(): Promise<void> {
    return new Promise((resolve) => {
      this.jobService.getRecruiterJobs(undefined, 200).subscribe({
        next: (jobs) => {
          this.recruiterJobs = jobs || [];
          this.refreshActiveJobs();
          this.cdr.detectChanges();
          resolve();
        },
        error: () => {
          this.recruiterJobs = [];
          this.activeJobsCount = 0;
          this.activeJobs = [];
          this.cdr.detectChanges();
          resolve();
        },
      });
    });
  }

  loadRecentApplications(): Promise<void> {
    return new Promise((resolve) => {
      this.jobService.getRecruiterJobs(undefined, 200).subscribe({
        next: (jobs) => {
          if (jobs.length > 0) {
            const jobIds = jobs.map((j) => j.jobId);
            let completedRequests = 0;
            const allApplications: Application[] = [];

            if (jobIds.length === 0) {
              this.recentApplications = [];
              this.cdr.detectChanges();
              resolve();
              return;
            }

            jobIds.forEach((jobId) => {
              this.applicationService.getApplicationsByJob(jobId).subscribe({
                next: (applications) => {
                  allApplications.push(...applications);
                  completedRequests++;
                  if (completedRequests === jobIds.length) {
                    // Sort by most recent and take top 10
                    this.setApplications(allApplications);
                    this.cdr.detectChanges();
                    resolve();
                  }
                },
                error: () => {
                  completedRequests++;
                  if (completedRequests === jobIds.length) {
                    this.setApplications(allApplications);
                    this.cdr.detectChanges();
                    resolve();
                  }
                },
              });
            });
          } else {
            this.setApplications([]);
            this.cdr.detectChanges();
            resolve();
          }
        },
        error: () => {
          this.setApplications([]);
          this.cdr.detectChanges();
          resolve();
        },
      });
    });
  }

  loadCurrentSubscription(): Promise<void> {
    return new Promise((resolve) => {
      this.subscriptionService.getCurrentSubscription().subscribe({
        next: (subscription) => {
          this.currentSubscription = subscription;
          this.cdr.detectChanges();
          resolve();
        },
        error: () => {
          this.currentSubscription = {
            subscriptionId: 'free',
            recruiterId: '',
            plan: 'FREE',
            status: 'ACTIVE',
            startDate: new Date().toISOString(),
            amountPaid: 0,
            maxJobPosts: 3,
            isActive: true,
          };
          this.cdr.detectChanges();
          resolve();
        },
      });
    });
  }

  loadRecentApplicationsByRecruiter(recruiterId: string): Promise<void> {
    return new Promise((resolve) => {
      this.applicationService.getApplicationsByRecruiter(recruiterId, 200).subscribe({
        next: (applications) => {
          this.setApplications(applications);
          this.cdr.detectChanges();
          resolve();
        },
        error: () => {
          this.loadRecentApplications().then(resolve);
        },
      });
    });
  }

  loadRescheduleRequests(recruiterId: string): Promise<void> {
    return new Promise((resolve) => {
      this.interviewService.getInterviewsByRecruiter(recruiterId).subscribe({
        next: (interviews) => {
          this.pendingRescheduleRequests = interviews
            .filter((interview) => !!interview.requestedScheduledAt)
            .sort((a, b) => new Date(a.requestedScheduledAt || a.scheduledAt).getTime() - new Date(b.requestedScheduledAt || b.scheduledAt).getTime());
          this.cdr.detectChanges();
          resolve();
        },
        error: () => {
          this.pendingRescheduleRequests = [];
          this.cdr.detectChanges();
          resolve();
        },
      });
    });
  }

  private setApplications(applications: Application[]): void {
    this.allApplications = [...applications].sort(
      (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
    );
    this.recentApplications = this.allApplications.slice(0, 10);
  }

  private applyDashboardMetrics(): void {
    this.refreshActiveJobs();

    const statusCounts = this.allApplications.reduce<Record<string, number>>((counts, app) => {
      counts[app.status] = (counts[app.status] || 0) + 1;
      return counts;
    }, {});

    const totalJobViews =
      this.analytics.totalJobViews ||
      this.recruiterJobs.reduce((total, job) => total + (job.viewCount || 0), 0);

    this.analytics = {
      ...this.analytics,
      totalJobs: this.recruiterJobs.length,
      totalApplications: this.allApplications.length,
      totalJobViews,
      shortlistedCount: statusCounts['SHORTLISTED'] || 0,
      interviewScheduledCount: statusCounts['INTERVIEW_SCHEDULED'] || 0,
      offeredCount: statusCounts['OFFERED'] || 0,
      rejectedCount: statusCounts['REJECTED'] || 0,
      avgTimeToHireDays: this.calculateAvgTimeToHireDays(),
      viewToApplyRatio: totalJobViews > 0
        ? Math.round((this.allApplications.length / totalJobViews) * 10000) / 100
        : 0,
      applicationsByStatus: statusCounts,
    };

    this.setupCharts(this.analytics);
  }

  private refreshActiveJobs(): void {
    const applicationCountsByJob = this.allApplications.reduce<Record<string, number>>((counts, app) => {
      if (app.jobId) {
        const jobId = String(app.jobId);
        counts[jobId] = (counts[jobId] || 0) + 1;
      }
      return counts;
    }, {});

    this.recruiterJobs = this.recruiterJobs.map((job) => ({
      ...job,
      applicationsCount: applicationCountsByJob[String(job.jobId)] ?? job.applicationsCount ?? 0,
    }));

    const activeJobs = this.recruiterJobs.filter((job) => this.normalizeStatus(job.status) === 'ACTIVE');
    this.activeJobsCount = activeJobs.length;
    this.activeJobs = activeJobs
      .sort((a, b) => new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime())
      .slice(0, 5);
  }

  private normalizeStatus(status: string | undefined | null): string {
    return String(status || '').trim().toUpperCase();
  }

  private calculateAvgTimeToHireDays(): number {
    const hiredApplications = this.allApplications.filter((app) => app.status === 'OFFERED');
    const durations = hiredApplications
      .map((app) => {
        const appliedAt = new Date(app.appliedAt).getTime();
        const completedAt = new Date((app as any).statusUpdatedAt || (app as any).updatedAt || '').getTime();

        if (!Number.isFinite(appliedAt) || !Number.isFinite(completedAt) || completedAt < appliedAt) {
          return null;
        }

        return (completedAt - appliedAt) / (1000 * 60 * 60 * 24);
      })
      .filter((duration): duration is number => duration !== null);

    if (durations.length === 0) {
      return 0;
    }

    const total = durations.reduce((sum, duration) => sum + duration, 0);
    return Math.round((total / durations.length) * 10) / 10;
  }

  setupCharts(analytics: AnalyticsSummary): void {
    const appliedCount = analytics.applicationsByStatus?.['APPLIED'] || 0;
    this.pipelineChartData = {
      labels: ['Applied', 'Shortlisted', 'Interview', 'Offered', 'Rejected'],
      datasets: [
        {
          data: [
            appliedCount,
            analytics.shortlistedCount || 0,
            analytics.interviewScheduledCount || 0,
            analytics.offeredCount || 0,
            analytics.rejectedCount || 0,
          ],
          backgroundColor: ['#1976d2', '#f57c00', '#7b1fa2', '#2e7d32', '#c62828'],
          borderWidth: 0,
        },
      ],
    };
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      APPLIED: 'status-applied',
      SHORTLISTED: 'status-shortlisted',
      INTERVIEW_SCHEDULED: 'status-interview',
      OFFERED: 'status-offered',
      REJECTED: 'status-rejected',
      WITHDRAWN: 'status-withdrawn',
    };
    return classes[status] || 'status-applied';
  }

  /**
   * Download candidate's resume
   * Opens the resume URL in a new tab or triggers download
   */
  downloadResume(app: Application): void {
    if (!app) {
      this.toastr.error('Application data not available');
      return;
    }

    const resumeWindow = window.open('about:blank', '_blank');
    const resumeUrl = app.resumeUrl || app.candidate?.resumeUrl;

    if (resumeUrl) {
      this.openResumeUrl(resumeUrl, resumeWindow);
      return;
    }

    if (!app.candidateId) {
      resumeWindow?.close();
      this.toastr.warning('No resume available for this candidate', 'Resume Not Found');
      return;
    }

    this.profileService.getCandidateResumeUrl(app.candidateId).subscribe({
      next: (profileResumeUrl) => {
        if (!profileResumeUrl) {
          resumeWindow?.close();
          this.toastr.warning('No resume available for this candidate', 'Resume Not Found');
          return;
        }

        app.resumeUrl = profileResumeUrl;
        this.openResumeUrl(profileResumeUrl, resumeWindow);
      },
      error: () => {
        resumeWindow?.close();
        this.toastr.warning('No resume available for this candidate', 'Resume Not Found');
      },
    });
  }

  private openResumeUrl(url: string, resumeWindow: Window | null): void {
    const absoluteUrl = this.toAbsoluteResumeUrl(url);

    if (resumeWindow) {
      resumeWindow.location.href = absoluteUrl;
    } else {
      window.open(absoluteUrl, '_blank');
    }

    this.toastr.success('Resume opened in new tab');
  }

  private toAbsoluteResumeUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    const apiOrigin = getApiOrigin();
    return `${apiOrigin}${url.startsWith('/') ? url : `/${url}`}`;
  }

  /**
   * Shortlist a candidate by updating their application status
   */
  shortlistCandidate(applicationId: string): void {
    if (!applicationId) {
      this.toastr.error('Invalid application ID');
      return;
    }

    // Check if already shortlisted
    const application = this.recentApplications.find((a) => a.applicationId === applicationId);
    if (application?.status === 'SHORTLISTED') {
      this.toastr.info('Candidate is already shortlisted');
      return;
    }

    this.isProcessingAction = true;

    this.applicationService.shortlistCandidate(applicationId).subscribe({
      next: (updatedApplication) => {
        // Update the application in the local list
        const index = this.recentApplications.findIndex((a) => a.applicationId === applicationId);
        if (index !== -1) {
          this.recentApplications[index] = updatedApplication;
        }

        // Update analytics
        if (this.analytics) {
          this.analytics.shortlistedCount = (this.analytics.shortlistedCount || 0) + 1;
          this.setupCharts(this.analytics);
        }

        this.toastr.success(
          `${this.getCandidateName(updatedApplication)} has been shortlisted successfully`,
          'Candidate Shortlisted',
        );
        this.isProcessingAction = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error shortlisting candidate:', error);
        this.toastr.error('Failed to shortlist candidate. Please try again.', 'Error');
        this.isProcessingAction = false;
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Bulk shortlist candidates
   */
  shortlistCandidates(applicationIds: string[]): void {
    if (!applicationIds || applicationIds.length === 0) {
      this.toastr.warning('No candidates selected');
      return;
    }

    this.isProcessingAction = true;
    let completedCount = 0;
    let successCount = 0;
    const totalCount = applicationIds.length;

    applicationIds.forEach((id) => {
      this.applicationService.shortlistCandidate(id).subscribe({
        next: () => {
          successCount++;
          completedCount++;
          this.checkBulkCompletion(completedCount, totalCount, successCount);
        },
        error: () => {
          completedCount++;
          this.checkBulkCompletion(completedCount, totalCount, successCount);
        },
      });
    });
  }

  private checkBulkCompletion(completed: number, total: number, success: number): void {
    if (completed === total) {
      this.isProcessingAction = false;
      if (success === total) {
        this.toastr.success(`All ${total} candidates shortlisted successfully`);
      } else {
        this.toastr.warning(`${success} out of ${total} candidates shortlisted`);
      }
      // Reload dashboard data
      this.loadDashboardData();
    }
  }

  /**
   * Reject a candidate
   */
  rejectCandidate(applicationId: string): void {
    if (!applicationId) return;

    const application = this.recentApplications.find((a) => a.applicationId === applicationId);
    if (application?.status === 'REJECTED') {
      this.toastr.info('Candidate is already rejected');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to reject ${application?.candidate?.fullName || 'this candidate'}?`,
      )
    ) {
      return;
    }

    this.isProcessingAction = true;

    this.applicationService
      .updateApplicationStatus(applicationId, {
        status: 'REJECTED',
        rejectionReason: 'Rejected by recruiter',
      })
      .subscribe({
        next: (updatedApplication) => {
          const index = this.recentApplications.findIndex((a) => a.applicationId === applicationId);
          if (index !== -1) {
            this.recentApplications[index] = updatedApplication;
          }

          if (this.analytics) {
            this.analytics.rejectedCount = (this.analytics.rejectedCount || 0) + 1;
            this.setupCharts(this.analytics);
          }

          this.toastr.success('Candidate rejected');
          this.isProcessingAction = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.toastr.error('Failed to reject candidate');
          this.isProcessingAction = false;
          this.cdr.detectChanges();
        },
      });
  }

  /**
   * Navigate to schedule interview page for a specific application
   */
  scheduleInterview(applicationId: string): void {
    this.router.navigate(['/recruiter/applications', applicationId], {
      queryParams: { schedule: 'true' },
    });
  }

  openDashboardRescheduler(interview: Interview): void {
    this.reschedulingInterviewId = interview.interviewId;
    this.rescheduleForm = {
      newScheduledAt: this.toDateTimeLocalValue(interview.requestedScheduledAt || interview.scheduledAt),
      rescheduleReason: interview.rescheduleReason || 'Rescheduled by recruiter',
      meetLink: interview.meetLink || '',
      location: interview.location || '',
    };
    this.rescheduleError = '';
  }

  closeDashboardRescheduler(): void {
    this.reschedulingInterviewId = null;
    this.rescheduleError = '';
  }

  submitDashboardReschedule(interview: Interview): void {
    if (!this.rescheduleForm.newScheduledAt) {
      this.rescheduleError = 'Please choose a new date and time.';
      return;
    }

    if (new Date(this.rescheduleForm.newScheduledAt).getTime() <= Date.now()) {
      this.rescheduleError = 'Please choose a future date and time.';
      return;
    }

    this.isProcessingAction = true;
    this.interviewService.rescheduleInterview(interview.interviewId, {
      newScheduledAt: this.rescheduleForm.newScheduledAt,
      rescheduleReason: this.rescheduleForm.rescheduleReason || interview.rescheduleReason || 'Rescheduled by recruiter',
      meetLink: this.rescheduleForm.meetLink || undefined,
      location: this.rescheduleForm.location || undefined,
    }).subscribe({
      next: () => {
        this.toastr.success('Interview rescheduled successfully');
        this.pendingRescheduleRequests = this.pendingRescheduleRequests.filter((item) => item.interviewId !== interview.interviewId);
        this.closeDashboardRescheduler();
        this.isProcessingAction = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Failed to reschedule interview');
        this.isProcessingAction = false;
        this.cdr.detectChanges();
      },
    });
  }

  rejectDashboardReschedule(interview: Interview): void {
    const reason = prompt('Reason for declining the reschedule request:');
    if (reason === null) {
      return;
    }

    this.isProcessingAction = true;
    this.interviewService.rejectReschedule(interview.interviewId, reason || 'Declined by recruiter').subscribe({
      next: () => {
        this.toastr.info('Reschedule request declined');
        this.pendingRescheduleRequests = this.pendingRescheduleRequests.filter((item) => item.interviewId !== interview.interviewId);
        this.isProcessingAction = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Failed to decline reschedule request');
        this.isProcessingAction = false;
        this.cdr.detectChanges();
      },
    });
  }

  getMinimumDateTime(): string {
    return this.toDateTimeLocalValue(new Date());
  }

  getSubscriptionUsagePercent(): number {
    const maxPosts = this.currentSubscription?.maxJobPosts || 3;
    if (maxPosts <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((this.activeJobsCount / maxPosts) * 100));
  }

  private toDateTimeLocalValue(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    const pad = (number: number) => number.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  /**
   * Navigate to view full application details
   */
  viewApplicationDetails(applicationId: string): void {
    this.router.navigate(['/recruiter/applications', applicationId]);
  }

  /**
   * Navigate to view job details
   */
  viewJobDetails(jobId: string): void {
    this.router.navigate(['/recruiter/jobs', jobId]);
  }

  getCandidateName(app: Application): string {
    return app.candidate?.fullName || app.candidateName || 'Candidate';
  }

  getCandidateEmail(app: Application): string {
    return app.candidate?.email || app.candidateEmail || '';
  }

  getJobTitle(app: Application): string {
    return app.job?.title || app.jobTitle || 'Job';
  }

  /**
   * Refresh dashboard data
   */
  refreshDashboard(): void {
    this.loadDashboardData();
    this.toastr.info('Dashboard refreshed');
  }

  /**
   * Export dashboard data as CSV
   */
  exportDashboardData(): void {
    // Prepare CSV data
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Metric,Value\r\n';

    if (this.analytics) {
      csvContent += `Total Jobs,${this.analytics.totalJobs}\r\n`;
      csvContent += `Total Applications,${this.analytics.totalApplications}\r\n`;
      csvContent += `Shortlisted,${this.analytics.shortlistedCount}\r\n`;
      csvContent += `Offered,${this.analytics.offeredCount}\r\n`;
      csvContent += `Rejected,${this.analytics.rejectedCount}\r\n`;
      csvContent += `Avg Time to Hire (Days),${this.analytics.avgTimeToHireDays}\r\n`;
      csvContent += `View to Apply Ratio,${this.analytics.viewToApplyRatio}%\r\n`;
    }

    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `recruiter-dashboard-${new Date().toISOString().split('T')[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.toastr.success('Dashboard data exported successfully');
  }
}

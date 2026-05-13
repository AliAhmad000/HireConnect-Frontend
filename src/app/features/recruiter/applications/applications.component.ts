// src/app/features/recruiter/applications/applications.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApplicationService } from '../../../core/services/application.service';
import { JobService } from '../../../core/services/job.service';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { Application, ApplicationStatus } from '../../../core/models/application.model';
import { Job } from '../../../core/models/job.model';
import { getApiOrigin } from '../../../core/utils/url.util';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './applications.component.html',
  styleUrls: ['./applications.component.scss'],
})
export class ApplicationsComponent implements OnInit {
  applications: Application[] = [];
  filteredApplications: Application[] = [];
  jobs: Job[] = [];
  filterForm: FormGroup;
  isLoading = true;
  messagePanelApplication: Application | null = null;
  candidateMessage = '';
  messageError = '';
  isSendingMessage = false;

  statuses: ApplicationStatus[] = [
    'APPLIED',
    'SHORTLISTED',
    'INTERVIEW_SCHEDULED',
    'OFFERED',
    'REJECTED',
  ];

  constructor(
    private applicationService: ApplicationService,
    private jobService: JobService,
    private profileService: ProfileService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.filterForm = this.fb.group({
      jobId: [''],
      status: [''],
      search: [''],
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.route.queryParamMap.subscribe((params) => {
      const jobId = params.get('jobId') || '';
      if (jobId && this.filterForm.get('jobId')?.value !== jobId) {
        this.filterForm.patchValue({ jobId }, { emitEvent: false });
        this.applyFilters();
      }
    });
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  loadData(): void {
    this.isLoading = true;
    Promise.all([this.loadJobs(), this.loadApplications()]).then(() => {
      this.isLoading = false;
      this.applyFilters();
      this.cdr.detectChanges();
    });
  }

  loadApplications(): Promise<void> {
    return new Promise((resolve) => {
      const recruiterId = this.authService.getCurrentUser()?.userId;
      if (recruiterId) {
        this.applicationService.getApplicationsByRecruiter(String(recruiterId)).subscribe({
          next: (applications) => {
            this.setApplications(applications);
            resolve();
          },
          error: () => this.loadApplicationsByRecruiterJobs(resolve),
        });
        return;
      }

      this.loadApplicationsByRecruiterJobs(resolve);
    });
  }

  private loadApplicationsByRecruiterJobs(resolve: () => void): void {
      this.jobService.getRecruiterJobs().subscribe({
        next: (jobs) => {
          const jobIds = jobs.map((job) => job.jobId);

          if (jobIds.length === 0) {
            this.applications = [];
            this.filteredApplications = [];
            this.cdr.detectChanges();
            resolve();
            return;
          }

          forkJoin(
            jobIds.map((jobId) =>
              this.applicationService.getApplicationsByJob(jobId).pipe(catchError(() => of([] as Application[]))),
            ),
          ).subscribe({
            next: (applicationGroups) => {
              this.setApplications(applicationGroups.flat());
              resolve();
            },
            error: () => {
              this.applications = [];
              this.filteredApplications = [];
              this.cdr.detectChanges();
              resolve();
            },
          });
        },
        error: () => {
          this.applications = [];
          this.filteredApplications = [];
          this.cdr.detectChanges();
          resolve();
        },
      });
  }

  loadJobs(): Promise<void> {
    return new Promise((resolve) => {
      this.jobService.getRecruiterJobs().subscribe({
        next: (jobs) => {
          this.jobs = (jobs || []).filter((job) => job.status !== 'DRAFT');
          this.cdr.detectChanges();
          resolve();
        },
        error: () => {
          this.jobs = [];
          this.cdr.detectChanges();
          resolve();
        },
      });
    });
  }

  applyFilters(): void {
    const { jobId, status, search } = this.filterForm.value;
    const normalizedJobId = String(jobId || '');
    const normalizedSearch = String(search || '').trim().toLowerCase();

    this.filteredApplications = this.applications.filter((app) => {
      const matchesJob = !normalizedJobId || String(app.jobId) === normalizedJobId;
      const matchesStatus = !status || app.status === status;
      const matchesSearch =
        !normalizedSearch ||
        this.getCandidateName(app).toLowerCase().includes(normalizedSearch) ||
        this.getCandidateEmail(app).toLowerCase().includes(normalizedSearch) ||
        this.getJobTitle(app).toLowerCase().includes(normalizedSearch);

      return matchesJob && matchesStatus && matchesSearch;
    });
    this.cdr.detectChanges();
  }

  resetFilters(): void {
    this.filterForm.reset({ jobId: '', status: '', search: '' });
    this.filteredApplications = [...this.applications];
    this.cdr.detectChanges();
  }

  filterByStatus(status: ApplicationStatus | ''): void {
    this.filterForm.patchValue({ status });
  }

  updateStatus(applicationId: string, status: ApplicationStatus): void {
    this.applicationService.updateApplicationStatus(applicationId, { status }).subscribe({
      next: (updatedApp) => {
        const index = this.applications.findIndex((a) => a.applicationId === applicationId);
        if (index !== -1) {
          this.applications[index] = updatedApp;
          this.applyFilters();
        }
        this.toastr.success(`Application marked as ${status.replace('_', ' ').toLowerCase()}`);
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.toastr.error(error?.error?.message || 'Failed to update application status');
      },
    });
  }

  shortlistCandidate(applicationId: string): void {
    this.updateStatus(applicationId, 'SHORTLISTED');
  }

  rejectCandidate(applicationId: string): void {
    if (confirm('Are you sure you want to reject this candidate?')) {
      this.updateStatus(applicationId, 'REJECTED');
    }
  }

  downloadResume(application: Application): void {
    const resumeUrl = application.resumeUrl || application.candidate?.resumeUrl;
    const resumeWindow = window.open('about:blank', '_blank');

    if (resumeUrl) {
      this.openResumeUrl(resumeUrl, resumeWindow);
      return;
    }

    if (!application.candidateId) {
      resumeWindow?.close();
      alert('No resume available for this candidate.');
      return;
    }

    this.profileService.getCandidateResumeUrl(application.candidateId).subscribe({
      next: (profileResumeUrl) => {
        if (!profileResumeUrl) {
          resumeWindow?.close();
          alert('No resume available for this candidate.');
          return;
        }

        application.resumeUrl = profileResumeUrl;
        this.openResumeUrl(profileResumeUrl, resumeWindow);
      },
      error: () => {
        resumeWindow?.close();
        alert('No resume available for this candidate.');
      },
    });
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

  getCandidateSkills(app: Application): string[] {
    return app.candidate?.skills || [];
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

  canMessageCandidate(app: Application): boolean {
    return ['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'OFFERED'].includes(this.normalizeStatus(app.status));
  }

  isShortlisted(app: Application): boolean {
    return this.normalizeStatus(app.status) === 'SHORTLISTED';
  }

  openMessagePanel(app: Application): void {
    if (!this.canMessageCandidate(app)) {
      this.messageError = 'Messaging is available after the candidate is shortlisted, scheduled, or offered.';
      return;
    }

    this.messagePanelApplication = app;
    this.candidateMessage = '';
    this.messageError = '';
    this.cdr.detectChanges();
  }

  closeMessagePanel(): void {
    if (this.isSendingMessage) {
      return;
    }

    this.messagePanelApplication = null;
    this.candidateMessage = '';
    this.messageError = '';
    this.cdr.detectChanges();
  }

  sendMessageToCandidate(): void {
    if (!this.messagePanelApplication) {
      return;
    }

    const message = this.candidateMessage.trim();
    if (!message) {
      this.messageError = 'Please enter a message.';
      this.cdr.detectChanges();
      return;
    }

    this.isSendingMessage = true;
    this.messageError = '';
    this.applicationService
      .sendMessageToCandidate(this.messagePanelApplication.applicationId, message)
      .subscribe({
        next: () => {
          this.toastr.success('Message sent to candidate');
          this.messagePanelApplication = null;
          this.candidateMessage = '';
          this.isSendingMessage = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.messageError = error?.error?.message || 'Failed to send message. Please try again.';
          this.isSendingMessage = false;
          this.cdr.detectChanges();
        },
      });
  }

  exportCsv(): void {
    if (!this.filteredApplications.length) {
      this.toastr.info('No applications to export');
      return;
    }

    const rows = this.filteredApplications.map((app) => [
      this.getCandidateName(app),
      this.getCandidateEmail(app),
      this.getJobTitle(app),
      app.status,
      app.appliedAt,
      app.resumeUrl || app.candidate?.resumeUrl || '',
    ]);
    const csv = [
      ['Candidate Name', 'Candidate Email', 'Job Title', 'Status', 'Applied At', 'Resume URL'],
      ...rows,
    ].map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  composeBulkEmail(): void {
    const emails = Array.from(new Set(
      this.filteredApplications
        .map((app) => this.getCandidateEmail(app))
        .filter(Boolean)
    ));

    if (!emails.length) {
      this.toastr.info('No candidate emails available for the current list');
      return;
    }

    window.location.href = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent('Update on your HireConnect application')}`;
  }

  getApplicationsCount(status?: string): number {
    if (!status) return this.applications.length;
    return this.applications.filter((a) => a.status === status).length;
  }

  private toAbsoluteResumeUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    const apiOrigin = getApiOrigin();
    return `${apiOrigin}${url.startsWith('/') ? url : `/${url}`}`;
  }

  private openResumeUrl(url: string, resumeWindow: Window | null): void {
    const absoluteUrl = this.toAbsoluteResumeUrl(url);

    if (resumeWindow) {
      resumeWindow.location.href = absoluteUrl;
    } else {
      window.open(absoluteUrl, '_blank');
    }
  }

  private normalizeStatus(status: string | null | undefined): string {
    return String(status || '').trim().toUpperCase().replace(/\s+/g, '_');
  }

  private setApplications(applications: Application[]): void {
    this.applications = (applications || [])
      .filter((app) => !app.isWithdrawn && app.status !== 'WITHDRAWN')
      .sort((a, b) => new Date(b.appliedAt || 0).getTime() - new Date(a.appliedAt || 0).getTime());
    this.filteredApplications = [...this.applications];
    this.cdr.detectChanges();
  }

  private getSampleApplications(): Application[] {
    return [
      {
        applicationId: '1',
        jobId: 'job1',
        candidateId: 'cand1',
        appliedAt: '2024-01-15T10:30:00Z',
        status: 'APPLIED',
        coverLetter: 'I am excited to apply for this position...',
        resumeUrl: '#',
        candidate: {
          profileId: 'prof1',
          userId: 'user1',
          fullName: 'John Doe',
          email: 'john@example.com',
          mobile: '+1234567890',
          skills: ['Angular', 'TypeScript', 'Node.js'],
          experience: 3,
          resumeUrl: '#',
          preferredLocations: [],
          addresses: [],
          createdAt: '',
          updatedAt: '',
        },
        job: {
          jobId: 'job1',
          title: 'Senior Frontend Developer',
          category: 'Technology',
          jobType: 'FULL_TIME',
          location: 'San Francisco, CA',
          salaryMin: 120000,
          salaryMax: 180000,
          skills: ['Angular', 'TypeScript', 'RxJS'],
          experienceRequired: 1,
          description: '',
          postedBy: '',
          companyName: 'Tech Corp',
          companyLogo: '',

          vacancies: 5,
          isRemote: true,
          expiresAt: '2026-12-31',

          status: 'ACTIVE',
          postedAt: '',
          applicationsCount: 0,
          viewCount: 0,
        },
      },
    ];
  }
}

// src/app/features/recruiter/job-detail/job-detail.component.ts
import { Component, OnInit , inject, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { JobService } from '../../../core/services/job.service';
import { ApplicationService } from '../../../core/services/application.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { ProfileService } from '../../../core/services/profile.service';
import { Job } from '../../../core/models/job.model';
import { Application } from '../../../core/models/application.model';
import { JobAnalytics } from '../../../core/models/analytics.model';
import { ToastrService } from 'ngx-toastr';
import { ApplicationStatus } from '../../../core/models/application.model';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './job-detail.component.html',
  styleUrls: ['./job-detail.component.scss']
})
export class JobDetailComponent implements OnInit {
  job: Job | null = null;
  applications: Application[] = [];
  analytics: JobAnalytics | null = null;
  isLoading = true;
  jobId: string = '';
  recruiterCompanyName = '';
  recruiterLogoUrl = '';

  // Pipeline stages for visualization
 pipelineStages: {
  key: ApplicationStatus;
  label: string;
  color: string;
}[] = [
  { key: 'APPLIED', label: 'Applied', color: '#1976d2' },
  { key: 'SHORTLISTED', label: 'Shortlisted', color: '#f57c00' },
  { key: 'INTERVIEW_SCHEDULED', label: 'Interview', color: '#7b1fa2' },
  { key: 'OFFERED', label: 'Offered', color: '#2e7d32' },
  { key: 'REJECTED', label: 'Rejected', color: '#c62828' }
];
private toastr = inject(ToastrService);
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private jobService: JobService,
    private applicationService: ApplicationService,
    private analyticsService: AnalyticsService,
    private profileService: ProfileService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.jobId = this.route.snapshot.paramMap.get('id') || '';
    if (this.jobId) {
      this.loadData(this.jobId);
    } else {
      this.router.navigate(['/recruiter/jobs']);
    }
  }

  loadData(jobId: string): void {
    this.isLoading = true;
    Promise.all([
      this.loadRecruiterBrand(),
      this.loadJob(jobId),
      this.loadApplications(jobId),
      this.loadAnalytics(jobId)
    ]).then(() => {
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }

  loadRecruiterBrand(): Promise<void> {
    return new Promise((resolve) => {
      this.profileService.getRecruiterProfile().subscribe({
        next: (profile) => {
          this.recruiterCompanyName = profile.companyName || '';
          this.recruiterLogoUrl = profile.logoUrl || profile.logo || '';
          this.cdr.detectChanges();
          resolve();
        },
        error: () => {
          this.cdr.detectChanges();
          resolve();
        },
      });
    });
  }

  loadJob(jobId: string): Promise<void> {
    return new Promise((resolve) => {
      this.jobService.getJobById(jobId).subscribe({
        next: (job) => {
          this.job = job;
          this.cdr.detectChanges();
          resolve();
        },
        error: () => {
          this.toastr.error('Failed to load job details');
          this.router.navigate(['/recruiter/jobs']);
          this.cdr.detectChanges();
          resolve();
        }
      });
    });
  }

  loadApplications(jobId: string): Promise<void> {
    return new Promise((resolve) => {
      this.applicationService.getApplicationsByJob(jobId).subscribe({
        next: (applications) => {
          this.applications = applications;
          this.cdr.detectChanges();
          resolve();
        },
        error: () => {
          this.cdr.detectChanges();
          resolve();
        }
      });
    });
  }

  loadAnalytics(jobId: string): Promise<void> {
    return new Promise((resolve) => {
      this.analyticsService.getJobAnalytics(jobId).subscribe({
        next: (data) => {
          this.analytics = data;
          this.cdr.detectChanges();
          resolve();
        },
        error: () => {
          this.cdr.detectChanges();
          resolve();
        }
    });
  }
  )}
  getApplicationCountByStatus(status: ApplicationStatus): number {
  return this.applications.filter(a => a.status === status).length;
}

getPipelinePercentage(status: ApplicationStatus): number {
  if (!this.analytics || this.analytics.applications === 0) {
    return 0;
  }

  const count = this.getApplicationCountByStatus(status);

  return (count / this.analytics.applications) * 100;
}

  editJob(): void {
    this.router.navigate(['/recruiter/post-job'], { 
      queryParams: { edit: this.jobId } 
    });
  }

  pauseJob(): void {
    if (confirm('Are you sure you want to pause this job posting?')) {
      this.jobService.pauseJob(this.jobId).subscribe({
        next: (updatedJob) => {
          this.job = updatedJob;
          this.toastr.success('Job paused successfully');
        }
      });
    }
  }

  closeJob(): void {
    if (confirm('Are you sure you want to close this job posting? This action cannot be undone.')) {
      this.jobService.closeJob(this.jobId).subscribe({
        next: (updatedJob) => {
          this.job = updatedJob;
          this.toastr.success('Job closed successfully');
        }
      });
    }
  }

  deleteJob(): void {
    if (confirm('Are you sure you want to permanently delete this job posting?')) {
      this.jobService.deleteJob(this.jobId).subscribe({
        next: () => {
          this.toastr.success('Job deleted successfully');
          this.router.navigate(['/recruiter/jobs']);
        }
      });
    }
  }

  viewApplications(): void {
    this.router.navigate(['/recruiter/applications'], { 
      queryParams: { jobId: this.jobId } 
    });
  }

  downloadResume(application: Application): void {
    if (application.resumeUrl) {
      window.open(application.resumeUrl, '_blank');
    }
  }

  shortlistCandidate(applicationId: string): void {
    this.applicationService.updateApplicationStatus(applicationId, { 
      status: 'SHORTLISTED' 
    }).subscribe({
      next: (updatedApp) => {
        const index = this.applications.findIndex(a => a.applicationId === applicationId);
        if (index !== -1) {
          this.applications[index] = updatedApp;
        }
        this.toastr.success('Candidate shortlisted');
        this.loadAnalytics(this.jobId);
      }
    });
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'APPLIED': 'status-applied',
      'SHORTLISTED': 'status-shortlisted',
      'INTERVIEW_SCHEDULED': 'status-interview',
      'OFFERED': 'status-offered',
      'REJECTED': 'status-rejected'
    };
    return classes[status] || '';
  }

  getCompanyName(): string {
    return this.job?.companyName || this.recruiterCompanyName || 'Company';
  }

  getCompanyInitials(): string {
    const source = this.getCompanyName() || 'HC';
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'HC';
  }
}

// src/app/features/recruiter/manage-jobs/manage-jobs.component.ts
import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { JobService } from '../../../core/services/job.service';
import { ApplicationService } from '../../../core/services/application.service';
import { ProfileService } from '../../../core/services/profile.service';
import { Job } from '../../../core/models/job.model';
import { ToastrService } from 'ngx-toastr';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-manage-jobs',
   changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './manage-jobs.component.html',
  styleUrls: ['./manage-jobs.component.scss'],
})
export class ManageJobsComponent implements OnInit {
  jobs: Job[] = [];
  filteredJobs: Job[] = [];
  isLoading = true;
  statusFilter = new FormControl('ALL');
  searchControl = new FormControl('');
  recruiterCompanyName = '';
  recruiterLogoUrl = '';
  private toastr = inject(ToastrService);
  constructor(
    private jobService: JobService,
    private applicationService: ApplicationService,
    private profileService: ProfileService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const status = this.route.snapshot.queryParamMap.get('status');
    if (status && ['ALL', 'ACTIVE', 'PAUSED', 'CLOSED'].includes(status)) {
      this.statusFilter.setValue(status, { emitEvent: false });
    }
    this.loadRecruiterBrand();
    this.loadJobs();

    this.statusFilter.valueChanges.subscribe(() => this.applyFilters());
    this.searchControl.valueChanges.subscribe(() => this.applyFilters());
  }

  loadJobs(): void {
    this.isLoading = true;

    this.jobService.getRecruiterJobs().subscribe({
      next: (jobs: Job[]) => {
        this.jobs = (jobs || []).filter((job) => job.status !== 'DRAFT');
        this.applyFilters();
        this.loadApplicationCounts();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadRecruiterBrand(): void {
    this.profileService.getRecruiterProfile().subscribe({
      next: (profile) => {
        this.recruiterCompanyName = profile.companyName || '';
        this.recruiterLogoUrl = profile.logoUrl || profile.logo || '';
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      },
    });
  }

  private loadApplicationCounts(): void {
    if (!this.jobs.length) {
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    const countRequests = this.jobs.map((job) =>
      this.applicationService.countApplicationsByJob(job.jobId).pipe(
        catchError(() => of(job.applicationsCount || 0)),
      ),
    );

    forkJoin(countRequests).subscribe({
      next: (counts) => {
        this.jobs = this.jobs.map((job, index) => ({
          ...job,
          applicationsCount: counts[index] ?? 0,
        }));
        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  applyFilters(): void {
    const status = this.statusFilter.value;
    const search = this.searchControl.value?.toLowerCase() || '';

    this.filteredJobs = this.jobs.filter((job) => {
      const matchesStatus = status === 'ALL' || job.status === status;
      const matchesSearch =
        !search ||
        (job.title || '').toLowerCase().includes(search) ||
        (job.location || '').toLowerCase().includes(search) ||
        (job.category || '').toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  }

  pauseJob(jobId: string): void {
    if (confirm('Are you sure you want to pause this job posting?')) {
      this.jobService.pauseJob(jobId).subscribe({
        next: (updatedJob) => {
          this.updateJobInList(updatedJob);
          this.toastr.success('Job paused successfully');
        },
      });
    }
  }

  resumeJob(jobId: string): void {
    if (confirm('Do you want to resume this job posting?')) {
      this.jobService.resumeJob(jobId).subscribe({
        next: (updatedJob) => {
          this.updateJobInList(updatedJob);
          this.toastr.success('Job resumed successfully');
        },
      });
    }
  }

  closeJob(jobId: string): void {
    if (confirm('Are you sure you want to close this job posting? This action cannot be undone.')) {
      this.jobService.closeJob(jobId).subscribe({
        next: (updatedJob) => {
          this.updateJobInList(updatedJob);
          this.toastr.success('Job closed successfully');
        },
      });
    }
  }

  deleteJob(jobId: string): void {
    if (confirm('Are you sure you want to permanently delete this job posting?')) {
      this.jobService.deleteJob(jobId).subscribe({
        next: () => {
          this.jobs = this.jobs.filter((j) => j.jobId !== jobId);
          this.applyFilters();
          this.toastr.success('Job deleted successfully');
        },
      });
    }
  }

  editJob(jobId: string): void {
    this.router.navigate(['/recruiter/post-job'], { queryParams: { edit: jobId } });
  }

  viewApplications(jobId: string): void {
    this.router.navigate(['/recruiter/applications'], { queryParams: { jobId } });
  }

 private updateJobInList(updatedJob: Job): void {

    const index =
      this.jobs.findIndex(
        (j) => j.jobId === updatedJob.jobId
      );

    if (index !== -1) {

      this.jobs[index] = {
        ...updatedJob,
        applicationsCount: this.jobs[index].applicationsCount || updatedJob.applicationsCount || 0,
      };

      this.jobs = [...this.jobs];

      this.applyFilters();

      this.cdr.detectChanges();

    }

}

  getActiveJobsCount(): number {
    return this.jobs.filter((j) => j.status === 'ACTIVE').length;
  }

  getTotalApplications(): number {
    return this.jobs.reduce((sum, job) => sum + (job.applicationsCount || 0), 0);
  }

  getCompanyName(job: Job): string {
    return job.companyName || this.recruiterCompanyName || 'Company';
  }

  getCompanyInitials(job: Job): string {
    const source = this.getCompanyName(job) || 'HC';
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'HC';
  }
}

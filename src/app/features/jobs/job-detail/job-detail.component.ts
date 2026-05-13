// src/app/features/jobs/job-detail/job-detail.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { JobService } from '../../../core/services/job.service';
import { ApplicationService } from '../../../core/services/application.service';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { Job } from '../../../core/models/job.model';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './job-detail.component.html',
  styleUrls: ['./job-detail.component.scss']
})
export class JobDetailComponent implements OnInit {
  job: Job | null = null;
  isLoading = true;
  isApplying = false;
  hasApplied = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private jobService: JobService,
    private applicationService: ApplicationService,
    private profileService: ProfileService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadJob(id);
    }
  }

  loadJob(jobId: string): void {
    this.isLoading = true;
    this.jobService.getJobById(jobId).subscribe({
      next: (job) => {
        this.job = job;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyForJob(): void {
    if (!this.job) return;

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    const user = this.authService.getCurrentUser();
    if (user?.role !== 'CANDIDATE') {
      alert('Please login with a candidate account to apply for jobs.');
      return;
    }

    this.isApplying = true;

    this.profileService.getCandidateProfile().subscribe({
      next: (profile) => this.submitApplication(profile.resumeUrl),
      error: () => this.submitApplication(''),
    });
  }

  private submitApplication(resumeUrl: string): void {
    if (!this.job) return;

    this.applicationService.submitApplication(this.job.jobId, {
      recruiterId: this.job.postedBy,
      jobTitle: this.job.title,
      companyName: this.job.companyName,
      coverLetter: 'I am highly interested in this role and my skills align with the requirements.',
      resumeUrl
    }).subscribe({
      next: () => {
        this.isApplying = false;
        this.hasApplied = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isApplying = false;
        this.cdr.detectChanges();
        alert('Failed to apply. You might have already applied or there was a server error.');
      }
    });
  }
}

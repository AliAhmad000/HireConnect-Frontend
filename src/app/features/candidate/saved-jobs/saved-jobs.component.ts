// src/app/features/candidate/saved-jobs/saved-jobs.component.ts
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { JobService } from '../../../core/services/job.service';
import { SavedJobsService } from '../../../core/services/saved-jobs.service';
import { Job } from '../../../core/models/job.model';

@Component({
  selector: 'app-saved-jobs',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './saved-jobs.component.html',
  styleUrls: ['./saved-jobs.component.scss']
})
export class SavedJobsComponent implements OnInit {
  savedJobs: Job[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(
    private jobService: JobService,
    private savedJobsService: SavedJobsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSavedJobs();
  }

  loadSavedJobs(): void {
    this.isLoading = true;
    this.savedJobs = [];
    this.errorMessage = '';

    const savedJobIds = this.savedJobsService.getSavedJobIds();
    
    if (savedJobIds.length === 0) {
      this.finishLoading();
      return;
    }

    const uniqueIds = [...new Set(savedJobIds.map(String))];

    forkJoin(
      uniqueIds.map((id) =>
        this.jobService.getJobById(id).pipe(
          map((job) => ({ id, job })),
          catchError(() => of({ id, job: null as Job | null }))
        )
      )
    ).subscribe({
      next: (results) => {
        const validJobs = results
          .map((result) => result.job)
          .filter((job): job is Job => !!job && job.status === 'ACTIVE')
          .sort((a, b) => new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime());

        const validIds = validJobs.map((job) => String(job.jobId));
        uniqueIds
          .filter((id) => !validIds.includes(id))
          .forEach((id) => this.savedJobsService.remove(id));

        this.savedJobs = validJobs;
        this.finishLoading();
      },
      error: () => {
        this.errorMessage = 'Unable to load saved jobs right now.';
        this.finishLoading();
      }
    });
  }

  removeSavedJob(jobId: string): void {
    this.savedJobsService.remove(jobId);
    this.savedJobs = this.savedJobs.filter(job => job.jobId !== jobId);
    this.cdr.detectChanges();
  }

  salaryLabel(job: Job): string {
    if (!job.salaryMin && !job.salaryMax) {
      return 'Salary not disclosed';
    }

    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });

    if (job.salaryMin && job.salaryMax) {
      return `${formatter.format(job.salaryMin)} - ${formatter.format(job.salaryMax)}`;
    }

    return formatter.format(job.salaryMin || job.salaryMax);
  }

  companyInitial(job: Job): string {
    return (job.companyName || job.title || 'H').trim().charAt(0).toUpperCase();
  }

  private finishLoading(): void {
    this.isLoading = false;
    this.cdr.detectChanges();
  }
}

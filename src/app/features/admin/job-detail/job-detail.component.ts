import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { JobService } from '../../../core/services/job.service';
import { AdminService } from '../../../core/services/admin.service';
import { Job } from '../../../core/models/job.model';

@Component({
  selector: 'app-admin-job-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="detail-container">
      <a routerLink="/admin/jobs" class="back-link">Back to Jobs</a>
      <div class="loading-state" *ngIf="isLoading">Loading job...</div>

      <section class="detail-card" *ngIf="!isLoading && job">
        <div class="header-row">
          <div>
            <h1>{{ job.title }}</h1>
            <p>{{ job.companyName }} · {{ job.location }}</p>
          </div>
          <span class="status-badge" [class]="job.status.toLowerCase()">{{ job.status }}</span>
        </div>

        <div class="info-grid">
          <div><span>Type</span><strong>{{ job.jobType.replace('_', ' ') }}</strong></div>
          <div><span>Salary</span><strong>{{ job.salaryMin || 0 }} - {{ job.salaryMax || 0 }}</strong></div>
          <div><span>Experience</span><strong>{{ job.experienceRequired || 0 }} years</strong></div>
          <div><span>Views</span><strong>{{ job.viewCount || 0 }}</strong></div>
          <div><span>Posted</span><strong>{{ job.postedAt | date:'mediumDate' }}</strong></div>
          <div><span>Expires</span><strong>{{ job.expiresAt | date:'mediumDate' }}</strong></div>
        </div>

        <div class="description">
          <h2>Description</h2>
          <p>{{ job.description }}</p>
        </div>

        <div class="actions">
          <button *ngIf="job.status !== 'ACTIVE'" type="button" (click)="setStatus('ACTIVE')">Activate</button>
          <button *ngIf="job.status === 'ACTIVE'" type="button" (click)="setStatus('PAUSED')">Pause</button>
          <button *ngIf="job.status !== 'CLOSED'" type="button" (click)="setStatus('CLOSED')">Close</button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .detail-container { max-width: 980px; margin: 0 auto; padding: 2rem; }
    .back-link { color: #4f46e5; text-decoration: none; font-weight: 700; }
    .detail-card { margin-top: 1.5rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; }
    .header-row { display: flex; justify-content: space-between; gap: 1rem; border-bottom: 1px solid #f3f4f6; padding-bottom: 1rem; }
    h1 { margin: 0 0 .35rem; } p { color: #6b7280; }
    .info-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .info-grid div { background: #f9fafb; border-radius: 8px; padding: 1rem; }
    span { display: block; color: #6b7280; font-size: .85rem; margin-bottom: .35rem; }
    .status-badge { padding: .35rem .75rem; border-radius: 999px; font-weight: 700; }
    .active { background: #dcfce7; color: #166534; } .paused { background: #fef3c7; color: #92400e; } .closed { background: #fee2e2; color: #991b1b; }
    .actions { display: flex; justify-content: flex-end; gap: .75rem; margin-top: 1.5rem; }
    button { border: 0; border-radius: 8px; background: #4f46e5; color: #fff; padding: .75rem 1rem; cursor: pointer; }
  `],
})
export class JobDetailComponent implements OnInit {
  jobId = '';
  job: Job | null = null;
  isLoading = true;
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private route: ActivatedRoute,
    private jobService: JobService,
    private adminService: AdminService,
  ) {}

  ngOnInit(): void {
    this.jobId = this.route.snapshot.paramMap.get('id') || '';
    this.loadJob();
  }

  loadJob(): void {
    this.isLoading = true;
    this.jobService.getJobById(this.jobId).subscribe({
      next: (job) => {
        this.job = job;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.job = null;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  setStatus(status: 'ACTIVE' | 'PAUSED' | 'CLOSED'): void {
    this.adminService.setJobStatus(this.jobId, status).subscribe({
      next: (job) => {
        this.job = job;
        this.toastr.success(`Job ${status.toLowerCase()} successfully`);
        this.cdr.detectChanges();
      },
    });
  }
}

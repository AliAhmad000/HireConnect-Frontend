import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AdminService } from '../../../core/services/admin.service';
import { Job } from '../../../core/models/job.model';

@Component({
  selector: 'app-admin-jobs',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="jobs-container">
      <div class="page-header">
        <div class="header-content">
          <div>
            <h1>Job Management</h1>
            <p>Review all platform jobs, posting health and moderation actions</p>
          </div>
          <button
            type="button"
            (click)="exportJobs()"
            class="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Export Report
          </button>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-icon total"><span class="material-symbols-rounded">work</span></div>
          <div>
            <span>Total Jobs</span>
            <strong>{{ jobs.length | number }}</strong>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon active"><span class="material-symbols-rounded">task_alt</span></div>
          <div>
            <span>Active</span>
            <strong>{{ getStatusCount('ACTIVE') | number }}</strong>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon paused"><span class="material-symbols-rounded">pause_circle</span></div>
          <div>
            <span>Paused</span>
            <strong>{{ getStatusCount('PAUSED') | number }}</strong>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon views"><span class="material-symbols-rounded">visibility</span></div>
          <div>
            <span>Total Views</span>
            <strong>{{ getTotalViews() | number }}</strong>
          </div>
        </div>
      </div>

      <div class="filters-bar">
        <div class="search-box">
          <span class="material-symbols-rounded">search</span>
          <input type="text" [formControl]="searchControl" placeholder="Search title, company, location">
        </div>
        <select [formControl]="statusFilter">
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="CLOSED">Closed</option>
        </select>
        <button class="btn-secondary" type="button" (click)="loadJobs()">
          <span class="material-symbols-rounded">refresh</span>
          Refresh
        </button>
      </div>

      <div class="loading-state" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Loading jobs...</p>
      </div>

      <div class="table-responsive" *ngIf="!isLoading">
        <table>
          <thead>
            <tr>
              <th>Job & Company</th>
              <th>Location</th>
              <th>Type</th>
              <th>Posted</th>
              <th>Status</th>
              <th>Views</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let job of filteredJobs">
              <td>
                <div class="job-cell">
                  <div class="job-avatar"><span class="material-symbols-rounded">work</span></div>
                  <div>
                    <a [routerLink]="['/admin/jobs', job.jobId]">{{ job.title }}</a>
                    <span>{{ job.companyName || 'Company' }}</span>
                  </div>
                </div>
              </td>
              <td><span class="meta-pill"><span class="material-symbols-rounded">location_on</span>{{ job.location }}</span></td>
              <td><span class="type-badge">{{ job.jobType.replace('_', ' ') }}</span></td>
              <td>{{ job.postedAt | date:'mediumDate' }}</td>
              <td><span class="status-badge" [class]="job.status.toLowerCase()">{{ job.status }}</span></td>
              <td>{{ job.viewCount || 0 }}</td>
              <td>
                <div class="action-buttons">
                  <a [routerLink]="['/admin/jobs', job.jobId]" class="btn-icon" title="View">
                    <span class="material-symbols-rounded">visibility</span>
                  </a>
                  <button *ngIf="job.status !== 'ACTIVE'" type="button" class="btn-icon success" title="Activate" (click)="setStatus(job, 'ACTIVE')">
                    <span class="material-symbols-rounded">check_circle</span>
                  </button>
                  <button *ngIf="job.status === 'ACTIVE'" type="button" class="btn-icon warning" title="Pause" (click)="setStatus(job, 'PAUSED')">
                    <span class="material-symbols-rounded">pause</span>
                  </button>
                  <button *ngIf="job.status !== 'CLOSED'" type="button" class="btn-icon warning" title="Close" (click)="setStatus(job, 'CLOSED')">
                    <span class="material-symbols-rounded">block</span>
                  </button>
                  <button type="button" class="btn-icon danger" title="Delete" (click)="deleteJob(job)">
                    <span class="material-symbols-rounded">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="empty-state" *ngIf="filteredJobs.length === 0">No jobs found.</div>
      </div>
    </div>
  `,
  styles: [`
    .jobs-container { max-width: 1280px; margin: 0 auto; padding: 32px 24px; color: #172033; }
    .page-header { margin-bottom: 1.5rem; }
    .header-content { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-end; flex-wrap: wrap; }
    h1 { margin: 0 0 .35rem; font-size: clamp(1.875rem, 3vw, 2.25rem); line-height: 1.15; color: #111827; }
    p { margin: 0; color: #667085; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; margin-bottom: 24px; }
    .summary-card { display: flex; align-items: center; gap: 14px; min-height: 112px; padding: 20px; border: 1px solid #e5e9f2; border-radius: 8px; background: #fff; box-shadow: 0 8px 24px rgba(15,23,42,.06); }
    .summary-card span { display: block; color: #667085; font-size: .875rem; font-weight: 700; }
    .summary-card strong { display: block; margin-top: 2px; color: #111827; font-size: 1.875rem; line-height: 1.1; }
    .summary-icon { display: inline-flex; width: 48px; height: 48px; align-items: center; justify-content: center; border-radius: 8px; }
    .summary-icon.total { background: #eef2ff; color: #4f46e5; } .summary-icon.active { background: #ecfdf3; color: #16a34a; } .summary-icon.paused { background: #fffbeb; color: #d97706; } .summary-icon.views { background: #eff6ff; color: #2563eb; }
    .filters-bar { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; padding: 16px; border: 1px solid #e5e9f2; border-radius: 8px; background: #fff; box-shadow: 0 8px 24px rgba(15,23,42,.06); }
    .search-box { position: relative; flex: 1; min-width: 280px; }
    .search-box .material-symbols-rounded { position: absolute; left: 12px; top: 50%; color: #98a2b3; transform: translateY(-50%); }
    input, select { border: 1px solid #d0d5dd; border-radius: 8px; padding: .75rem 1rem; font: inherit; }
    input { width: 100%; padding-left: 42px; }
    .btn-primary, .btn-secondary, .btn-icon { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid #d1d5db; border-radius: 8px; padding: .65rem .9rem; cursor: pointer; text-decoration: none; background: #fff; color: #374151; }
    .btn-primary { background: #2563eb; border-color: #2563eb; color: #fff; }
    .btn-secondary:hover { background: #f8fafc; }
    .table-responsive { background: #fff; border: 1px solid #e5e9f2; border-radius: 8px; overflow-x: auto; box-shadow: 0 8px 24px rgba(15,23,42,.06); }
    table { width: 100%; min-width: 1050px; border-collapse: collapse; }
    th, td { padding: 1rem; border-bottom: 1px solid #f3f4f6; text-align: left; }
    th { background: #f9fafb; font-size: .75rem; text-transform: uppercase; color: #667085; letter-spacing: 0; }
    tbody tr:hover { background: #f8fafc; }
    .job-cell { display: flex; align-items: center; gap: 12px; }
    .job-avatar { display: inline-flex; width: 40px; height: 40px; align-items: center; justify-content: center; border-radius: 8px; background: #eff6ff; color: #2563eb; }
    .job-cell a { display: block; color: #111827; font-weight: 700; text-decoration: none; }
    .job-cell span { display: block; margin-top: 2px; color: #667085; font-size: .85rem; }
    .meta-pill, .type-badge { display: inline-flex; align-items: center; gap: 5px; padding: .35rem .6rem; border-radius: 8px; background: #f8fafc; color: #475467; font-size: .85rem; font-weight: 600; }
    .status-badge { padding: .25rem .65rem; border-radius: 999px; font-size: .8rem; font-weight: 700; }
    .active { background: #dcfce7; color: #166534; } .paused { background: #fef3c7; color: #92400e; } .closed { background: #fee2e2; color: #991b1b; }
    .action-buttons { display: flex; gap: .45rem; flex-wrap: wrap; }
    .btn-icon { width: 36px; height: 36px; padding: 0; color: #475467; }
    .btn-icon .material-symbols-rounded { font-size: 1.15rem; }
    .success:hover { background: #16a34a; border-color: #16a34a; color: #fff; } .warning:hover { background: #f59e0b; border-color: #f59e0b; color: #fff; } .danger:hover { background: #dc2626; border-color: #dc2626; color: #fff; }
    .loading-state, .empty-state { padding: 2rem; text-align: center; color: #6b7280; }
    .spinner { width: 40px; height: 40px; border: 3px solid #e0e0e0; border-top-color: #2563eb; border-radius: 50%; margin: 0 auto 1rem; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 1024px) { .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 768px) { .jobs-container { padding: 24px 16px; } .header-content { align-items: stretch; } .summary-grid { grid-template-columns: 1fr; } .search-box, select, .btn-secondary { width: 100%; min-width: 0; } }
  `],
})
export class JobsComponent implements OnInit {
  jobs: Job[] = [];
  filteredJobs: Job[] = [];
  isLoading = true;
  searchControl = new FormControl('');
  statusFilter = new FormControl('ALL');
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadJobs();
    this.searchControl.valueChanges.subscribe(() => this.applyFilters());
    this.statusFilter.valueChanges.subscribe(() => this.loadJobs());
  }

  loadJobs(): void {
    this.isLoading = true;
    this.adminService.getJobs(this.statusFilter.value).subscribe({
      next: (jobs) => {
        this.jobs = jobs;
        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.jobs = [];
        this.filteredJobs = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  applyFilters(): void {
    const search = this.searchControl.value?.toLowerCase() || '';
    this.filteredJobs = this.jobs.filter((job) =>
      !search ||
      job.title?.toLowerCase().includes(search) ||
      job.companyName?.toLowerCase().includes(search) ||
      job.location?.toLowerCase().includes(search)
    );
  }

  setStatus(job: Job, status: 'ACTIVE' | 'PAUSED' | 'CLOSED'): void {
    this.adminService.setJobStatus(job.jobId, status).subscribe({
      next: (updatedJob) => {
        this.jobs = this.jobs.map((item) => item.jobId === job.jobId ? updatedJob : item);
        this.applyFilters();
        this.toastr.success(`Job ${status.toLowerCase()} successfully`);
        this.cdr.detectChanges();
      },
    });
  }

  deleteJob(job: Job): void {
    if (!confirm(`Delete "${job.title}"? This action cannot be undone.`)) return;

    this.adminService.deleteJob(job.jobId).subscribe({
      next: () => {
        this.jobs = this.jobs.filter((item) => item.jobId !== job.jobId);
        this.applyFilters();
        this.toastr.success('Job deleted successfully');
        this.cdr.detectChanges();
      },
    });
  }

  exportJobs(): void {
    const rows = [
      ['Title', 'Company', 'Location', 'Type', 'Status', 'Posted', 'Views'],
      ...this.filteredJobs.map((job) => [
        job.title,
        job.companyName || '',
        job.location || '',
        job.jobType || '',
        job.status,
        job.postedAt || '',
        job.viewCount || 0,
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = `admin-jobs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getStatusCount(status: 'ACTIVE' | 'PAUSED' | 'CLOSED'): number {
    return this.jobs.filter((job) => job.status === status).length;
  }

  getTotalViews(): number {
    return this.jobs.reduce((total, job) => total + (job.viewCount || 0), 0);
  }
}

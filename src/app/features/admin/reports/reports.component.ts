import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { AnalyticsService } from '../../../core/services/analytics.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div>
          <h1>Reports</h1>
          <p>Generate downloadable platform reports.</p>
        </div>
      </div>
      <div class="reports-grid">
        <article class="report-card">
          <div class="report-icon users"><span class="material-symbols-rounded">groups</span></div>
          <div>
            <h2>Users Report</h2>
            <p>Export candidates, recruiters, admins and account status.</p>
          </div>
          <button type="button" (click)="exportUsers()">
            <span class="material-symbols-rounded">download</span>
            Export CSV
          </button>
        </article>
        <article class="report-card">
          <div class="report-icon jobs"><span class="material-symbols-rounded">work</span></div>
          <div>
            <h2>Jobs Report</h2>
            <p>Export job titles, companies, locations and moderation status.</p>
          </div>
          <button type="button" (click)="exportJobs()">
            <span class="material-symbols-rounded">download</span>
            Export CSV
          </button>
        </article>
        <article class="report-card">
          <div class="report-icon analytics"><span class="material-symbols-rounded">monitoring</span></div>
          <div>
            <h2>Analytics Report</h2>
            <p>Export platform-wide hiring and funnel performance metrics.</p>
          </div>
          <button type="button" (click)="exportAnalytics()">
            <span class="material-symbols-rounded">download</span>
            Export CSV
          </button>
        </article>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { max-width: 1280px; margin: 0 auto; padding: 32px 24px; color: #172033; }
    .page-header { margin-bottom: 1.5rem; }
    h1 { margin: 0 0 .35rem; color: #111827; font-size: clamp(1.875rem,3vw,2.25rem); line-height: 1.15; }
    p { margin: 0; color: #667085; }
    .reports-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 20px; }
    .report-card { display: flex; flex-direction: column; gap: 16px; min-height: 260px; padding: 20px; border: 1px solid #e5e9f2; border-radius: 8px; background: #fff; box-shadow: 0 8px 24px rgba(15,23,42,.06); }
    .report-icon { display: inline-flex; width: 48px; height: 48px; align-items: center; justify-content: center; border-radius: 8px; }
    .report-icon.users { background: #eff6ff; color: #2563eb; } .report-icon.jobs { background: #eef2ff; color: #4f46e5; } .report-icon.analytics { background: #f0fdf4; color: #15803d; }
    h2 { margin: 0 0 .35rem; color: #111827; font-size: 1.125rem; }
    button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: max-content; margin-top: auto; border: 1px solid #2563eb; border-radius: 8px; background: #2563eb; color: #fff; padding: .75rem 1rem; cursor: pointer; font-weight: 700; }
    @media (max-width: 1024px) { .reports-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
    @media (max-width: 768px) { .admin-page { padding: 24px 16px; } .reports-grid { grid-template-columns: 1fr; } button { width: 100%; } }
  `],
})
export class ReportsComponent {
  constructor(private adminService: AdminService, private analyticsService: AnalyticsService) {}

  exportUsers(): void {
    this.adminService.getUsers({ size: 500 }).subscribe(({ content }) => {
      this.download('admin-users', [['Name', 'Email', 'Role', 'Status'], ...content.map((u) => [u.name, u.email, u.role, u.status])]);
    });
  }

  exportJobs(): void {
    this.adminService.getJobs().subscribe((jobs) => {
      this.download('admin-jobs', [['Title', 'Company', 'Location', 'Status'], ...jobs.map((j) => [j.title, j.companyName || '', j.location || '', j.status])]);
    });
  }

  exportAnalytics(): void {
    this.analyticsService.getPlatformAnalytics().subscribe((data) => {
      this.download('admin-analytics', Object.entries(data || {}).map(([key, value]) => [key, String(value)]));
    });
  }

  private download(name: string, rows: unknown[][]): void {
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

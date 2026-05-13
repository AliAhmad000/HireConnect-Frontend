// src/app/features/admin/dashboard/admin-dashboard.component.ts
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { AnalyticsService } from '../../../core/services/analytics.service';
import { AdminService, AdminUser } from '../../../core/services/admin.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { ApplicationService } from '../../../core/services/application.service';
import { InterviewService } from '../../../core/services/interview.service';
import { Job } from '../../../core/models/job.model';
import { Interview } from '../../../core/models/interview.model';
import { Invoice } from '../../../core/models/subscription.model';

interface ChartPoint {
  label: string;
  value: number;
  height: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  isLoading = true;
  lastUpdated = new Date();
  warningMessages: string[] = [];

  platformStats = {
    totalUsers: 0,
    totalCandidates: 0,
    totalRecruiters: 0,
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    totalInterviews: 0,
    totalOffers: 0,
    revenue: 0,
    conversionRate: 0
  };

  recentUsers: AdminUser[] = [];
  recentJobs: Job[] = [];
  platformAnalytics: any = null;
  userGrowthData: ChartPoint[] = [];
  revenuePipelineData: ChartPoint[] = [];
  trendStats = {
    users: 0,
    jobs: 0,
    applications: 0,
    interviews: 0,
    revenue: 0,
    successRate: 0,
  };

  quickActions = [
    { label: 'Manage Users', icon: 'US', route: '/admin/users', color: '#667eea' },
    { label: 'Review Jobs', icon: 'JB', route: '/admin/jobs', color: '#4caf50' },
    { label: 'View Analytics', icon: 'AN', route: '/admin/analytics', color: '#ff9800' },
    { label: 'Subscriptions', icon: 'SU', route: '/admin/subscriptions', color: '#9c27b0' },
    { label: 'Reports', icon: 'RP', route: '/admin/reports', color: '#2196f3' },
    { label: 'Settings', icon: 'ST', route: '/admin/settings', color: '#607d8b' }
  ];

  constructor(
    private analyticsService: AnalyticsService,
    private adminService: AdminService,
    private subscriptionService: SubscriptionService,
    private applicationService: ApplicationService,
    private interviewService: InterviewService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    const warnings = new Set<string>();

    forkJoin({
      usersPage: this.adminService.getUsers({ size: 1000 }).pipe(
        catchError(() => {
          warnings.add('User directory data is currently unavailable.');
          return of(null);
        })
      ),
      jobs: this.adminService.getJobs().pipe(
        catchError(() => {
          warnings.add('Job moderation data could not be loaded.');
          return of([] as Job[]);
        })
      ),
      analytics: this.analyticsService.getPlatformAnalytics().pipe(
        catchError(() => {
          warnings.add('Platform analytics is temporarily unavailable.');
          return of(null);
        })
      ),
    }).subscribe({
      next: ({ usersPage, jobs, analytics }) => {
        const users = usersPage?.content || [];
        const recruiters = users.filter((user) => user.role === 'RECRUITER');
        const jobsWithCounts$ = this.loadJobsWithApplicationCounts(jobs);

        if (recruiters.length === 0) {
          jobsWithCounts$.subscribe({
            next: (countedJobs) => {
              this.applyDashboardData(
                users,
                usersPage?.totalElements || users.length,
                countedJobs,
                analytics,
                [],
                [],
                warnings
              );
            },
            error: () => this.handleDashboardFailure(warnings),
          });
          return;
        }

        forkJoin({
          countedJobs: jobsWithCounts$,
          invoiceGroups: forkJoin(
            recruiters.map((recruiter) =>
              this.subscriptionService.getInvoicesByRecruiter(recruiter.userId || recruiter.id)
                .pipe(
                  catchError(() => {
                    warnings.add('Some recruiter billing records could not be loaded.');
                    return of([] as Invoice[]);
                  })
                )
            )
          ),
          interviewGroups: forkJoin(
            recruiters.map((recruiter) =>
              this.interviewService.getInterviewsByRecruiter(recruiter.userId || recruiter.id, undefined, 1000)
                .pipe(
                  catchError(() => {
                    warnings.add('Some recruiter interview activity could not be loaded.');
                    return of([] as Interview[]);
                  })
                )
            )
          ),
        }).subscribe({
          next: ({ countedJobs, invoiceGroups, interviewGroups }) => {
            this.applyDashboardData(
              users,
              usersPage?.totalElements || users.length,
              countedJobs,
              analytics,
              invoiceGroups.flat(),
              interviewGroups.flat(),
              warnings
            );
          },
          error: () => this.handleDashboardFailure(warnings),
        });
      },
      error: () => this.handleDashboardFailure(warnings),
    });
  }

  exportDashboardReport(): void {
    const rows = [
      ['Metric', 'Value'],
      ['Total Users', this.platformStats.totalUsers],
      ['Candidates', this.platformStats.totalCandidates],
      ['Recruiters', this.platformStats.totalRecruiters],
      ['Total Jobs', this.platformStats.totalJobs],
      ['Active Jobs', this.platformStats.activeJobs],
      ['Applications', this.platformStats.totalApplications],
      ['Interviews', this.platformStats.totalInterviews],
      ['Offers', this.platformStats.totalOffers],
      ['Monthly Subscription Revenue', this.platformStats.revenue],
      ['Success Rate', `${this.platformStats.conversionRate}%`],
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = `admin-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getGrowthIndicator(value: number): string {
    return value > 0 ? 'UP' : value < 0 ? 'DOWN' : 'FLAT';
  }

  getGrowthClass(value: number): string {
    return value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
  }

  getTrendLabel(value: number): string {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value}%`;
  }

  getTrendBadgeClass(value: number): string {
    if (value > 0) return 'bg-green-100 text-green-800';
    if (value < 0) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-700';
  }

  getTrendPath(value: number): string {
    if (value < 0) return 'M19 14l-7 7m0 0l-7-7m7 7V3';
    if (value === 0) return 'M5 12h14';
    return 'M5 10l7-7m0 0l7 7m-7-7v18';
  }

  getRoleClass(role?: AdminUser['role']): string {
    return role ? role.toLowerCase() : 'unknown';
  }

  getRoleLabel(role?: AdminUser['role']): string {
    return role ? role.toLowerCase() : 'unknown';
  }

  getUserStatusClass(status?: AdminUser['status']): string {
    if (status === 'ACTIVE') {
      return 'ACTIVE';
    }

    if (status === 'SUSPENDED') {
      return 'REJECTED';
    }

    return '';
  }

  getStatusLabel(status?: string): string {
    return status ? status.toLowerCase() : 'unknown';
  }

  formatJobType(jobType?: string): string {
    return jobType ? jobType.replace(/_/g, ' ').toLowerCase() : 'not set';
  }

  private applyDashboardData(
    users: AdminUser[],
    totalUsers: number,
    jobs: Job[],
    analytics: any,
    invoices: Invoice[],
    interviews: Interview[],
    warnings: Set<string>
  ): void {
    this.platformAnalytics = analytics;
    this.warningMessages = Array.from(warnings);
    this.recentUsers = [...users]
      .sort((left, right) => this.getTimeValue(right.joinedAt || right.createdAt) - this.getTimeValue(left.joinedAt || left.createdAt))
      .slice(0, 5);
    this.recentJobs = [...jobs]
      .sort((left, right) => this.getTimeValue(right.createdAt || right.postedAt) - this.getTimeValue(left.createdAt || left.postedAt))
      .slice(0, 5);
    this.userGrowthData = this.buildUserGrowthData(users);
    this.revenuePipelineData = this.buildRevenuePipelineData(invoices);
    this.trendStats = this.buildTrendStats(users, jobs, invoices, analytics, interviews);
    this.platformStats = this.buildPlatformStats(users, totalUsers, jobs, analytics, invoices, interviews);
    this.lastUpdated = new Date();
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  private handleDashboardFailure(warnings: Set<string>): void {
    warnings.add('Admin dashboard loaded with fallback data only.');
    this.applyDashboardData([], 0, [], null, [], [], warnings);
  }

  private buildPlatformStats(users: AdminUser[], totalUsers: number, jobs: Job[], analytics: any, invoices: Invoice[], interviews: Interview[]) {
    const applicationsByStatus = analytics?.applicationsByStatus || {};
    const applicationCountFromJobs = this.sumJobApplications(jobs);
    const totalApplications = applicationCountFromJobs || analytics?.totalApplications || analytics?.totalApplicationEvents || 0;
    const totalOffers = analytics?.totalOffered || applicationsByStatus['OFFERED'] || 0;
    const totalInterviews =
      interviews.length ||
      analytics?.totalInterviews ||
      applicationsByStatus['INTERVIEW_SCHEDULED'] ||
      applicationsByStatus['SCHEDULED'] ||
      applicationsByStatus['INTERVIEWED'] ||
      0;

    return {
      totalUsers,
      totalCandidates: users.filter((user) => user.role === 'CANDIDATE').length,
      totalRecruiters: users.filter((user) => user.role === 'RECRUITER').length,
      totalJobs: jobs.length,
      activeJobs: jobs.filter((job) => job.status === 'ACTIVE').length,
      totalApplications,
      totalInterviews,
      totalOffers,
      revenue: this.getCurrentMonthRevenue(invoices),
      conversionRate: totalApplications > 0
        ? Math.round((totalOffers / totalApplications) * 10000) / 100
        : 0,
    };
  }

  private buildUserGrowthData(users: AdminUser[]): ChartPoint[] {
    const months = this.getRecentMonths(12);
    const values = months.map((month) => {
      const monthEnd = new Date(month.year, month.month + 1, 0, 23, 59, 59, 999);
      return users.filter((user) => {
        const joinedAt = this.parseDate(user.joinedAt || user.createdAt);
        return joinedAt ? joinedAt <= monthEnd : false;
      }).length;
    });

    return this.toChartPoints(months.map((month) => month.label), values);
  }

  private buildRevenuePipelineData(invoices: Invoice[]): ChartPoint[] {
    const months = this.getRecentMonths(6);
    const values = months.map((month) =>
      this.roundMoney(invoices.reduce((total, invoice) => {
        const paidAt = this.parseDate(invoice.paymentDate || (invoice as any).createdAt);
        if (!paidAt || paidAt.getFullYear() !== month.year || paidAt.getMonth() !== month.month) {
          return total;
        }
        return total + this.getInvoiceAmount(invoice);
      }, 0))
    );

    return this.toChartPoints(months.map((month) => month.label), values);
  }

  private buildTrendStats(users: AdminUser[], jobs: Job[], invoices: Invoice[], analytics: any, interviews: Interview[]) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previous = new Date(currentYear, currentMonth - 1, 1);
    const previousMonth = previous.getMonth();
    const previousYear = previous.getFullYear();

    const usersThisMonth = this.countByMonth(users, currentYear, currentMonth, (user) => user.joinedAt || user.createdAt);
    const usersLastMonth = this.countByMonth(users, previousYear, previousMonth, (user) => user.joinedAt || user.createdAt);
    const jobsThisMonth = this.countByMonth(jobs, currentYear, currentMonth, (job) => job.postedAt);
    const jobsLastMonth = this.countByMonth(jobs, previousYear, previousMonth, (job) => job.postedAt);
    const interviewsThisMonth = this.countByMonth(interviews, currentYear, currentMonth, (interview) => interview.scheduledAt || interview.createdAt);
    const interviewsLastMonth = this.countByMonth(interviews, previousYear, previousMonth, (interview) => interview.scheduledAt || interview.createdAt);
    const revenueThisMonth = this.sumInvoicesByMonth(invoices, currentYear, currentMonth);
    const revenueLastMonth = this.sumInvoicesByMonth(invoices, previousYear, previousMonth);

    const applicationsByStatus = analytics?.applicationsByStatus || {};
    const liveApplicationCount = this.sumJobApplications(jobs);
    const totalApplications = liveApplicationCount || analytics?.totalApplications || analytics?.totalApplicationEvents || 0;
    const totalInterviews =
      interviews.length ||
      analytics?.totalInterviews ||
      applicationsByStatus['INTERVIEW_SCHEDULED'] ||
      applicationsByStatus['SCHEDULED'] ||
      applicationsByStatus['INTERVIEWED'] ||
      0;
    const totalOffers = analytics?.totalOffered || applicationsByStatus['OFFERED'] || 0;
    const successRate = totalApplications > 0 ? (totalOffers / totalApplications) * 100 : 0;

    return {
      users: this.percentChange(usersThisMonth, usersLastMonth),
      jobs: this.percentChange(jobsThisMonth, jobsLastMonth),
      applications: this.percentChange(liveApplicationCount || totalApplications, Math.max((liveApplicationCount || totalApplications) - jobsThisMonth, 0)),
      interviews: this.percentChange(interviewsThisMonth || totalInterviews, interviewsLastMonth),
      revenue: this.percentChange(revenueThisMonth, revenueLastMonth),
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  private getCurrentMonthRevenue(invoices: Invoice[]): number {
    const now = new Date();
    return this.sumInvoicesByMonth(invoices, now.getFullYear(), now.getMonth());
  }

  private sumInvoicesByMonth(invoices: Invoice[], year: number, month: number): number {
    return this.roundMoney(invoices.reduce((total, invoice) => {
      const paidAt = this.parseDate(invoice.paymentDate || (invoice as any).createdAt);
      if (!paidAt || paidAt.getFullYear() !== year || paidAt.getMonth() !== month) {
        return total;
      }
      return total + this.getInvoiceAmount(invoice);
    }, 0));
  }

  private getInvoiceAmount(invoice: Invoice): number {
    return Number(invoice.totalAmount || invoice.amount || 0);
  }

  private sumJobApplications(jobs: Job[]): number {
    return jobs.reduce((total, job) => total + Number(job.applicationsCount || 0), 0);
  }

  private loadJobsWithApplicationCounts(jobs: Job[]) {
    if (!jobs.length) {
      return of([] as Job[]);
    }

    return forkJoin(
      jobs.map((job) =>
        this.applicationService.countApplicationsByJob(job.jobId).pipe(
          catchError(() => of(job.applicationsCount || 0))
        )
      )
    ).pipe(
      catchError(() => of(jobs.map((job) => job.applicationsCount || 0))),
      map((counts) =>
        jobs.map((job, index) => ({
          ...job,
          applicationsCount: Number(counts[index] || 0),
        }))
      ),
    );
  }

  private countByMonth<T>(items: T[], year: number, month: number, getDate: (item: T) => string | undefined): number {
    return items.filter((item) => {
      const date = this.parseDate(getDate(item));
      return date?.getFullYear() === year && date.getMonth() === month;
    }).length;
  }

  private toChartPoints(labels: string[], values: number[]): ChartPoint[] {
    const max = Math.max(...values, 1);
    return labels.map((label, index) => ({
      label,
      value: values[index],
      height: values[index] > 0 ? Math.max((values[index] / max) * 100, 8) : 3,
    }));
  }

  private getRecentMonths(count: number): Array<{ label: string; month: number; year: number }> {
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
    const now = new Date();

    return Array.from({ length: count }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
      return {
        label: formatter.format(date),
        month: date.getMonth(),
        year: date.getFullYear(),
      };
    });
  }

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private getTimeValue(value?: string): number {
    return this.parseDate(value)?.getTime() || 0;
  }

  private percentChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

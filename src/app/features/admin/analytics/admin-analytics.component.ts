// src/app/features/admin/analytics/admin-analytics.component.ts
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { AnalyticsService } from '../../../core/services/analytics.service';
import { AdminService, AdminUser } from '../../../core/services/admin.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { ApplicationService } from '../../../core/services/application.service';
import { InterviewService } from '../../../core/services/interview.service';
import { Application } from '../../../core/models/application.model';
import { Interview } from '../../../core/models/interview.model';
import { Job } from '../../../core/models/job.model';
import { Invoice } from '../../../core/models/subscription.model';

interface MonthlyStat {
  month: string;
  users: number;
  jobs: number;
  applications: number;
  interviews: number;
  revenue: number;
}

interface CategoryStat {
  name: string;
  jobs: number;
  applications: number;
}

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-analytics.component.html',
  styleUrls: ['./admin-analytics.component.scss']
})
export class AdminAnalyticsComponent implements OnInit {
  isLoading = true;
  warningMessages: string[] = [];

  overviewMetrics = {
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
    userGrowthRate: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    revenueGrowth: 0,
    avgTimeToHire: 0,
    successRate: 0,
  };

  monthlyStats: MonthlyStat[] = [];
  topCategories: CategoryStat[] = [];
  totalApplications = 0;
  totalOffers = 0;

  constructor(
    private analyticsService: AnalyticsService,
    private adminService: AdminService,
    private subscriptionService: SubscriptionService,
    private applicationService: ApplicationService,
    private interviewService: InterviewService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.isLoading = true;
    const warnings = new Set<string>();

    forkJoin({
      usersPage: this.adminService.getUsers({ size: 1000 }).pipe(
        catchError(() => {
          warnings.add('User analytics data is unavailable.');
          return of(null);
        })
      ),
      jobs: this.adminService.getJobs().pipe(
        catchError(() => {
          warnings.add('Job analytics data is unavailable.');
          return of([] as Job[]);
        })
      ),
      analytics: this.analyticsService.getPlatformAnalytics().pipe(
        catchError(() => {
          warnings.add('Platform analytics service is unavailable.');
          return of(null);
        })
      ),
    }).subscribe({
      next: ({ usersPage, jobs, analytics }) => {
        const users = usersPage?.content || [];
        const recruiters = users.filter((user) => user.role === 'RECRUITER');
        const applications$ = this.loadApplicationsForJobs(jobs);

        if (recruiters.length === 0) {
          applications$.subscribe({
            next: (applications) => {
              const countedJobs = this.applyApplicationCountsToJobs(jobs, applications);
              this.applyAnalytics(
                users,
                usersPage?.totalElements || users.length,
                countedJobs,
                analytics,
                [],
                applications,
                [],
                warnings
              );
            },
            error: () => this.handleAnalyticsFailure(warnings),
          });
          return;
        }

        forkJoin({
          applications: applications$,
          invoiceGroups: forkJoin(
            recruiters.map((recruiter) =>
              this.subscriptionService.getInvoicesByRecruiter(recruiter.userId || recruiter.id)
                .pipe(
                  catchError(() => {
                    warnings.add('Some billing records were skipped.');
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
                    warnings.add('Some interview records were skipped.');
                    return of([] as Interview[]);
                  })
                )
            )
          ),
        }).subscribe({
          next: ({ applications, invoiceGroups, interviewGroups }) => {
            const countedJobs = this.applyApplicationCountsToJobs(jobs, applications);
            this.applyAnalytics(
              users,
              usersPage?.totalElements || users.length,
              countedJobs,
              analytics,
              invoiceGroups.flat(),
              applications,
              interviewGroups.flat(),
              warnings
            );
          },
          error: () => this.handleAnalyticsFailure(warnings),
        });
      },
      error: () => this.handleAnalyticsFailure(warnings),
    });
  }

  exportReport(): void {
    const rows = [
      ['Metric', 'Value'],
      ['Total Users', this.overviewMetrics.totalUsers],
      ['Active Users', this.overviewMetrics.activeUsers],
      ['New Users This Month', this.overviewMetrics.newUsersThisMonth],
      ['User Growth Rate', `${this.overviewMetrics.userGrowthRate}%`],
      ['Total Revenue', this.overviewMetrics.totalRevenue],
      ['Monthly Revenue', this.overviewMetrics.monthlyRevenue],
      ['Revenue Growth', `${this.overviewMetrics.revenueGrowth}%`],
      ['Average Time To Hire', `${this.overviewMetrics.avgTimeToHire} days`],
      ['Success Rate', `${this.overviewMetrics.successRate}%`],
      [],
      ['Month', 'Users', 'Jobs', 'Applications', 'Interviews', 'Revenue'],
      ...this.monthlyStats.map((stat) => [stat.month, stat.users, stat.jobs, stat.applications, stat.interviews, stat.revenue]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = `admin-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private applyAnalytics(
    users: AdminUser[],
    totalUsers: number,
    jobs: Job[],
    analytics: any,
    invoices: Invoice[],
    applications: Application[],
    interviews: Interview[],
    warnings: Set<string>
  ): void {
    this.warningMessages = Array.from(warnings);
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const applicationsByStatus = analytics?.applicationsByStatus || {};

    this.totalApplications = applications.length || analytics?.totalApplications || analytics?.totalApplicationEvents || this.sumJobApplications(jobs);
    this.totalOffers = applications.filter((application) => application.status === 'OFFERED').length
      || analytics?.totalOffered
      || applicationsByStatus['OFFERED']
      || 0;

    const newUsersThisMonth = this.countByMonth(users, now.getFullYear(), now.getMonth(), (user) => user.joinedAt || user.createdAt);
    const newUsersLastMonth = this.countByMonth(users, previousMonth.getFullYear(), previousMonth.getMonth(), (user) => user.joinedAt || user.createdAt);
    const monthlyRevenue = this.sumInvoicesByMonth(invoices, now.getFullYear(), now.getMonth());
    const previousRevenue = this.sumInvoicesByMonth(invoices, previousMonth.getFullYear(), previousMonth.getMonth());

    this.overviewMetrics = {
      totalUsers,
      activeUsers: users.filter((user) => user.status === 'ACTIVE').length,
      newUsersThisMonth,
      userGrowthRate: this.percentChange(newUsersThisMonth, newUsersLastMonth),
      totalRevenue: this.roundMoney(invoices.reduce((total, invoice) => total + this.getInvoiceAmount(invoice), 0)),
      monthlyRevenue,
      revenueGrowth: this.percentChange(monthlyRevenue, previousRevenue),
      avgTimeToHire: this.calculateAvgTimeToHire(applications, interviews) || analytics?.avgTimeToHireDays || analytics?.avgTimeToHire || 0,
      successRate: this.totalApplications > 0 ? this.roundMoney((this.totalOffers / this.totalApplications) * 100) : 0,
    };

    this.monthlyStats = this.buildMonthlyStats(users, jobs, invoices, applications, interviews);
    this.topCategories = this.buildTopCategories(jobs);
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  private handleAnalyticsFailure(warnings: Set<string>): void {
    warnings.add('Analytics loaded with fallback values only.');
    this.applyAnalytics([], 0, [], null, [], [], [], warnings);
  }

  private buildMonthlyStats(users: AdminUser[], jobs: Job[], invoices: Invoice[], applications: Application[], interviews: Interview[]): MonthlyStat[] {
    return this.getRecentMonths(6).map((month) => ({
      month: month.label,
      users: this.countByMonth(users, month.year, month.month, (user) => user.joinedAt || user.createdAt),
      jobs: this.countByMonth(jobs, month.year, month.month, (job) => job.postedAt),
      applications: this.countByMonth(applications, month.year, month.month, (application) => application.appliedAt),
      interviews: this.countByMonth(interviews, month.year, month.month, (interview) => interview.scheduledAt || interview.createdAt),
      revenue: this.sumInvoicesByMonth(invoices, month.year, month.month),
    }));
  }

  private buildTopCategories(jobs: Job[]): CategoryStat[] {
    const groups = new Map<string, CategoryStat>();

    jobs.forEach((job) => {
      const name = job.category || job.jobType?.replace('_', ' ') || 'Uncategorized';
      const current = groups.get(name) || { name, jobs: 0, applications: 0 };
      current.jobs += 1;
      current.applications += job.applicationsCount || 0;
      groups.set(name, current);
    });

    return Array.from(groups.values())
      .sort((left, right) => right.jobs - left.jobs || right.applications - left.applications)
      .slice(0, 5);
  }

  private countByMonth<T>(items: T[], year: number, month: number, getDate: (item: T) => string | undefined): number {
    return items.filter((item) => {
      const date = this.parseDate(getDate(item));
      return date?.getFullYear() === year && date.getMonth() === month;
    }).length;
  }

  private sumInvoicesByMonth(invoices: Invoice[], year: number, month: number): number {
    return this.roundMoney(invoices.reduce((total, invoice) => {
      const paidAt = this.parseDate(invoice.paymentDate || (invoice as any).createdAt);
      if (!paidAt || paidAt.getFullYear() !== year || paidAt.getMonth() !== month) return total;
      return total + this.getInvoiceAmount(invoice);
    }, 0));
  }

  private getInvoiceAmount(invoice: Invoice): number {
    return Number(invoice.totalAmount || invoice.amount || 0);
  }

  private loadApplicationsForJobs(jobs: Job[]) {
    if (!jobs.length) {
      return of([] as Application[]);
    }

    return forkJoin(
      jobs.map((job) =>
        this.applicationService.getApplicationsByJob(job.jobId).pipe(
          catchError(() => of([] as Application[]))
        )
      )
    ).pipe(
      map((groups) => groups.flat())
    );
  }

  private applyApplicationCountsToJobs(jobs: Job[], applications: Application[]): Job[] {
    const counts = applications.reduce((acc, application) => {
      const key = String(application.jobId || application.job?.jobId || '');
      if (key) {
        acc.set(key, (acc.get(key) || 0) + 1);
      }
      return acc;
    }, new Map<string, number>());

    return jobs.map((job) => ({
      ...job,
      applicationsCount: counts.get(String(job.jobId)) || job.applicationsCount || 0,
    }));
  }

  private sumJobApplications(jobs: Job[]): number {
    return jobs.reduce((total, job) => total + (job.applicationsCount || 0), 0);
  }

  private calculateAvgTimeToHire(applications: Application[], interviews: Interview[]): number {
    const applicationsById = new Map(applications.map((application) => [String(application.applicationId), application]));
    const completedInterviews = interviews.filter((interview) => interview.status === 'COMPLETED');

    if (!completedInterviews.length) {
      return 0;
    }

    const durations = completedInterviews
      .map((interview) => {
        const application = applicationsById.get(String(interview.applicationId));
        const appliedAt = this.parseDate(application?.appliedAt);
        const completedAt = this.parseDate(interview.updatedAt || interview.scheduledAt);

        if (!appliedAt || !completedAt || completedAt < appliedAt) {
          return null;
        }

        return Math.ceil((completedAt.getTime() - appliedAt.getTime()) / 86400000);
      })
      .filter((duration): duration is number => duration !== null);

    if (!durations.length) {
      return 0;
    }

    return this.roundMoney(durations.reduce((sum, duration) => sum + duration, 0) / durations.length);
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

  private percentChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

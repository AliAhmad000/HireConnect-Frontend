import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { JobService } from '../../core/services/job.service';
import { AuthService } from '../../core/services/auth.service';
import { Job } from '../../core/models/job.model';

interface HomeStat {
  label: string;
  value: number;
  icon: string;
}

interface CategorySummary {
  name: string;
  count: number;
  icon: string;
}

interface CountSummary {
  name: string;
  count: number;
}

interface PopularSearch {
  label: string;
  count: number;
  icon: string;
  params: Record<string, string>;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  searchControl = new FormControl('');
  locationControl = new FormControl('');

  featuredJobs: Job[] = [];
  topCategories: CategorySummary[] = [];
  topCompanies: CountSummary[] = [];
  topLocations: CountSummary[] = [];
  topJobTypes: CountSummary[] = [];
  popularSearches: PopularSearch[] = [];
  stats: HomeStat[] = [];

  isAuthenticated = false;
  userRole: string | null = null;
  isLoading = true;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private jobService: JobService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.router.navigateByUrl(this.getRoleLandingRoute(currentUser.role), { replaceUrl: true });
      return;
    }

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.isAuthenticated = !!user;
        this.userRole = user?.role || null;
      });

    this.loadJobs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadJobs(): void {
    this.isLoading = true;

    this.jobService.getJobs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: jobs => {
          const activeJobs = (jobs || []).filter(job => !job.status || job.status === 'ACTIVE');
          this.featuredJobs = activeJobs.slice(0, 6);
          this.topCategories = this.buildCategorySummary(activeJobs);
          this.topCompanies = this.buildCompanySummary(activeJobs, 5);
          this.topLocations = this.buildCountSummary(activeJobs.map(job => job.location), 5);
          this.topJobTypes = this.buildCountSummary(activeJobs.map(job => this.formatJobType(job.jobType)), 5);
          this.popularSearches = this.buildPopularSearches(activeJobs);
          this.stats = this.buildStats(activeJobs);
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: err => {
          console.error('Unable to load landing page jobs', err);
          this.featuredJobs = [];
          this.topCategories = [];
          this.topCompanies = [];
          this.topLocations = [];
          this.topJobTypes = [];
          this.popularSearches = [];
          this.stats = this.buildStats([]);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  search(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    const title = this.searchControl.value?.trim();
    const location = this.locationControl.value?.trim();
    const queryParams = new URLSearchParams();

    if (title) {
      queryParams.set('title', title);
      queryParams.set('q', title);
    }

    if (location) {
      queryParams.set('location', location);
    }

    const queryString = queryParams.toString();
    this.router.navigateByUrl(queryString ? `/jobs?${queryString}` : '/jobs');
  }

  searchCategory(category: string): void {
    this.router.navigateByUrl(`/jobs?category=${encodeURIComponent(category)}`);
  }

  searchPopular(search: PopularSearch): void {
    this.router.navigate(['/jobs'], { queryParams: search.params });
  }

  getStarted(): void {
    if (!this.isAuthenticated) {
      this.router.navigate(['/auth/register']);
      return;
    }

    if (this.userRole === 'RECRUITER') {
      this.router.navigate(['/recruiter/dashboard']);
      return;
    }

    if (this.userRole === 'ADMIN') {
      this.router.navigate(['/admin/dashboard']);
      return;
    }

    this.router.navigate(['/candidate/dashboard']);
  }

  postJob(): void {
    if (this.isAuthenticated && this.userRole === 'RECRUITER') {
      this.router.navigate(['/recruiter/post-job']);
      return;
    }

    this.router.navigate(['/auth/register'], { queryParams: { role: 'recruiter' } });
  }

  formatJobType(jobType?: string): string {
    return (jobType || 'FULL_TIME')
      .toLowerCase()
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  salaryLabel(job: Job): string {
    if (!job.salaryMin && !job.salaryMax) {
      return 'Salary not disclosed';
    }

    if (job.salaryMin && job.salaryMax) {
      return `${this.formatInr(job.salaryMin)} - ${this.formatInr(job.salaryMax)}`;
    }

    return this.formatInr(job.salaryMin || job.salaryMax);
  }

  companyInitial(job: Job): string {
    return (job.companyName || job.title || 'H').trim().charAt(0).toUpperCase();
  }

  trackByJobId(_: number, job: Job): string {
    return job.jobId;
  }

  private buildStats(jobs: Job[]): HomeStat[] {
    const companies = new Set(
      jobs
        .map(job => this.companyIdentity(job)?.key)
        .filter((key): key is string => !!key)
    );
    const remoteRoles = jobs.filter(job => job.isRemote || job.jobType === 'REMOTE').length;
    const categories = new Set(jobs.map(job => job.category).filter(Boolean));

    return [
      { label: 'Open roles', value: jobs.length, icon: 'work' },
      { label: 'Companies hiring', value: companies.size, icon: 'apartment' },
      { label: 'Remote roles', value: remoteRoles, icon: 'public' },
      { label: 'Job categories', value: categories.size, icon: 'category' }
    ];
  }

  private buildCompanySummary(jobs: Job[], limit: number): CountSummary[] {
    const counts = jobs.reduce((acc, job) => {
      const identity = this.companyIdentity(job);
      if (!identity) {
        return acc;
      }

      const current = acc.get(identity.key);
      acc.set(identity.key, {
        name: current?.name || identity.name,
        count: (current?.count || 0) + 1
      });
      return acc;
    }, new Map<string, CountSummary>());

    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, limit);
  }

  private buildCategorySummary(jobs: Job[]): CategorySummary[] {
    const counts = jobs.reduce((acc, job) => {
      const category = job.category?.trim();
      if (!category) {
        return acc;
      }

      acc.set(category, (acc.get(category) || 0) + 1);
      return acc;
    }, new Map<string, number>());

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({
        name,
        count,
        icon: this.categoryIcon(name)
      }));
  }

  private buildPopularSearches(jobs: Job[]): PopularSearch[] {
    const suggestions = new Map<string, PopularSearch>();

    const addSuggestion = (
      key: string,
      label: string | undefined | null,
      count: number,
      icon: string,
      params: Record<string, string>,
    ) => {
      const normalizedLabel = label?.trim();
      if (!normalizedLabel || count <= 0) {
        return;
      }

      const normalizedKey = key.toLowerCase();
      const existing = suggestions.get(normalizedKey);
      if (!existing || count > existing.count) {
        suggestions.set(normalizedKey, {
          label: normalizedLabel,
          count,
          icon,
          params,
        });
      }
    };

    this.buildCountSummary(jobs.flatMap(job => job.skills || []), 8)
      .forEach(skill => addSuggestion(`skill:${skill.name}`, skill.name, skill.count, 'psychology', {
        title: skill.name,
        q: skill.name,
        sort: 'recent',
      }));

    this.buildCountSummary(jobs.map(job => job.category), 6)
      .forEach(category => addSuggestion(`category:${category.name}`, category.name, category.count, this.categoryIcon(category.name), {
        category: category.name,
        sort: 'recent',
      }));

    this.buildCompanySummary(jobs, 6)
      .forEach(company => addSuggestion(`company:${company.name}`, company.name, company.count, 'apartment', {
        title: company.name,
        q: company.name,
        sort: 'recent',
      }));

    this.buildCountSummary(jobs.map(job => job.location), 6)
      .forEach(location => addSuggestion(`location:${location.name}`, location.name, location.count, 'location_on', {
        location: location.name,
        sort: 'recent',
      }));

    const remoteCount = jobs.filter(job => job.isRemote || job.jobType === 'REMOTE' || job.location?.toLowerCase().includes('remote')).length;
    addSuggestion('location:remote', 'Remote jobs', remoteCount, 'public', {
      location: 'Remote',
      sort: 'recent',
    });

    return Array.from(suggestions.values())
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 7);
  }

  private buildCountSummary(values: Array<string | undefined | null>, limit: number): CountSummary[] {
    const counts = values.reduce((acc, value) => {
      const name = value?.trim();
      if (!name) {
        return acc;
      }

      acc.set(name, (acc.get(name) || 0) + 1);
      return acc;
    }, new Map<string, number>());

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  }

  private companyIdentity(job: Job): { key: string; name: string } | null {
    const companyName = job.companyName?.trim();
    const placeholderNames = new Set(['not specified', 'not provided', 'hiring company', 'company']);

    if (companyName && !placeholderNames.has(companyName.toLowerCase())) {
      return {
        key: `company:${companyName.toLowerCase()}`,
        name: companyName
      };
    }

    if (job.postedBy) {
      return {
        key: `recruiter:${job.postedBy}`,
        name: companyName || `Recruiter ${job.postedBy}`
      };
    }

    return null;
  }

  private categoryIcon(category: string): string {
    const normalized = category.toLowerCase();

    if (normalized.includes('tech') || normalized.includes('software') || normalized.includes('it')) {
      return 'terminal';
    }

    if (normalized.includes('finance') || normalized.includes('account')) {
      return 'account_balance';
    }

    if (normalized.includes('market') || normalized.includes('sales')) {
      return 'campaign';
    }

    if (normalized.includes('design') || normalized.includes('creative')) {
      return 'palette';
    }

    if (normalized.includes('health')) {
      return 'health_and_safety';
    }

    if (normalized.includes('education') || normalized.includes('training')) {
      return 'school';
    }

    return 'category';
  }

  private formatInr(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  }

  private getRoleLandingRoute(role: string): string {
    switch (role) {
      case 'CANDIDATE':
        return '/candidate/dashboard';
      case 'RECRUITER':
        return '/recruiter/dashboard';
      case 'ADMIN':
        return '/admin/dashboard';
      default:
        return '/home';
    }
  }
}

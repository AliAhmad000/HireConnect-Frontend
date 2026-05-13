// src/app/features/candidate/applications/application-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApplicationService } from '../../../core/services/application.service';
import { Application } from '../../../core/models/application.model';
import { ToastrService } from 'ngx-toastr';
import { getApiOrigin } from '../../../core/utils/url.util';

@Component({
  selector: 'app-application-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './application-detail.component.html',
  styleUrls: ['./application-detail.component.scss']
})
export class ApplicationDetailComponent implements OnInit {
  application: Application | null = null;
  isLoading = true;
  isWithdrawing = false;

  // Application timeline steps
  timelineSteps = [
    { status: 'APPLIED', label: 'Applied', icon: 'description' },
    { status: 'SHORTLISTED', label: 'Shortlisted', icon: 'star' },
    { status: 'INTERVIEW_SCHEDULED', label: 'Interview', icon: 'event' },
    { status: 'OFFERED', label: 'Offered', icon: 'workspace_premium' },
    { status: 'REJECTED', label: 'Rejected', icon: 'close' }
  ];

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      APPLIED: 'description',
      SHORTLISTED: 'star',
      INTERVIEW_SCHEDULED: 'event',
      OFFERED: 'workspace_premium',
      REJECTED: 'close',
      WITHDRAWN: 'undo'
    };
    return icons[status] || 'description';
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private applicationService: ApplicationService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadApplication(id);
    }
  }

  loadApplication(id: string): void {
    this.isLoading = true;
    this.applicationService.getApplicationById(id).subscribe({
      next: (application) => {
        this.application = application;
        this.isLoading = false;
      },
      error: () => {
        this.toastr.error('Failed to load application details');
        this.router.navigate(['/candidate/applications']);
        this.isLoading = false;
      }
    });
  }

  withdrawApplication(): void {
    if (!this.application) return;

    if (!confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) {
      return;
    }

    this.isWithdrawing = true;
    this.applicationService.withdrawApplication(this.application.applicationId).subscribe({
      next: () => {
        this.toastr.success('Application withdrawn successfully');
        this.router.navigate(['/candidate/applications']);
      },
      error: () => {
        this.toastr.error('Failed to withdraw application');
        this.isWithdrawing = false;
      }
    });
  }

  getStatusIndex(status: string): number {
    const index = this.timelineSteps.findIndex(s => s.status === status);
    return index >= 0 ? index : 0;
  }

  isStepCompleted(stepStatus: string): boolean {
    if (!this.application) return false;
    
    if (this.application.status === 'REJECTED') {
      return this.getStatusIndex(stepStatus) <= this.getStatusIndex(this.application.status) && 
             stepStatus !== 'OFFERED';
    }
    
    return this.getStatusIndex(stepStatus) <= this.getStatusIndex(this.application.status);
  }

  isStepActive(stepStatus: string): boolean {
    return this.application?.status === stepStatus;
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'APPLIED': 'status-applied',
      'SHORTLISTED': 'status-shortlisted',
      'INTERVIEW_SCHEDULED': 'status-interview',
      'OFFERED': 'status-offered',
      'REJECTED': 'status-rejected',
      'WITHDRAWN': 'status-withdrawn'
    };
    return classes[status] || 'status-applied';
  }

  getStatusMessage(status: string): string {
    const messages: { [key: string]: string } = {
      'APPLIED': 'Your application has been submitted and is under review.',
      'SHORTLISTED': 'Congratulations! You have been shortlisted for this position.',
      'INTERVIEW_SCHEDULED': 'An interview has been scheduled. Please check your interview details.',
      'OFFERED': 'Congratulations! You have received an offer for this position.',
      'REJECTED': 'Unfortunately, your application was not selected for this position.',
      'WITHDRAWN': 'You have withdrawn your application.'
    };
    return messages[status] || 'Status unknown';
  }

  getResumeUrl(): string {
    if (!this.application?.resumeUrl) return '#';
    if (/^https?:\/\//i.test(this.application.resumeUrl)) return this.application.resumeUrl;

    const apiOrigin = getApiOrigin();
    return `${apiOrigin}${this.application.resumeUrl.startsWith('/') ? this.application.resumeUrl : `/${this.application.resumeUrl}`}`;
  }
}

// src/app/features/candidate/applications/my-applications.component.ts
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ApplicationService } from '../../../core/services/application.service';
import { Application } from '../../../core/models/application.model';

@Component({
  selector: 'app-my-applications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-applications.component.html',
  styleUrls: ['./my-applications.component.scss']
})
export class MyApplicationsComponent implements OnInit {
  applications: Application[] = [];
  filteredApplications: Application[] = [];
  isLoading = true;
  selectedStatus = 'ALL';
  
  statuses = ['ALL', 'APPLIED', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'OFFERED', 'REJECTED'];

  constructor(
    private applicationService: ApplicationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    this.isLoading = true;
    this.applicationService.getMyApplications().pipe(
      finalize(() => this.finishLoading())
    ).subscribe({
      next: (applications) => {
        this.applications = applications;
        this.filterApplications(this.selectedStatus);
        this.cdr.detectChanges();
      }
    });
  }

  filterApplications(status: string): void {
    this.selectedStatus = status;
    if (status === 'ALL') {
      this.filteredApplications = this.applications;
    } else {
      this.filteredApplications = this.applications.filter(a => a.status === status);
    }
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
    return classes[status] || '';
  }

  withdrawApplication(id: string): void {
    if (confirm('Are you sure you want to withdraw this application?')) {
      this.applicationService.withdrawApplication(id).subscribe({
        next: () => {
          this.loadApplications();
        }
      });
    }
  }

  private finishLoading(): void {
    setTimeout(() => {
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }
}

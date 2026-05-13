// src/app/features/candidate/interviews/interviews.component.ts
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InterviewService } from '../../../core/services/interview.service';
import { Interview } from '../../../core/models/interview.model';

@Component({
  selector: 'app-interviews',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './interviews.component.html',
  styleUrls: ['./interviews.component.scss']
})
export class InterviewsComponent implements OnInit {
  interviews: Interview[] = [];
  upcomingInterviews: Interview[] = [];
  pastInterviews: Interview[] = [];
  isLoading = true;
  rescheduleInterviewId: string | null = null;
  rescheduleForm = {
    newScheduledAt: '',
    rescheduleReason: ''
  };
  rescheduleError = '';
  isSubmittingReschedule = false;

  constructor(
    private interviewService: InterviewService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInterviews();
  }

  loadInterviews(): void {
    this.isLoading = true;
    this.interviewService.getMyInterviews().subscribe({
      next: (interviews) => {
        this.interviews = interviews;
        this.categorizeInterviews();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  categorizeInterviews(): void {
    const now = new Date();
    
    this.upcomingInterviews = this.interviews.filter(
      i => ['SCHEDULED', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'RESCHEDULED'].includes(i.status)
    ).filter(i => new Date(i.scheduledAt) > now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    
    this.pastInterviews = this.interviews.filter(
      i => i.status === 'COMPLETED' || i.status === 'CANCELLED' || new Date(i.scheduledAt) <= now
    ).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  }

  confirmInterview(id: string): void {
    this.interviewService.confirmInterview(id).subscribe({
      next: () => this.loadInterviews()
    });
  }

  openRescheduleRequest(interview: Interview): void {
    this.rescheduleInterviewId = interview.interviewId;
    this.rescheduleForm = {
      newScheduledAt: '',
      rescheduleReason: ''
    };
    this.rescheduleError = '';
    this.cdr.detectChanges();
  }

  submitRescheduleRequest(): void {
    if (this.isSubmittingReschedule) {
      return;
    }

    if (!this.rescheduleInterviewId || !this.rescheduleForm.newScheduledAt || !this.rescheduleForm.rescheduleReason.trim()) {
      this.rescheduleError = 'Please select a new date/time and enter a reason.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.isFutureDateTime(this.rescheduleForm.newScheduledAt)) {
      this.rescheduleError = 'Please choose a future date and time.';
      this.cdr.detectChanges();
      return;
    }

    const interviewId = this.rescheduleInterviewId;
    this.isSubmittingReschedule = true;
    this.rescheduleError = '';
    this.interviewService.requestReschedule(this.rescheduleInterviewId, {
      newScheduledAt: this.rescheduleForm.newScheduledAt,
      rescheduleReason: this.rescheduleForm.rescheduleReason.trim()
    }).subscribe({
      next: (updatedInterview) => {
        this.interviews = this.interviews.map((interview) =>
          interview.interviewId === interviewId ? updatedInterview : interview
        );
        this.rescheduleInterviewId = null;
        this.isSubmittingReschedule = false;
        this.loadInterviews();
      },
      error: (error) => {
        this.isSubmittingReschedule = false;
        this.rescheduleError = error?.error?.message || 'Failed to request reschedule. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  cancelRescheduleRequest(): void {
    this.rescheduleInterviewId = null;
    this.rescheduleError = '';
    this.isSubmittingReschedule = false;
    this.cdr.detectChanges();
  }

  getMinimumDateTime(): string {
    return this.toDateTimeLocalValue(new Date());
  }

  private isFutureDateTime(value: string): boolean {
    return new Date(value).getTime() > Date.now();
  }

  private toDateTimeLocalValue(date: Date): string {
    const pad = (number: number) => number.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  cancelInterview(id: string): void {
    if (confirm('Are you sure you want to cancel this interview?')) {
      this.interviewService.cancelInterview(id).subscribe({
        next: () => this.loadInterviews()
      });
    }
  }
}

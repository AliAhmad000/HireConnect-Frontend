// src/app/features/recruiter/application-detail/application-detail.component.ts
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApplicationService } from '../../../core/services/application.service';
import { InterviewService } from '../../../core/services/interview.service';
import { ProfileService } from '../../../core/services/profile.service';
import { Application } from '../../../core/models/application.model';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
import { getApiOrigin } from '../../../core/utils/url.util';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-application-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './application-detail.component.html',
  styleUrls: ['./application-detail.component.scss']
})
export class ApplicationDetailComponent implements OnInit {
  application: Application | null = null;
  isLoading = true;
  errorMessage = '';
  schedulerOpen = false;
  schedulerMode: 'schedule' | 'reschedule' = 'schedule';
  selectedInterview: any | null = null;
  interviews: any[] = [];
  candidateMessage = '';
  isSendingMessage = false;
  
  interviewForm = {
    scheduledAt: '',
    mode: 'ONLINE' as 'ONLINE' | 'IN_PERSON',
    meetLink: '',
    location: '',
    notes: ''
  };
private toastr = inject(ToastrService);
  constructor(
    private route: ActivatedRoute,
    private applicationService: ApplicationService,
    private interviewService: InterviewService,
    private profileService: ProfileService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.schedulerOpen = this.route.snapshot.queryParamMap.get('schedule') === 'true';

      if (id) {
        this.loadApplication(id);
        return;
      }

      this.application = null;
      this.interviews = [];
      this.errorMessage = 'Application ID is missing.';
      this.isLoading = false;
      this.cdr.markForCheck();
    });
  }

  loadApplication(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.application = null;
    this.interviews = [];
    this.cdr.markForCheck();

    this.applicationService.getApplicationById(id).pipe(
      finalize(() => {
        queueMicrotask(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        });
      })
    ).subscribe({
      next: (application) => {
        this.application = application;
        this.cdr.markForCheck();
        this.loadInterviews(id);
      },
      error: (error) => {
        console.error('Error loading application detail:', error);
        this.application = null;
        this.errorMessage = 'Unable to load this application. It may have been removed or you may not have access.';
        this.cdr.markForCheck();
      }
    });
  }

  loadInterviews(applicationId: string): void {
    this.interviewService.getInterviewsByApplication(applicationId).subscribe({
      next: (interviews) => {
        this.interviews = interviews;
        this.cdr.markForCheck();
      },
      error: () => {
        this.interviews = [];
        this.cdr.markForCheck();
      }
    });
  }

  getCandidateName(): string {
    return this.application?.candidate?.fullName || this.application?.candidateName || 'Candidate';
  }

  getCandidateEmail(): string {
    return this.application?.candidate?.email || this.application?.candidateEmail || 'Email not available';
  }

  getCandidateMobile(): string {
    return this.application?.candidate?.mobile || 'Phone not available';
  }

  getCandidateSkills(): string[] {
    return this.application?.candidate?.skills || [];
  }

  getJobTitle(): string {
    return this.application?.job?.title || this.application?.jobTitle || 'Job';
  }

  getCompanyName(): string {
    return this.application?.job?.companyName || this.application?.companyName || 'Company not available';
  }

  getResumeUrl(): string {
    return this.application?.resumeUrl || this.application?.candidate?.resumeUrl || '';
  }

  isShortlisted(): boolean {
    return this.normalizeStatus(this.application?.status) === 'SHORTLISTED';
  }

  canMessageCandidate(): boolean {
    return ['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'OFFERED'].includes(this.normalizeStatus(this.application?.status));
  }

  canMoveToStatus(targetStatus: string): boolean {
    const currentStatus = this.normalizeStatus(this.application?.status);
    const target = this.normalizeStatus(targetStatus);

    if (!this.application || currentStatus === target || ['REJECTED', 'WITHDRAWN', 'OFFERED'].includes(currentStatus)) {
      return false;
    }

    const allowedTransitions: Record<string, string[]> = {
      APPLIED: ['SHORTLISTED', 'REJECTED'],
      SHORTLISTED: ['INTERVIEW_SCHEDULED', 'REJECTED'],
      INTERVIEW_SCHEDULED: ['OFFERED', 'REJECTED'],
    };

    return allowedTransitions[currentStatus]?.includes(target) ?? false;
  }

  canOpenScheduler(): boolean {
    return this.canScheduleNewInterview() || this.canRescheduleExistingInterview();
  }

  canScheduleNewInterview(): boolean {
    return this.canMoveToStatus('INTERVIEW_SCHEDULED');
  }

  canRescheduleExistingInterview(): boolean {
    return this.normalizeStatus(this.application?.status) === 'INTERVIEW_SCHEDULED'
      && !!this.getLatestReschedulableInterview();
  }

  getSchedulerActionLabel(): string {
    return this.canRescheduleExistingInterview() ? 'Reschedule Interview' : 'Schedule Interview';
  }

  getSchedulerActionTitle(): string {
    if (this.canScheduleNewInterview()) {
      return 'Schedule an interview for this shortlisted candidate.';
    }

    if (this.canRescheduleExistingInterview()) {
      return 'Reschedule the latest interview for this candidate.';
    }

    return 'Schedule is available after shortlisting. Reschedule is available after an interview exists.';
  }

  getStatusActionTitle(targetStatus: string): string {
    if (this.canMoveToStatus(targetStatus)) {
      return '';
    }

    const currentStatus = this.normalizeStatus(this.application?.status).replace('_', ' ') || 'current stage';
    return `This action is not available from ${currentStatus.toLowerCase()}.`;
  }

  updateStatus(status: string): void {
    if (!this.application) return;

    if (!this.canMoveToStatus(status)) {
      this.toastr.info('This pipeline action is not available for the current status');
      return;
    }
    
    this.applicationService.updateApplicationStatus(this.application.applicationId, { status: status as any }).subscribe({
      next: (updated) => {
        this.application = updated;
        this.toastr.success(`Candidate ${status.toLowerCase()}`);
        this.cdr.markForCheck();
      }
    });
  }

  sendMessageToCandidate(): void {
    if (!this.application) return;

    const message = this.candidateMessage.trim();
    if (!message) {
      this.toastr.error('Please enter a message');
      return;
    }

    if (!this.canMessageCandidate()) {
      this.toastr.error('Messages can be sent after the candidate is shortlisted, scheduled, or offered');
      return;
    }

    this.isSendingMessage = true;
    this.applicationService
      .sendMessageToCandidate(this.application.applicationId, message)
      .pipe(
        finalize(() => {
          queueMicrotask(() => {
            this.isSendingMessage = false;
            this.cdr.markForCheck();
          });
        })
      )
      .subscribe({
        next: () => {
          this.candidateMessage = '';
          this.toastr.success('Message sent to candidate');
        },
        error: (error) => {
          this.toastr.error(error?.error?.message || 'Failed to send message');
        }
      });
  }

  scheduleInterview(): void {
    if (this.schedulerMode === 'reschedule' && this.selectedInterview) {
      this.rescheduleInterview(this.selectedInterview);
      return;
    }

    if (!this.application || !this.interviewForm.scheduledAt) {
      this.toastr.error('Please select interview date and time');
      return;
    }

    if (!this.isFutureDateTime(this.interviewForm.scheduledAt)) {
      this.toastr.error('Interview date and time must be in the future');
      return;
    }

    if (!this.canScheduleNewInterview()) {
      this.toastr.info('Interview can only be scheduled after shortlisting the candidate');
      return;
    }

    this.interviewService.scheduleInterview({
      applicationId: this.application.applicationId,
      candidateId: this.application.candidateId,
      jobId: this.application.jobId,
      jobTitle: this.application.job?.title || this.application.jobTitle,
      candidateName: this.application.candidate?.fullName || this.application.candidateName,
      candidateEmail: this.application.candidate?.email || this.application.candidateEmail,
      companyName: this.application.job?.companyName || this.application.companyName,
      ...this.interviewForm
    }).subscribe({
      next: () => {
        this.toastr.success('Interview scheduled successfully');
        this.closeScheduler();
        this.updateStatus('INTERVIEW_SCHEDULED');
        this.loadInterviews(this.application!.applicationId);
      }
    });
  }

  rescheduleInterview(interview: any): void {
    if (!this.interviewForm.scheduledAt) {
      this.toastr.error('Please select a new date and time for rescheduling');
      return;
    }

    if (!this.isFutureDateTime(this.interviewForm.scheduledAt)) {
      this.toastr.error('Interview date and time must be in the future');
      return;
    }

    this.interviewService.rescheduleInterview(interview.interviewId, {
      newScheduledAt: this.interviewForm.scheduledAt,
      rescheduleReason: interview.rescheduleReason || this.interviewForm.notes || 'Rescheduled by recruiter',
      meetLink: this.interviewForm.mode === 'ONLINE' ? this.interviewForm.meetLink : undefined,
      location: this.interviewForm.mode === 'IN_PERSON' ? this.interviewForm.location : undefined
    }).subscribe({
      next: () => {
        this.toastr.success('Interview rescheduled successfully');
        this.closeScheduler();
        this.loadInterviews(this.application!.applicationId);
      }
    });
  }

  openScheduler(): void {
    const existingInterview = this.getLatestReschedulableInterview();
    if (!this.canScheduleNewInterview() && existingInterview) {
      this.openRescheduler(existingInterview);
      return;
    }

    if (!this.canScheduleNewInterview()) {
      this.toastr.info(this.getSchedulerActionTitle());
      return;
    }

    queueMicrotask(() => {
      this.schedulerMode = 'schedule';
      this.selectedInterview = null;
      this.interviewForm = {
        scheduledAt: '',
        mode: 'ONLINE',
        meetLink: '',
        location: '',
        notes: ''
      };
      this.schedulerOpen = true;
      this.cdr.markForCheck();
    });
  }

  openRescheduler(interview: any): void {
    queueMicrotask(() => {
      const requestedDate = (interview.requestedScheduledAt || interview.scheduledAt || '').slice(0, 16);
      this.schedulerMode = 'reschedule';
      this.selectedInterview = interview;
      this.interviewForm = {
        scheduledAt: this.isFutureDateTime(requestedDate) ? requestedDate : '',
        mode: interview.mode,
        meetLink: interview.meetLink || '',
        location: interview.location || '',
        notes: interview.rescheduleReason || ''
      };
      this.schedulerOpen = true;
      this.cdr.markForCheck();
    });
  }

  closeScheduler(): void {
    queueMicrotask(() => {
      this.schedulerOpen = false;
      this.schedulerMode = 'schedule';
      this.selectedInterview = null;
      this.cdr.markForCheck();
    });
  }

  rejectReschedule(interview: any): void {
    const reason = prompt('Reason for declining the reschedule request:');
    if (reason !== null) {
      this.interviewService.rejectReschedule(interview.interviewId, reason).subscribe({
        next: () => {
          this.toastr.info('Reschedule request declined');
          this.loadInterviews(this.application!.applicationId);
        }
      });
    }
  }

  downloadResume(): void {
    const resumeUrl = this.getResumeUrl();
    const resumeWindow = window.open('about:blank', '_blank');

    if (resumeUrl) {
      this.openResumeUrl(resumeUrl, resumeWindow);
      return;
    }

    if (!this.application?.candidateId) {
      resumeWindow?.close();
      this.toastr.warning('No resume available for this candidate', 'Resume Not Found');
      return;
    }

    this.profileService.getCandidateResumeUrl(this.application.candidateId).subscribe({
      next: (profileResumeUrl) => {
        if (!profileResumeUrl) {
          resumeWindow?.close();
          this.toastr.warning('No resume available for this candidate', 'Resume Not Found');
          return;
        }

        if (this.application) {
          this.application.resumeUrl = profileResumeUrl;
        }

        this.openResumeUrl(profileResumeUrl, resumeWindow);
      },
      error: () => {
        resumeWindow?.close();
        this.toastr.warning('No resume available for this candidate', 'Resume Not Found');
      },
    });
  }

  getMinimumDateTime(): string {
    return this.toDateTimeLocalValue(new Date());
  }

  private isFutureDateTime(value: string | null | undefined): boolean {
    if (!value) {
      return false;
    }

    return new Date(value).getTime() > Date.now();
  }

  private getLatestReschedulableInterview(): any | null {
    const candidates = this.interviews
      .filter((interview) => ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'RESCHEDULE_REQUESTED'].includes(this.normalizeStatus(interview.status)))
      .sort((a, b) => new Date(b.scheduledAt || 0).getTime() - new Date(a.scheduledAt || 0).getTime());

    return candidates[0] || null;
  }

  private toDateTimeLocalValue(date: Date): string {
    const pad = (number: number) => number.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private openResumeUrl(url: string, resumeWindow: Window | null): void {
    const absoluteUrl = this.toAbsoluteResumeUrl(url);

    if (resumeWindow) {
      resumeWindow.location.href = absoluteUrl;
    } else {
      window.open(absoluteUrl, '_blank');
    }

    this.toastr.success('Resume opened in a new tab');
  }

  private toAbsoluteResumeUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    const apiOrigin = getApiOrigin();
    return `${apiOrigin}${url.startsWith('/') ? url : `/${url}`}`;
  }

  private normalizeStatus(status: string | null | undefined): string {
    return String(status || '').trim().toUpperCase().replace(/\s+/g, '_');
  }
}

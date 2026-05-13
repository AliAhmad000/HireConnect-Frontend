import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Subject, of } from 'rxjs';
import { catchError, switchMap, take, takeUntil } from 'rxjs/operators';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { RecruiterProfile } from '../../../core/models/recruiter.model';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-recruiter-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './recruiter-profile.component.html',
  styleUrls: ['./recruiter-profile.component.scss'],
})
export class RecruiterProfileComponent implements OnInit, OnDestroy {
  profileForm: FormGroup;
  profile: RecruiterProfile | null = null;
  isLoading = true;
  isSaving = false;
  isEditing = false;
  errorMessage = '';
  logoPreviewFailed = false;
  private readonly destroy$ = new Subject<void>();
  private toastr = inject(ToastrService);

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {
    this.profileForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', [Validators.pattern(/^$|^\+?[0-9\s-]{7,15}$/)]],
      designation: [''],
      companyName: ['', Validators.required],
      companySize: [''],
      industry: [''],
      website: [''],
      linkedinUrl: [''],
      logoUrl: [''],
      companyDescription: [''],
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(take(1))
      .subscribe(() => this.loadProfile());

    this.profileForm.get('logoUrl')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.logoPreviewFailed = false;
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const user = this.getCurrentUser();
    if (!user?.userId) {
      this.errorMessage = 'Unable to identify the current recruiter.';
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.profileService.getRecruiterProfile().pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return this.profileService.getRecruiterProfileByUserId(user.userId).pipe(
            catchError((fallbackError: HttpErrorResponse) => {
              if (fallbackError.status === 404) {
                return this.createInitialProfileRequest(user);
              }
              throw fallbackError;
            }),
          );
        }

        throw error;
      }),
    ).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.patchForm(profile);
        this.isLoading = false;
        this.logoPreviewFailed = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load recruiter profile right now.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const payload = this.buildPayload();
    const request = this.profile
      ? this.profileService.updateRecruiterProfile(payload)
      : this.profileService.createRecruiterProfile(payload);

    request.pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404 && this.profile) {
          return this.profileService.createRecruiterProfile(payload);
        }

        throw error;
      }),
    ).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.patchForm(profile);
        this.toastr.success('Recruiter profile saved successfully');
        this.isSaving = false;
        this.isEditing = false;
        this.logoPreviewFailed = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Failed to save recruiter profile');
        this.isSaving = false;
        this.cdr.detectChanges();
      },
    });
  }

  startEditing(): void {
    if (this.profile) {
      this.patchForm(this.profile);
    }

    this.isEditing = true;
  }

  cancelEditing(): void {
    if (this.profile) {
      this.patchForm(this.profile);
      this.isEditing = false;
      this.logoPreviewFailed = false;
      return;
    }

    this.isEditing = true;
  }

  removeLogoUrl(): void {
    this.logoPreviewFailed = false;
    this.profileForm.patchValue({ logoUrl: '' });
    this.profileForm.get('logoUrl')?.markAsDirty();
    this.profileForm.get('logoUrl')?.markAsTouched();
    this.cdr.detectChanges();
  }

  onLogoPreviewError(): void {
    this.logoPreviewFailed = true;
    this.cdr.detectChanges();
  }

  getProfileInitials(): string {
    const source = this.profile?.companyName || this.profile?.fullName || this.profileForm.get('companyName')?.value || 'HC';
    return String(source)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'HC';
  }

  getDisplayValue(value: unknown, fallback = 'Not added'): string {
    return typeof value === 'string' && value.trim() ? value : fallback;
  }

  getWebsiteUrl(url: string | undefined): string {
    if (!url) {
      return '';
    }

    return this.normalizeUrl(url);
  }

  getProfileLogoUrl(): string {
    return this.normalizeUrl(this.profile?.logoUrl || this.profile?.logo || '');
  }

  getFormLogoUrl(): string {
    return this.normalizeUrl(this.profileForm.get('logoUrl')?.value || '');
  }

  hasFormLogoUrl(): boolean {
    return !!this.getFormLogoUrl();
  }

  private reloadExistingProfile(): void {
    const user = this.getCurrentUser();
    const request = user?.userId
      ? this.profileService.getRecruiterProfileByUserId(user.userId)
      : this.profileService.getRecruiterProfile();

    request.subscribe({
      next: (profile) => {
        this.profile = profile;
        this.patchForm(profile);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load recruiter profile right now.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private createInitialProfileRequest(user: User) {
    if (!user.email) {
      this.seedEditableFallback(user);
      return of(null as unknown as RecruiterProfile);
    }

    const fullName = user.fullName || user.email.split('@')[0];
    const companyName = this.getDefaultCompanyName(user.email);

    return this.profileService.createRecruiterProfile({
      fullName,
      email: user.email,
      companyName,
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 409) {
          return this.profileService.getRecruiterProfileByUserId(user.userId);
        }

        this.profileForm.patchValue({ fullName, email: user.email, companyName });
        this.isEditing = true;
        this.errorMessage = '';
        return of(null as unknown as RecruiterProfile);
      }),
      switchMap((profile) => profile ? of(profile) : of(null as unknown as RecruiterProfile)),
    );
  }

  private seedEditableFallback(user: User): void {
    const email = user.email || '';
    this.profileForm.patchValue({
      fullName: user.fullName || email.split('@')[0] || '',
      email,
      companyName: email ? this.getDefaultCompanyName(email) : '',
    });
    this.isEditing = true;
    this.errorMessage = '';
  }

  private getCurrentUser(): User | null {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      return currentUser;
    }

    const storedUser = localStorage.getItem('user');
    if (!storedUser || storedUser === 'undefined') {
      return null;
    }

    try {
      return JSON.parse(storedUser) as User;
    } catch {
      return null;
    }
  }

  private getDefaultCompanyName(email: string): string {
    const domain = email.split('@')[1]?.split('.')[0];
    if (!domain) {
      return 'My Company';
    }

    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }

  private patchForm(profile: RecruiterProfile): void {
    if (!profile) {
      return;
    }

    this.profileForm.patchValue({
      fullName: profile.fullName || '',
      email: profile.email || '',
      mobile: profile.mobile || '',
      designation: profile.designation || '',
      companyName: profile.companyName || '',
      companySize: profile.companySize || '',
      industry: profile.industry || '',
      website: profile.website || '',
      linkedinUrl: profile.linkedinUrl || '',
      logoUrl: profile.logoUrl || profile.logo || '',
      companyDescription: profile.companyDescription || '',
    });
    this.logoPreviewFailed = false;
  }

  private buildPayload(): Partial<RecruiterProfile> {
    const value = this.profileForm.value;
    const payload = this.removeEmptyValues({
      fullName: value.fullName,
      email: value.email,
      mobile: value.mobile,
      designation: value.designation,
      companyName: value.companyName,
      companySize: value.companySize,
      industry: value.industry,
      website: value.website,
      linkedinUrl: value.linkedinUrl,
      companyDescription: value.companyDescription,
    });

    return {
      ...payload,
      logoUrl: typeof value.logoUrl === 'string' ? value.logoUrl.trim() : value.logoUrl,
    };
  }

  private removeEmptyValues<T extends Record<string, unknown>>(payload: T): T {
    return Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [
        key,
        typeof value === 'string' && value.trim() === '' ? undefined : value,
      ]).filter(([, value]) => value !== undefined),
    ) as T;
  }

  private normalizeUrl(url: string): string {
    const trimmed = String(url || '').trim();
    if (!trimmed) {
      return '';
    }

    if (/^https?:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed)) {
      return trimmed;
    }

    return `https://${trimmed}`;
  }
}

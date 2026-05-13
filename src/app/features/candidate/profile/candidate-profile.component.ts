// src/app/features/candidate/profile/candidate-profile.component.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, FormGroup, FormArray, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { CandidateProfile } from '../../../core/models/candidate.model';
import { getApiOrigin } from '../../../core/utils/url.util';

@Component({
  selector: 'app-candidate-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './candidate-profile.component.html',
  styleUrls: ['./candidate-profile.component.scss'],
})
export class CandidateProfileComponent implements OnInit {
  profileForm: FormGroup;
  isLoading = true;
  isSaving = false;
  isEditing = false;
  profile: CandidateProfile | null = null;
  resumeFile: File | null = null;
  maxDob = new Date().toISOString().split('T')[0];
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
      dob: ['', [this.notFutureDateValidator]],
      gender: [''],
      skills: this.fb.array([]),
      experience: [0, [Validators.min(0)]],
      summary: [''],
      currentCompany: [''],
      currentDesignation: [''],
      expectedSalary: [null, [Validators.min(0)]],
      noticePeriodDays: [null, [Validators.min(0)]],
      isOpenToRemote: [false],
      linkedinUrl: [''],
      githubUrl: [''],
      portfolioUrl: [''],
      preferredLocations: this.fb.array([]),
      addresses: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  notFutureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const selectedDate = new Date(control.value);
    const today = new Date();
    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return selectedDate > today ? { futureDate: true } : null;
  }

  loadProfile(): void {
    this.profileService.getCandidateProfile().subscribe({
      next: (profile) => {
        setTimeout(() => {
          this.profile = profile;

          this.patchForm(profile);

          this.isLoading = false;

          this.cdr.detectChanges();
        });
      },

      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.createInitialProfile();
          return;
        }

        setTimeout(() => {
          this.isLoading = false;

          this.cdr.detectChanges();
        });
      },
    });
  }

  patchForm(profile: CandidateProfile): void {
    this.skills.clear();
    this.preferredLocations.clear();
    this.addresses.clear();

    this.profileForm.patchValue({
      fullName: profile.fullName,
      email: profile.email,
      mobile: profile.mobile,
      dob: profile.dob || '',
      gender: profile.gender || '',
      experience: profile.experience || 0,
      summary: profile.summary || '',
      currentCompany: profile.currentCompany || '',
      currentDesignation: profile.currentDesignation || '',
      expectedSalary: profile.expectedSalary ?? null,
      noticePeriodDays: profile.noticePeriodDays ?? null,
      isOpenToRemote: profile.isOpenToRemote || false,
      linkedinUrl: profile.linkedinUrl || '',
      githubUrl: profile.githubUrl || '',
      portfolioUrl: profile.portfolioUrl || '',
    });

    if (Array.isArray(profile.skills)) {
      profile.skills.forEach((skill) => this.addSkill(skill));
    }
    if (Array.isArray(profile.preferredLocations)) {
      profile.preferredLocations.forEach((location) => this.addPreferredLocation(location));
    }
    if (Array.isArray(profile.addresses)) {
      profile.addresses.forEach((addr) => this.addAddress(addr));
    }
  }

  private createInitialProfile(): void {
    const user = this.authService.getCurrentUser();
    if (!user?.email) {
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.profileService.createCandidateProfile({
      fullName: user.fullName || user.email.split('@')[0],
      email: user.email,
    }).subscribe({
      next: (profile) => {
        setTimeout(() => {
          this.profile = profile;
          this.patchForm(profile);
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        setTimeout(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

  get skills(): FormArray {
    return this.profileForm.get('skills') as FormArray;
  }

  get preferredLocations(): FormArray {
    return this.profileForm.get('preferredLocations') as FormArray;
  }

  get addresses(): FormArray {
    return this.profileForm.get('addresses') as FormArray;
  }

  get dob() {
    return this.profileForm.get('dob');
  }

  addSkill(value: string = ''): void {
    this.skills.push(this.fb.control(value, Validators.required));
  }

  removeSkill(index: number): void {
    this.skills.removeAt(index);
  }

  addPreferredLocation(value: string = ''): void {
    const location = value.trim();
    if (location) {
      this.preferredLocations.push(this.fb.control(location, Validators.required));
    }
  }

  removePreferredLocation(index: number): void {
    this.preferredLocations.removeAt(index);
  }

  addAddress(addr: any = null): void {
    this.addresses.push(
      this.fb.group({
        houseNo: [addr?.houseNo || '', Validators.required],
        street: [addr?.street || '', Validators.required],
        city: [addr?.city || '', Validators.required],
        state: [addr?.state || '', Validators.required],
        country: [addr?.country || 'India', Validators.required],
        pincode: [addr?.pincode ?? null],
        addressType: [addr?.addressType || 'HOME'],
      }),
    );
  }

  removeAddress(index: number): void {
    this.addresses.removeAt(index);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.resumeFile = file;
      this.uploadResume();
    } else {
      this.toastr.error('Please select a PDF file', 'Invalid File');
    }
  }

  uploadResume(): void {
    if (!this.resumeFile) return;

    this.profileService.uploadResume(this.resumeFile).subscribe({
      next: (response) => {
        this.toastr.success('Resume uploaded successfully');
        if (this.profile) {
          this.profile.resumeUrl = response.resumeUrl;
        }
      },
      error: () => {
        this.toastr.error('Failed to upload resume');
      },
    });
  }

  getResumeUrl(resumeUrl: string | undefined): string {
    if (!resumeUrl) return '#';
    if (resumeUrl.startsWith('http')) return resumeUrl;
    return `${getApiOrigin()}${resumeUrl.startsWith('/') ? resumeUrl : `/${resumeUrl}`}`;
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      Object.keys(this.profileForm.controls).forEach((key) => {
        this.profileForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSaving = true;
    this.profileService.updateCandidateProfile(this.buildProfilePayload()).subscribe({
      next: (profile) => {
        setTimeout(() => {
          this.profile = profile;
          this.patchForm(profile);

          this.toastr.success('Profile updated successfully');

          this.isSaving = false;
          this.isEditing = false;

          this.cdr.detectChanges();
        });
      },

      error: () => {
        setTimeout(() => {
          this.isSaving = false;

          this.cdr.detectChanges();
        });
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
    }
  }

  getProfileInitials(): string {
    const source = this.profile?.fullName || this.profileForm.get('fullName')?.value || 'HC';
    return String(source)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'HC';
  }

  getDisplayValue(value: unknown, fallback = 'Not added'): string {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? String(value) : fallback;
    }

    return typeof value === 'string' && value.trim() ? value : fallback;
  }

  getCurrencyValue(value: number | null | undefined): string {
    return value === null || value === undefined ? 'Not added' : `₹${Number(value).toLocaleString('en-IN')}`;
  }

  getProfileUrl(url: string | undefined): string {
    if (!url) {
      return '';
    }

    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  }

  getPrimaryLocation(): string {
    return this.profile?.preferredLocations?.[0] || this.profile?.addresses?.[0]?.city || 'Location not added';
  }

  formatAddress(address: CandidateProfile['addresses'][number]): string {
    return [
      address.houseNo,
      address.street,
      address.city,
      address.state,
      address.country,
      address.pincode,
    ].filter(Boolean).join(', ');
  }

  private buildProfilePayload(): Partial<CandidateProfile> {
    const value = this.profileForm.value;
    const payload: Partial<CandidateProfile> = {
      fullName: value.fullName,
      email: value.email,
      mobile: this.emptyToUndefined(value.mobile),
      dob: this.emptyToUndefined(value.dob),
      gender: this.emptyToUndefined(value.gender),
      experience: Number(value.experience || 0),
      resumeUrl: this.emptyToUndefined(this.profile?.resumeUrl),
      linkedinUrl: this.emptyToUndefined(value.linkedinUrl),
      githubUrl: this.emptyToUndefined(value.githubUrl),
      portfolioUrl: this.emptyToUndefined(value.portfolioUrl),
      summary: this.emptyToUndefined(value.summary),
      currentCompany: this.emptyToUndefined(value.currentCompany),
      currentDesignation: this.emptyToUndefined(value.currentDesignation),
      expectedSalary: this.toOptionalNumber(value.expectedSalary),
      noticePeriodDays: this.toOptionalNumber(value.noticePeriodDays),
      isOpenToRemote: !!value.isOpenToRemote,
      skills: (value.skills || []).filter((skill: string) => !!skill?.trim()),
      preferredLocations: (value.preferredLocations || []).filter((location: string) => !!location?.trim()),
      addresses: (value.addresses || []).map((address: any) => ({
        houseNo: this.emptyToUndefined(address.houseNo),
        street: this.emptyToUndefined(address.street),
        city: this.emptyToUndefined(address.city),
        state: this.emptyToUndefined(address.state),
        country: this.emptyToUndefined(address.country) || 'India',
        pincode: this.toOptionalNumber(address.pincode),
        addressType: this.emptyToUndefined(address.addressType) || 'HOME',
      })),
    };

    return this.removeUndefinedValues(payload);
  }

  private emptyToUndefined(value: unknown): any {
    return typeof value === 'string' && value.trim() === '' ? undefined : value;
  }

  private toOptionalNumber(value: unknown): number | null {
    return value === null || value === undefined || value === '' ? null : Number(value);
  }

  private removeUndefinedValues<T>(value: T): T {
    if (Array.isArray(value)) {
      return value.map((item) => this.removeUndefinedValues(item)) as T;
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
      ) as T;
    }

    return value;
  }
}

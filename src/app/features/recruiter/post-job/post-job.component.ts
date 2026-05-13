// src/app/features/recruiter/post-job/post-job.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { JobService } from '../../../core/services/job.service';
import { ProfileService } from '../../../core/services/profile.service';
import { ToastrService } from 'ngx-toastr';
import { Job } from '../../../core/models/job.model';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-post-job',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './post-job.component.html',
  styleUrls: ['./post-job.component.scss'],
})
export class PostJobComponent implements OnInit {
  jobForm: FormGroup;
  isSubmitting = false;
  isEditMode = false;
  editJobId: string | null = null;
  isLoadingJob = false;
  recruiterCompanyName = '';
  recruiterLogoUrl = '';

  categories = [
    'Software Development',
    'Data Science & Analytics',
    'Artificial Intelligence & Machine Learning',
    'Cybersecurity',
    'Cloud & DevOps',
    'Product Management',
    'UI/UX Design',
    'Sales & Business Development',
    'Marketing & Growth',
    'Finance & Accounting',
    'Human Resources & Talent Acquisition',
    'Operations & Supply Chain',
    'Customer Support & Success',
    'Healthcare & Life Sciences',
    'Education & Training',
    'Legal & Compliance',
    'Engineering & Manufacturing',
    'Internships & Fresher Roles',
  ];

  jobTypes = [
    { value: 'FULL_TIME', label: 'Full Time' },
    { value: 'PART_TIME', label: 'Part Time' },
    { value: 'CONTRACT', label: 'Contract' },
    { value: 'INTERNSHIP', label: 'Internship' },
    { value: 'REMOTE', label: 'Remote' },
  ];

  experienceLevels = [
    'Entry Level',
    'Mid Level',
    'Senior Level',
    'Lead',
    'Manager',
    'Director',
    'Executive',
  ];
  experienceMap: any = {
  'Entry Level': 0,
  'Mid Level': 2,
  'Senior Level': 5,
  'Lead': 7,
  'Manager': 10,
  'Director': 12,
  'Executive': 15,
};
  experienceLabelsByYears: Record<number, string> = Object.entries(this.experienceMap).reduce(
    (labels, [label, years]) => ({ ...labels, [years as number]: label }),
    {} as Record<number, string>,
  );

  private toastr = inject(ToastrService);
  futureDateValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;

  const selectedDate = new Date(control.value);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  selectedDate.setHours(0, 0, 0, 0);

  return selectedDate > today ? null : { invalidFutureDate: true };
}
  constructor(
    private fb: FormBuilder,
    private jobService: JobService,
    private profileService: ProfileService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {
    this.jobForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      category: ['', Validators.required],
      type: ['FULL_TIME', Validators.required],
      location: ['', Validators.required],
      salaryMin: [null, [Validators.required, Validators.min(0)]],
      salaryMax: [null, [Validators.required, Validators.min(0)]],
      experienceRequired: ['', Validators.required],
      skills: this.fb.array([], [Validators.required, Validators.minLength(1)]),
      description: ['', [Validators.required, Validators.minLength(50)]],
      companyName: ['', [Validators.required, Validators.minLength(2)]],

vacancies: [1, [Validators.required, Validators.min(1)]],

isRemote: [false],

expiresAt: ['', [Validators.required, this.futureDateValidator]],
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['edit']) {
        this.isEditMode = true;
        this.editJobId = params['edit'];
        this.loadJobForEdit(params['edit']);
      }
    });
    this.loadRecruiterBrand();
  }

  private loadRecruiterBrand(): void {
    this.profileService.getRecruiterProfile().subscribe({
      next: (profile) => {
        this.recruiterCompanyName = profile.companyName || '';
        this.recruiterLogoUrl = profile.logoUrl || profile.logo || '';

        if (!this.isEditMode && !this.companyName?.value && this.recruiterCompanyName) {
          this.jobForm.patchValue({ companyName: this.recruiterCompanyName });
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      },
    });
  }

  loadJobForEdit(jobId: string): void {
    this.isLoadingJob = true;
    this.jobService.getJobById(jobId).subscribe({
      next: (job) => {
        this.patchFormWithJob(job);
        this.isLoadingJob = false;
      },
      error: () => {
        this.toastr.error('Failed to load job details');
        this.isLoadingJob = false;
      },
    });
  }

  patchFormWithJob(job: Job): void {
   this.jobForm.patchValue({
  title: job.title,
  category: job.category,
  type: job.jobType,
  location: job.location,
  salaryMin: job.salaryMin,
  salaryMax: job.salaryMax,
  experienceRequired: this.getExperienceLabel(job.experienceRequired),
  description: job.description,

  companyName: job.companyName,
  vacancies: job.vacancies,
  isRemote: job.isRemote,
  expiresAt: this.formatDateForInput(job.expiresAt),
});

    // Clear existing form arrays
    this.clearFormArray(this.skills);
    // this.clearFormArray(this.requirements);
    // this.clearFormArray(this.responsibilities);

    // Add values
    job.skills?.forEach((skill) => this.addSkill(skill));
    // job.requirements?.forEach((req) => this.addRequirement(req));
    // job.responsibilities?.forEach((resp) => this.addResponsibility(resp));
  }

  get skills(): FormArray {
    return this.jobForm.get('skills') as FormArray;
  }

  // get requirements(): FormArray {
  //   return this.jobForm.get('requirements') as FormArray;
  // }

  // get responsibilities(): FormArray {
  //   return this.jobForm.get('responsibilities') as FormArray;
  // }

  addSkill(value: string = ''): void {
    if (value) {
      this.skills.push(this.fb.control(value, Validators.required));
    }
  }

  removeSkill(index: number): void {
    this.skills.removeAt(index);
  }

  // addRequirement(value: string = ''): void {
  //   if (value) {
  //     this.requirements.push(this.fb.control(value, Validators.required));
  //   }
  // }

  // removeRequirement(index: number): void {
  //   this.requirements.removeAt(index);
  // }

  // addResponsibility(value: string = ''): void {
  //   if (value) {
  //     this.responsibilities.push(this.fb.control(value, Validators.required));
  //   }
  // }

  // removeResponsibility(index: number): void {
  //   this.responsibilities.removeAt(index);
  // }

  addSkillFromInput(input: HTMLInputElement): void {
    const value = input.value.trim();
    if (value) {
      this.addSkill(value);
      input.value = '';
    }
  }

  // addRequirementFromInput(input: HTMLTextAreaElement): void {
  //   const value = input.value.trim();
  //   if (value) {
  //     this.addRequirement(value);
  //     input.value = '';
  //   }
  // }

  // addResponsibilityFromInput(input: HTMLTextAreaElement): void {
  //   const value = input.value.trim();
  //   if (value) {
  //     this.addResponsibility(value);
  //     input.value = '';
  //   }
  // }

  private clearFormArray(formArray: FormArray): void {
    while (formArray.length !== 0) {
      formArray.removeAt(0);
    }
  }

  onSubmit(): void {
    if (this.jobForm.invalid) {
      Object.keys(this.jobForm.controls).forEach((key) => {
        const control = this.jobForm.get(key);
        control?.markAsTouched();
      });
      this.toastr.error('Please fill in all required fields');
      return;
    }

    if (this.jobForm.value.salaryMin >= this.jobForm.value.salaryMax) {
      this.toastr.error('Minimum salary must be less than maximum salary');
      return;
    }

    this.isSubmitting = true;
    const jobData = this.buildJobPayload();

    const request = this.isEditMode
  ? this.jobService.updateJob(this.editJobId!, jobData)
  : this.jobService.createJob(jobData);

    request.subscribe({
      next: (job) => {
        this.toastr.success(
          this.isEditMode ? 'Job updated successfully' : 'Job posted successfully',
        );
        this.router.navigate(['/recruiter/jobs']);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.toastr.error(
          error?.error?.message || error?.error?.error || 'Failed to save job. Please try again.',
        );
        this.cdr.detectChanges();
      },
    });
  }

  private getExperienceLabel(years: number | null | undefined): string {
    if (years === null || years === undefined) {
      return '';
    }

    if (this.experienceLabelsByYears[years]) {
      return this.experienceLabelsByYears[years];
    }

    const closestYears = Object.values(this.experienceMap)
      .map(Number)
      .reduce((closest, current) =>
        Math.abs(current - years) < Math.abs(closest - years) ? current : closest,
      );

    return this.experienceLabelsByYears[closestYears] || '';
  }

  private formatDateForInput(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return value.split('T')[0];
  }

  private buildJobPayload(): Partial<Job> {
    const formValue = this.jobForm.value;
    return {
      title: formValue.title,
      category: formValue.category || undefined,
      jobType: formValue.type || undefined,
      location: formValue.location || undefined,
      salaryMin: formValue.salaryMin !== null && formValue.salaryMin !== '' ? Number(formValue.salaryMin) : undefined,
      salaryMax: formValue.salaryMax !== null && formValue.salaryMax !== '' ? Number(formValue.salaryMax) : undefined,
      description: formValue.description || undefined,
      skills: Array.isArray(formValue.skills)
        ? formValue.skills
        : formValue.skills?.split(',').map((s: string) => s.trim()),
      experienceRequired: this.experienceMap[formValue.experienceRequired] ?? 0,
      vacancies: formValue.vacancies !== null && formValue.vacancies !== '' ? Number(formValue.vacancies) : undefined,
      companyName: formValue.companyName || undefined,
      isRemote: formValue.isRemote,
      expiresAt: formValue.expiresAt || undefined,
      status: 'ACTIVE',
    };
  }

  get title() {
    return this.jobForm.get('title');
  }
  get category() {
    return this.jobForm.get('category');
  }
  get type() {
    return this.jobForm.get('type');
  }
  get location() {
    return this.jobForm.get('location');
  }
  get salaryMin() {
    return this.jobForm.get('salaryMin');
  }
  get salaryMax() {
    return this.jobForm.get('salaryMax');
  }
  get experienceRequired() {
    return this.jobForm.get('experienceRequired');
  }
  get description() {
    return this.jobForm.get('description');
  }
  get companyName() {
  return this.jobForm.get('companyName');
}

get vacancies() {
  return this.jobForm.get('vacancies');
}

get isRemote() {
  return this.jobForm.get('isRemote');
}

get expiresAt() {
  return this.jobForm.get('expiresAt');
}

get companyInitials(): string {
  const source = this.companyName?.value || this.recruiterCompanyName || 'HC';
  return source
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join('') || 'HC';
}
}

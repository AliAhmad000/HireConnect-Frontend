import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent {
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  hasToken = !!this.route.snapshot.queryParamMap.get('token');
  private toastr = inject(ToastrService);

  form = this.fb.group(
    {
      token: [this.route.snapshot.queryParamMap.get('token') || '', Validators.required],
      newPassword: ['', [Validators.required, this.passwordStrengthValidator]],
      confirmPassword: ['', Validators.required],
    },
    { validators: this.passwordMatchValidator },
  );

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value || '');
    if (!value) return null;

    const hasStrongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value);
    return hasStrongPassword ? null : { passwordStrength: true };
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    return control.get('newPassword')?.value === control.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (!this.hasToken) {
      this.toastr.error('Please use the reset link from your email.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const token = this.form.value.token || '';
    const newPassword = this.form.value.newPassword || '';

    this.authService.resetPassword(token, newPassword)
      .pipe(
        finalize(() => {
          queueMicrotask(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        }),
      )
      .subscribe({
        next: (response) => {
          this.toastr.success(response?.message || 'Password reset successfully');
          this.router.navigate(['/auth/login']);
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Unable to reset password');
        },
      });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  get token() {
    return this.form.get('token');
  }

  get newPassword() {
    return this.form.get('newPassword');
  }

  get confirmPassword() {
    return this.form.get('confirmPassword');
  }
}

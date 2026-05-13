// src/app/features/auth/register/register.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { getGatewayOrigin } from '../../../core/utils/url.util';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  selectedRole: 'CANDIDATE' | 'RECRUITER' = 'CANDIDATE';
  activeLegalPanel: 'terms' | 'privacy' = 'terms';
  private toastr = inject(ToastrService);
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    this.registerForm = this.fb.group(
      {
        fullName: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, this.passwordStrengthValidator]],
        confirmPassword: ['', [Validators.required]],
        role: ['CANDIDATE', Validators.required],
        acceptTerms: [false, Validators.requiredTrue],
      },
      { validator: this.passwordMatchValidator },
    );
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value || '');
    if (!value) return null;

    const hasStrongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value);
    return hasStrongPassword ? null : { passwordStrength: true };
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  selectRole(role: 'CANDIDATE' | 'RECRUITER'): void {
    this.selectedRole = role;
    this.registerForm.patchValue({ role });
  }

  showLegalPanel(panel: 'terms' | 'privacy'): void {
    this.activeLegalPanel = panel;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      Object.keys(this.registerForm.controls).forEach((key) => {
        this.registerForm.get(key)?.markAsTouched();
      });

      return;
    }

    this.isLoading = true;

    const { confirmPassword, acceptTerms, ...registerData } = this.registerForm.value;

    this.authService
      .register(registerData)

      .pipe(
        finalize(() => {
          queueMicrotask(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        }),
      )

      .subscribe({
        next: () => {
          this.toastr.success('Registration successful!', 'Welcome to HireConnect!');

          const user = this.authService.getCurrentUser();

          if (user?.role === 'CANDIDATE') {
            this.router.navigate(['/candidate/profile/setup']);
          } else if (user?.role === 'RECRUITER') {
            this.router.navigate(['/recruiter/dashboard']);
          } else {
            this.router.navigate(['/home']);
          }
        },
        error: (err) => {
          console.error(err);

          this.toastr.error(err?.error?.message || 'Registration failed');
        },
      });
  }
  loginWithGitHub(): void {
    window.location.href = `${getGatewayOrigin()}/oauth2/authorization/github`;
  }
  get fullName() {
    return this.registerForm.get('fullName');
  }
  get email() {
    return this.registerForm.get('email');
  }
  get password() {
    return this.registerForm.get('password');
  }
  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }
  get acceptTerms() {
    return this.registerForm.get('acceptTerms');
  }
}

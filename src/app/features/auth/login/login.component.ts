// src/app/features/auth/login/login.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { ChangeDetectorRef } from '@angular/core';
import { getGatewayOrigin } from '../../../core/utils/url.util';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;
  returnUrl: string = '/home';
  private toastr = inject(ToastrService);
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, this.passwordStrengthValidator]],
      rememberMe: [false],
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
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

  onSubmit(): void {
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach((key) => {
        this.loginForm.get(key)?.markAsTouched();
      });

      return;
    }

    this.isLoading = true;

    this.authService
      .login(this.loginForm.value)

      .subscribe({
        next: (response: any) => {
          console.log('LOGIN RESPONSE', response);

          const user = this.authService.getCurrentUser();

          this.toastr.success('Login successful!', 'Welcome back!');

          if (this.returnUrl && this.returnUrl !== '/home') {
            this.router.navigateByUrl(this.returnUrl);
          } else if (user?.role === 'CANDIDATE') {
            this.router.navigate(['/candidate/dashboard']);
          } else if (user?.role === 'RECRUITER') {
            this.router.navigate(['/recruiter/dashboard']);
          } else if (user?.role === 'ADMIN') {
            this.router.navigate(['/admin/dashboard']);
          } else {
            this.router.navigate([this.returnUrl]);
          }
        },

        error: (err) => {
          console.error(err);

          this.toastr.error(err?.error?.message || 'Login failed');

          queueMicrotask(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        },

        complete: () => {
          queueMicrotask(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        },
      });
  }

  loginWithGitHub(): void {
    window.location.href = `${getGatewayOrigin()}/oauth2/authorization/github`;
  }

  get email() {
    return this.loginForm.get('email');
  }
  get password() {
    return this.loginForm.get('password');
  }
}

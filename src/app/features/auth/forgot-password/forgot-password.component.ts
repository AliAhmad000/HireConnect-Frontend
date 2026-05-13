import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  isLoading = false;
  emailSent = false;
  submittedEmail = '';
  private toastr = inject(ToastrService);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const email = this.form.value.email || '';

    this.authService.forgotPassword(email)
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
          this.submittedEmail = email;
          this.emailSent = true;
          this.toastr.success(response?.message || 'If this email exists, a reset link has been sent.');
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Unable to create reset request');
        },
      });
  }

  tryAgain(): void {
    this.emailSent = false;
    this.form.enable({ emitEvent: false });
    this.cdr.detectChanges();
  }

  get email() {
    return this.form.get('email');
  }
}

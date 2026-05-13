import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-github-callback',
  standalone: true,
  imports: [CommonModule],

  template: `
    <div class="callback-container">

      <div class="callback-content">

        <div class="spinner"></div>

        <h2>Completing Login...</h2>

        <p>Please wait...</p>

        <p class="error-message" *ngIf="error">
          {{ error }}
        </p>

      </div>

    </div>
  `,

  styles: [`
    .callback-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f7fa;
    }

    .callback-content {
      background: white;
      padding: 3rem;
      border-radius: 16px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #ddd;
      border-top-color: #667eea;
      border-radius: 50%;
      margin: 0 auto 1rem;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .error-message {
      color: red;
      margin-top: 1rem;
    }
  `]
})
export class GithubCallbackComponent implements OnInit {

  error: string | null = null;

  private toastr = inject(ToastrService);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
     private authService: AuthService
  ) {}

  ngOnInit(): void {

  const authData = {

    accessToken:
      this.route.snapshot.queryParamMap.get('accessToken'),

    refreshToken:
      this.route.snapshot.queryParamMap.get('refreshToken'),

    userId:
      this.route.snapshot.queryParamMap.get('userId'),

    email:
      this.route.snapshot.queryParamMap.get('email'),

    fullName:
      this.route.snapshot.queryParamMap.get('fullName'),

    role:
      this.route.snapshot.queryParamMap.get('role'),

    provider:
      this.route.snapshot.queryParamMap.get('provider')
  };

  if (!authData.accessToken) {

    this.error = 'GitHub authentication failed';

    setTimeout(() => {
      this.router.navigate(['/auth/login']);
    }, 3000);

    return;
  }

  // Store + update auth state
  this.authService.handleOAuthLogin(authData);

  this.toastr.success(
    'Successfully logged in with GitHub!',
    'Welcome!'
  );

  // Redirect by role
  if (authData.role === 'RECRUITER') {

    this.router.navigate(['/recruiter/dashboard']);

  } else {

    this.router.navigate(['/candidate/dashboard']);
  }
}
}
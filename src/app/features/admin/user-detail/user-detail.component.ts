import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AdminService, AdminUser } from '../../../core/services/admin.service';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="detail-container">
      <a routerLink="/admin/users" class="back-link">Back to Users</a>
      <div class="loading-state" *ngIf="isLoading">Loading user...</div>
      <div class="empty-state" *ngIf="!isLoading && !user">User not found.</div>

      <section class="detail-card" *ngIf="!isLoading && user">
        <div class="header-row">
          <div>
            <h1>{{ user.name }}</h1>
            <p>{{ user.email }}</p>
          </div>
          <span class="status-badge" [class]="user.status.toLowerCase()">{{ user.status }}</span>
        </div>

        <div class="info-grid">
          <div><span>Role</span><strong>{{ user.role }}</strong></div>
          <div><span>Provider</span><strong>{{ user.provider || 'LOCAL' }}</strong></div>
          <div><span>Joined</span><strong>{{ user.joinedAt | date:'medium' }}</strong></div>
          <div><span>Last Login</span><strong>{{ user.lastLogin ? (user.lastLogin | date:'medium') : 'Never' }}</strong></div>
        </div>

        <div class="actions">
          <button *ngIf="user.status === 'ACTIVE'" type="button" (click)="setActive(false)">Suspend User</button>
          <button *ngIf="user.status === 'SUSPENDED'" type="button" (click)="setActive(true)">Activate User</button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .detail-container { max-width: 900px; margin: 0 auto; padding: 2rem; }
    .back-link { color: #4f46e5; text-decoration: none; font-weight: 700; }
    .detail-card { margin-top: 1.5rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; }
    .header-row { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; border-bottom: 1px solid #f3f4f6; padding-bottom: 1rem; }
    h1 { margin: 0 0 .35rem; color: #111827; } p { margin: 0; color: #6b7280; }
    .info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin-top: 1.5rem; }
    .info-grid div { background: #f9fafb; border-radius: 8px; padding: 1rem; }
    span { display: block; color: #6b7280; font-size: .85rem; margin-bottom: .35rem; }
    .status-badge { padding: .35rem .75rem; border-radius: 999px; font-weight: 700; }
    .active { background: #dcfce7; color: #166534; } .suspended { background: #fee2e2; color: #991b1b; }
    .actions { margin-top: 1.5rem; display: flex; justify-content: flex-end; }
    button { border: 0; border-radius: 8px; background: #4f46e5; color: #fff; padding: .75rem 1rem; cursor: pointer; }
    .loading-state, .empty-state { padding: 2rem; color: #6b7280; text-align: center; }
  `],
})
export class UserDetailComponent implements OnInit {
  userId = '';
  user: AdminUser | null = null;
  isLoading = true;
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);

  constructor(private route: ActivatedRoute, private adminService: AdminService) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id') || '';
    this.loadUser();
  }

  loadUser(): void {
    this.isLoading = true;
    this.adminService.getUser(this.userId).subscribe({
      next: (user) => {
        this.user = user;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.user = null;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  setActive(active: boolean): void {
    this.adminService.setUserActive(this.userId, active).subscribe({
      next: (user) => {
        this.user = user;
        this.toastr.success(active ? 'User activated' : 'User suspended');
        this.cdr.detectChanges();
      },
    });
  }
}

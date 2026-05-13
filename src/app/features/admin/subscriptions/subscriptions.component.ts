import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { Invoice, Subscription } from '../../../core/models/subscription.model';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div>
          <h1>Subscription Management</h1>
          <p>Search a recruiter to view active subscription and invoice history.</p>
        </div>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <span class="material-symbols-rounded">search</span>
          <input type="text" [(ngModel)]="recruiterId" placeholder="Recruiter ID">
        </div>
        <button type="button" class="btn-primary" (click)="loadSubscription()">
          <span class="material-symbols-rounded">manage_search</span>
          Search
        </button>
      </div>

      <div class="loading-state" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Loading subscription...</p>
      </div>

      <div class="empty-state" *ngIf="!isLoading && searched && !subscription && invoices.length === 0">
        <span class="material-symbols-rounded">receipt_long</span>
        <p>No subscription or invoices found for this recruiter.</p>
      </div>

      <section class="card" *ngIf="subscription">
        <div class="section-header">
          <h2>Active Subscription</h2>
          <span class="status-pill">{{ subscription.status }}</span>
        </div>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-icon plan"><span class="material-symbols-rounded">workspace_premium</span></div>
            <div><span>Plan</span><strong>{{ subscription.plan }}</strong></div>
          </div>
          <div class="summary-card">
            <div class="summary-icon status"><span class="material-symbols-rounded">verified</span></div>
            <div><span>Status</span><strong>{{ subscription.status }}</strong></div>
          </div>
          <div class="summary-card">
            <div class="summary-icon amount"><span class="material-symbols-rounded">payments</span></div>
            <div><span>Amount Paid</span><strong>{{ subscription.amountPaid || 0 | currency:'INR':'symbol':'1.0-0' }}</strong></div>
          </div>
          <div class="summary-card">
            <div class="summary-icon date"><span class="material-symbols-rounded">event</span></div>
            <div><span>Ends</span><strong>{{ subscription.endDate | date:'mediumDate' }}</strong></div>
          </div>
        </div>
      </section>

      <section class="card" *ngIf="invoices.length > 0">
        <div class="section-header">
          <h2>Invoices</h2>
          <span>{{ invoices.length }} records</span>
        </div>
        <div class="table-responsive">
          <table>
            <thead><tr><th>Invoice</th><th>Plan</th><th>Amount</th><th>Date</th><th>Transaction</th></tr></thead>
            <tbody>
              <tr *ngFor="let invoice of invoices">
                <td><strong>#{{ invoice.invoiceId }}</strong></td>
                <td><span class="type-badge">{{ invoice.planName || '-' }}</span></td>
                <td>{{ (invoice.totalAmount || invoice.amount || 0) | currency:'INR':'symbol':'1.0-0' }}</td>
                <td>{{ invoice.paymentDate | date:'medium' }}</td>
                <td>{{ invoice.transactionId || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .admin-page { max-width: 1280px; margin: 0 auto; padding: 32px 24px; color: #172033; }
    .page-header { margin-bottom: 1.5rem; }
    h1 { margin: 0 0 .35rem; color: #111827; font-size: clamp(1.875rem,3vw,2.25rem); line-height: 1.15; }
    p { margin: 0; color: #667085; }
    .toolbar { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; padding: 16px; border: 1px solid #e5e9f2; border-radius: 8px; background: #fff; box-shadow: 0 8px 24px rgba(15,23,42,.06); }
    .search-box { position: relative; flex: 1; min-width: 280px; }
    .search-box .material-symbols-rounded { position: absolute; left: 12px; top: 50%; color: #98a2b3; transform: translateY(-50%); }
    input { width: 100%; border: 1px solid #d0d5dd; border-radius: 8px; padding: .75rem 1rem .75rem 42px; font: inherit; }
    .btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid #2563eb; border-radius: 8px; background: #2563eb; color: #fff; padding: .75rem 1rem; cursor: pointer; font-weight: 700; }
    .card { background: #fff; border: 1px solid #e5e9f2; border-radius: 8px; padding: 20px; margin-top: 1rem; box-shadow: 0 8px 24px rgba(15,23,42,.06); }
    .section-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    h2 { margin: 0; color: #111827; font-size: 1.125rem; }
    .section-header span { color: #667085; font-size: .875rem; }
    .summary-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 20px; }
    .summary-card { display: flex; align-items: center; gap: 14px; min-height: 112px; padding: 20px; border: 1px solid #e5e9f2; border-radius: 8px; background: #fff; }
    .summary-card span { display: block; color: #667085; font-size: .875rem; font-weight: 700; }
    .summary-card strong { display: block; margin-top: 2px; color: #111827; font-size: 1.35rem; line-height: 1.1; }
    .summary-icon { display: inline-flex; width: 48px; height: 48px; align-items: center; justify-content: center; border-radius: 8px; }
    .plan { background: #eef2ff; color: #4f46e5; } .status { background: #ecfdf3; color: #16a34a; } .amount { background: #f0fdf4; color: #15803d; } .date { background: #eff6ff; color: #2563eb; }
    .status-pill, .type-badge { display: inline-flex; align-items: center; border-radius: 999px; padding: .25rem .65rem; background: #ecfdf3; color: #166534; font-weight: 700; font-size: .8rem; }
    .table-responsive { overflow-x: auto; }
    table { width: 100%; min-width: 850px; border-collapse: collapse; } th, td { padding: 1rem; border-bottom: 1px solid #f3f4f6; text-align: left; color: #344054; }
    th { background: #f9fafb; color: #667085; font-size: .75rem; text-transform: uppercase; letter-spacing: 0; }
    .loading-state, .empty-state { padding: 2rem; text-align: center; color: #6b7280; }
    .empty-state .material-symbols-rounded { display: block; color: #98a2b3; font-size: 2rem; margin-bottom: .5rem; }
    .spinner { width: 40px; height: 40px; border: 3px solid #e0e0e0; border-top-color: #2563eb; border-radius: 50%; margin: 0 auto 1rem; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 1024px) { .summary-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
    @media (max-width: 768px) { .admin-page { padding: 24px 16px; } .summary-grid { grid-template-columns: 1fr; } .search-box, .btn-primary { width: 100%; min-width: 0; } }
  `],
})
export class SubscriptionsComponent {
  recruiterId = '';
  subscription: Subscription | null = null;
  invoices: Invoice[] = [];
  isLoading = false;
  searched = false;

  constructor(private subscriptionService: SubscriptionService, private cdr: ChangeDetectorRef) {}

  loadSubscription(): void {
    if (!this.recruiterId.trim()) return;
    this.isLoading = true;
    this.searched = true;
    this.subscription = null;
    this.invoices = [];

    this.subscriptionService.getActiveSubscriptionByRecruiter(this.recruiterId.trim()).subscribe({
      next: (subscription) => {
        this.subscription = subscription;
        this.loadInvoices();
      },
      error: () => {
        this.isLoading = false;
        this.loadInvoices();
      },
    });
  }

  private loadInvoices(): void {
    this.subscriptionService.getInvoicesByRecruiter(this.recruiterId.trim()).subscribe({
      next: (invoices) => {
        this.invoices = invoices;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.invoices = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }
}

import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../environments/environment';
import { Invoice, PaymentMode, Subscription, SubscriptionPlan, SubscriptionPlanInfo } from '../../../core/models/subscription.model';
import { SubscriptionService } from '../../../core/services/subscription.service';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.scss']
})
export class SubscriptionComponent implements OnInit {
  currentSubscription: Subscription | null = null;
  invoices: Invoice[] = [];
  plans: SubscriptionPlanInfo[] = [];
  selectedPaymentMode: PaymentMode = 'UPI';
  isLoading = true;
  isProcessing = false;
  processingPlan: SubscriptionPlan | null = null;

  paymentModes: Array<{ value: PaymentMode; label: string; hint: string }> = [
    { value: 'UPI', label: 'UPI', hint: 'Pay using any UPI app' },
    { value: 'CREDIT_CARD', label: 'Credit Card', hint: 'Razorpay secure card checkout' },
    { value: 'DEBIT_CARD', label: 'Debit Card', hint: 'Razorpay secure card checkout' },
    { value: 'WALLET', label: 'Wallet', hint: 'Use wallet balance' },
  ];

  private toastr = inject(ToastrService);

  constructor(
    private subscriptionService: SubscriptionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    forkJoin({
      subscription: this.subscriptionService.getCurrentSubscription().pipe(catchError(() => of(null))),
      invoices: this.subscriptionService.getInvoices().pipe(catchError(() => of([] as Invoice[]))),
      plans: this.subscriptionService.getPlans().pipe(catchError(() => of(this.fallbackPlans()))),
    }).subscribe(({ subscription, invoices, plans }) => {
      this.currentSubscription = subscription;
      this.invoices = invoices;
      this.plans = plans;
      this.isLoading = false;
      this.cdr.markForCheck();
    });
  }

  subscribe(plan: SubscriptionPlan): void {
    if (plan === 'FREE' || this.selectedPaymentMode === 'WALLET') {
      this.activateDirectly(plan, this.selectedPaymentMode);
      return;
    }

    this.isProcessing = true;
    this.processingPlan = plan;
    this.subscriptionService.createRazorpayOrder(plan)
      .pipe(finalize(() => {
        this.isProcessing = false;
        this.processingPlan = null;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (order) => this.openRazorpayCheckout(order),
        error: (error) => this.toastr.error(error?.error?.message || 'Unable to start Razorpay payment'),
      });
  }

  cancelSubscription(): void {
    if (!confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    this.subscriptionService.cancelSubscription().subscribe({
      next: () => {
        this.toastr.success('Subscription cancelled successfully');
        this.loadData();
      },
      error: (error) => this.toastr.error(error?.error?.message || 'Failed to cancel subscription'),
    });
  }

  isCurrentPlan(plan: SubscriptionPlan): boolean {
    return this.currentSubscription?.plan === plan && this.currentSubscription?.status === 'ACTIVE';
  }

  getPlanAction(plan: SubscriptionPlan): string {
    if (this.isCurrentPlan(plan)) {
      return 'Current Plan';
    }
    if (this.processingPlan === plan) {
      return 'Processing...';
    }
    return plan === 'FREE' ? 'Switch to Free' : 'Subscribe';
  }

  displayAmount(invoice: Invoice): number {
    return invoice.totalAmount ?? invoice.amount;
  }

  private activateDirectly(plan: SubscriptionPlan, paymentMode: PaymentMode): void {
    this.isProcessing = true;
    this.processingPlan = plan;
    const walletToken = paymentMode === 'WALLET' ? `WALLET-${Date.now()}` : undefined;
    this.subscriptionService.subscribe(plan, paymentMode, walletToken)
      .pipe(finalize(() => {
        this.isProcessing = false;
        this.processingPlan = null;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.toastr.success(`${plan} plan activated`);
          this.loadData();
        },
        error: (error) => this.toastr.error(error?.error?.message || 'Subscription failed'),
      });
  }

  private openRazorpayCheckout(order: any): void {
    this.loadRazorpayScript().then(() => {
      if (!window.Razorpay) {
        this.toastr.error('Razorpay checkout failed to load');
        return;
      }

      const checkout = new window.Razorpay({
        key: order.keyId || environment.razorpayKeyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'HireConnect',
        description: `${order.plan} recruiter subscription`,
        order_id: order.orderId,
        handler: (response: any) => {
          this.verifyPayment(order.plan, response);
        },
        prefill: {},
        theme: { color: '#2563eb' },
        modal: {
          ondismiss: () => this.toastr.info('Payment cancelled'),
        },
      });

      checkout.open();
    }).catch(() => this.toastr.error('Could not load Razorpay checkout'));
  }

  private verifyPayment(plan: SubscriptionPlan, response: any): void {
    this.isProcessing = true;
    this.processingPlan = plan;
    this.subscriptionService.verifyRazorpayPayment({
      plan,
      paymentMode: this.selectedPaymentMode,
      razorpayOrderId: response.razorpay_order_id,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpaySignature: response.razorpay_signature,
    }).pipe(finalize(() => {
      this.isProcessing = false;
      this.processingPlan = null;
      this.cdr.markForCheck();
    })).subscribe({
      next: () => {
        this.toastr.success('Payment verified and subscription activated');
        this.loadData();
      },
      error: (error) => this.toastr.error(error?.error?.message || 'Payment verification failed'),
    });
  }

  private loadRazorpayScript(): Promise<void> {
    if (window.Razorpay) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existing = document.getElementById('razorpay-checkout-js');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject());
        return;
      }

      const script = document.createElement('script');
      script.id = 'razorpay-checkout-js';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.body.appendChild(script);
    });
  }

  private fallbackPlans(): SubscriptionPlanInfo[] {
    return [
      {
        plan: 'FREE',
        name: 'Free',
        price: 0,
        gstAmount: 0,
        totalAmount: 0,
        maxJobPosts: 3,
        features: ['3 job posts', 'Basic candidate management', 'Standard notifications'],
      },
      {
        plan: 'PROFESSIONAL',
        name: 'Professional',
        price: 1999,
        gstAmount: 359.82,
        totalAmount: 2358.82,
        maxJobPosts: 50,
        durationDays: 30,
        features: ['50 job posts', 'Recruiter analytics', 'Shortlisted candidate messaging', 'Invoice history'],
      },
      {
        plan: 'ENTERPRISE',
        name: 'Enterprise',
        price: 4999,
        gstAmount: 899.82,
        totalAmount: 5898.82,
        maxJobPosts: 999,
        durationDays: 30,
        features: ['999 job posts', 'Advanced analytics', 'Priority support', 'Full billing dashboard'],
      },
    ];
  }
}

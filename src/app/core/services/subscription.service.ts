import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Invoice,
  PaymentMode,
  RazorpayOrder,
  Subscription,
  SubscriptionPlan,
  SubscriptionPlanInfo,
} from '../models/subscription.model';

interface ApiResponse<T> {
  data: T;
}

interface PageResponse<T> {
  content?: T[];
}

export interface RazorpayVerifyPayload {
  plan: SubscriptionPlan;
  paymentMode: PaymentMode;
  autoRenew?: boolean;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private readonly API_URL = `${environment.apiUrl}/subscriptions`;

  constructor(private http: HttpClient) {}

  getCurrentSubscription(): Observable<Subscription> {
    return this.http.get<ApiResponse<Subscription>>(`${this.API_URL}/active`).pipe(map((response) => response.data));
  }

  getInvoices(): Observable<Invoice[]> {
    return this.http
      .get<ApiResponse<PageResponse<Invoice> | Invoice[]>>(`${this.API_URL}/invoices`)
      .pipe(map((response) => Array.isArray(response.data) ? response.data : response.data?.content || []));
  }

  getActiveSubscriptionByRecruiter(recruiterId: string): Observable<Subscription> {
    return this.http
      .get<ApiResponse<Subscription>>(`${this.API_URL}/recruiter/${recruiterId}/active`)
      .pipe(map((response) => response.data));
  }

  getInvoicesByRecruiter(recruiterId: string): Observable<Invoice[]> {
    return this.http
      .get<ApiResponse<Invoice[]>>(`${this.API_URL}/recruiter/${recruiterId}/invoices`)
      .pipe(map((response) => response.data || []));
  }

  subscribe(plan: SubscriptionPlan, paymentMode: PaymentMode, paymentToken?: string): Observable<Subscription> {
    return this.http
      .post<ApiResponse<Subscription>>(this.API_URL, { plan, paymentMode, paymentToken })
      .pipe(map((response) => response.data));
  }

  createRazorpayOrder(plan: SubscriptionPlan): Observable<RazorpayOrder> {
    return this.http
      .post<ApiResponse<RazorpayOrder>>(`${this.API_URL}/payments/razorpay/order`, { plan })
      .pipe(map((response) => response.data));
  }

  verifyRazorpayPayment(payload: RazorpayVerifyPayload): Observable<Subscription> {
    return this.http
      .post<ApiResponse<Subscription>>(`${this.API_URL}/payments/razorpay/verify`, payload)
      .pipe(map((response) => response.data));
  }

  cancelSubscription(): Observable<Subscription> {
    return this.http
      .delete<ApiResponse<Subscription>>(`${this.API_URL}/cancel`)
      .pipe(map((response) => response.data));
  }

  renewSubscription(plan: SubscriptionPlan, paymentMode: PaymentMode): Observable<Subscription> {
    return this.http
      .put<ApiResponse<Subscription>>(`${this.API_URL}/renew`, { plan, paymentMode })
      .pipe(map((response) => response.data));
  }

  getPlans(): Observable<SubscriptionPlanInfo[]> {
    return this.http
      .get<ApiResponse<SubscriptionPlanInfo[]>>(`${this.API_URL}/plans`)
      .pipe(map((response) => response.data || []));
  }
}

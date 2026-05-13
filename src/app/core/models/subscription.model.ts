export type SubscriptionPlan = 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE';
export type PaymentMode = 'WALLET' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'UPI' | 'NET_BANKING';

export interface Subscription {
  subscriptionId: string;
  recruiterId: string;
  plan: SubscriptionPlan;
  startDate: string;
  endDate?: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  amountPaid: number;
  maxJobPosts?: number;
  autoRenew?: boolean;
  isActive?: boolean;
  features?: string[];
}

export interface Invoice {
  invoiceId: string;
  subscriptionId: string;
  recruiterId?: string;
  amount: number;
  gstAmount?: number;
  totalAmount?: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  transactionId: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  invoiceNumber?: string;
  planName?: string;
  status?: 'PAID' | 'PENDING' | 'FAILED';
}

export interface SubscriptionPlanInfo {
  plan: SubscriptionPlan;
  name: string;
  price: number;
  gstAmount: number;
  totalAmount: number;
  maxJobPosts: number;
  durationDays?: number;
  features: string[];
}

export interface RazorpayOrder {
  keyId: string;
  orderId: string;
  currency: string;
  amount: number;
  amountRupees: number;
  gstAmount: number;
  totalAmount: number;
  plan: SubscriptionPlan;
  receipt: string;
}

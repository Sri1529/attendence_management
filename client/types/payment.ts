import { SubscriptionPlan, Subscription } from "./subscription";

export enum PaymentTransactionStatus {
  CREATED = "CREATED",
  AUTHORIZED = "AUTHORIZED",
  CAPTURED = "CAPTURED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export enum BillingInterval {
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

export interface PaymentTransaction {
  id: string;
  company_id: string;
  subscription_id?: string | null;
  subscription?: Subscription | null;
  plan_id: string;
  plan?: SubscriptionPlan;
  user_id?: string | null;
  razorpay_order_id: string;
  razorpay_payment_id?: string | null;
  razorpay_signature?: string | null;
  amount: string;
  currency: string;
  billing_interval: BillingInterval;
  status: PaymentTransactionStatus;
  payment_method?: string | null;
  failure_reason?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentOrderResponse {
  orderId: string;
  amount: number;
  displayAmount: string;
  currency: string;
  keyId: string;
}

export interface PaymentHistoryResponse {
  data: PaymentTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  prefill?: {
    name?: string;
    email?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

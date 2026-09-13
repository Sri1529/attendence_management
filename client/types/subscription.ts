export enum SubscriptionStatus {
  TRIAL = "TRIAL",
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
}

export enum PlanStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export enum BillingInterval {
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  billing_interval?: BillingInterval;
  price?: string;
  currency?: string;
  max_employees?: number;
  max_users?: number;
  features?: string[] | null;
  display_order?: number;
  price_monthly: string;
  price_yearly: string;
  trial_days: number;
  status: PlanStatus;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string | null;
  company_id: string;
  plan_id?: string;
  plan?: SubscriptionPlan | null;
  status: SubscriptionStatus;
  rawStatus?: SubscriptionStatus;
  trialStartAt?: string | null;
  trialEndAt?: string | null;
  startedAt?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelledAt?: string | null;
  trial_start_at?: string | null;
  trial_end_at?: string | null;
  started_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancelled_at?: string | null;
  accessAllowed?: boolean;
  daysRemaining?: number;
  maxEmployees?: number;
  maxUsers?: number;
  activeEmployeeCount?: number;
  activeUserCount?: number;
  employeeUsagePercentage?: number;
  userUsagePercentage?: number;
  isTrialActive?: boolean;
  isExpired?: boolean;
  availableActions?: string[];
  created_at?: string;
  updated_at?: string;
}

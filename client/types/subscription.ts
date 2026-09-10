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

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  price_monthly: string;
  price_yearly: string;
  trial_days: number;
  status: PlanStatus;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  plan?: SubscriptionPlan;
  status: SubscriptionStatus;
  trial_start_at?: string | null;
  trial_end_at?: string | null;
  started_at: string;
  current_period_start: string;
  current_period_end: string;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
}

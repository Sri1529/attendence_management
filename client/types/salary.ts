export interface SalaryHistory {
  id: string;
  company_id: string;
  employee_id: string;
  basic_salary: string;
  effective_from: string;
  effective_to?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export enum AdjustmentType {
  OVERTIME = "OVERTIME",
  BONUS = "BONUS",
  INCENTIVE = "INCENTIVE",
  OTHER_EARNING = "OTHER_EARNING",
  OTHER_DEDUCTION = "OTHER_DEDUCTION",
}

export enum AdjustmentStatus {
  ACTIVE = "ACTIVE",
  CANCELLED = "CANCELLED",
}

export interface SalaryAdjustment {
  id: string;
  company_id: string;
  employee_id: string;
  adjustment_type: AdjustmentType;
  amount: string;
  adjustment_date: string;
  description?: string | null;
  status: AdjustmentStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export enum PayrollPeriodStatus {
  DRAFT = "DRAFT",
  FINALIZED = "FINALIZED",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
  CORRECTION_REQUIRED = "CORRECTION_REQUIRED",
}

export interface PayrollPeriod {
  id: string;
  company_id: string;
  period_year: number;
  period_month: number;
  start_date: string;
  end_date: string;
  status: PayrollPeriodStatus;
  created_by?: string | null;
  finalized_at?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export enum PayrollRecordStatus {
  DRAFT = "DRAFT",
  FINALIZED = "FINALIZED",
  PAID = "PAID",
}

export interface PayrollRecord {
  id: string;
  company_id: string;
  payroll_period_id: string;
  payroll_period?: PayrollPeriod;
  employee_id: string;
  employee?: {
    id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
    department?: { name: string } | null;
    designation?: { name: string } | null;
  };
  basic_salary: string;
  working_days: number;
  present_days: number;
  absent_days: number;
  half_days: number;
  leave_days: number;
  paid_leave_days?: number;
  unpaid_leave_days?: number;
  holiday_days: number;
  overtime_amount: string;
  bonus_amount: string;
  incentive_amount: string;
  other_earnings: string;
  absence_deduction: string;
  unpaid_leave_deduction?: string;
  absence_deduction_mode?: "AUTOMATIC" | "MANUAL";
  other_deductions: string;
  advance_deduction: string;
  loan_deduction?: string;
  gross_salary: string;
  total_deductions: string;
  net_salary: string;
  calculated_at: string;
  finalized_at?: string | null;
  status: PayrollRecordStatus;
  created_at: string;
  updated_at: string;
}

export enum PayrollCorrectionType {
  ABSENCE_DEDUCTION_REVERSAL = "ABSENCE_DEDUCTION_REVERSAL",
  ABSENCE_DEDUCTION_ADJUSTMENT = "ABSENCE_DEDUCTION_ADJUSTMENT",
  PAID_LEAVE_ADJUSTMENT = "PAID_LEAVE_ADJUSTMENT",
  UNPAID_LEAVE_ADJUSTMENT = "UNPAID_LEAVE_ADJUSTMENT",
  SALARY_ADJUSTMENT = "SALARY_ADJUSTMENT",
  ADVANCE_ADJUSTMENT = "ADVANCE_ADJUSTMENT",
  OTHER = "OTHER",
}

export enum PayrollCorrectionStatus {
  PENDING = "PENDING",
  APPLIED = "APPLIED",
  REVERSED = "REVERSED",
}

export interface PayrollCorrection {
  id: string;
  company_id: string;
  payroll_record_id: string;
  payroll_record?: PayrollRecord;
  employee_id: string;
  employee?: {
    id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
  };
  correction_type: PayrollCorrectionType;
  amount: string;
  reason: string;
  status: PayrollCorrectionStatus;
  created_by?: string | null;
  created_by_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  approved_by?: string | null;
  applied_at?: string | null;
  reversed_at?: string | null;
  reversal_correction_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollRecordCorrectionsBreakdown {
  record: PayrollRecord;
  corrections: PayrollCorrection[];
  originalNetPay: string;
  totalCorrectionsAmount: string;
  adjustedNetPay: string;
}

export interface CreatePayrollCorrectionPayload {
  type: PayrollCorrectionType;
  amount: string;
  reason: string;
}

export interface ReversePayrollCorrectionPayload {
  reason: string;
}

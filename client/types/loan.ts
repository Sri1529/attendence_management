import { Employee } from "./organization";

export enum LoanStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface EmployeeLoan {
  id: string;
  company_id: string;
  employee_id: string;
  employee?: Employee | null;
  loan_number: string;
  principal_amount: string;
  outstanding_amount: string;
  loan_date: string;
  start_repayment_date?: string | null;
  status: LoanStatus;
  reason?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanRepayment {
  id: string;
  company_id: string;
  loan_id: string;
  employee_id: string;
  payroll_record_id?: string | null;
  payroll_record?: {
    id: string;
    payroll_period?: {
      id: string;
      period_year: number;
      period_month: number;
      start_date: string;
      end_date: string;
    } | null;
  } | null;
  repayment_amount: string;
  repayment_date: string;
  previous_outstanding_amount: string;
  remaining_outstanding_amount: string;
  notes?: string | null;
  created_at: string;
}

export interface CreateLoanPayload {
  employeeId: string;
  principalAmount: string;
  loanDate: string;
  startRepaymentDate?: string;
  reason?: string;
  notes?: string;
}

export interface LoanQuery {
  page?: number;
  limit?: number;
  employeeId?: string;
  status?: LoanStatus;
  search?: string;
}

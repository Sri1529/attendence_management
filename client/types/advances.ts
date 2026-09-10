export enum AdvanceStatus {
  ACTIVE = "ACTIVE",
  SETTLED = "SETTLED",
  CANCELLED = "CANCELLED",
}

export interface EmployeeAdvance {
  id: string;
  company_id: string;
  employee_id: string;
  employee?: {
    id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
  } | null;
  advance_number: string;
  amount: string;
  advance_date: string;
  reason?: string | null;
  status: AdvanceStatus;
  notes?: string | null;
  outstandingBalance?: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdvanceRepayment {
  id: string;
  company_id: string;
  advance_id: string;
  amount: string;
  repayment_date: string;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

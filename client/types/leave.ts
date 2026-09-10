export enum LeaveTypeStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export interface LeaveType {
  id: string;
  company_id: string;
  name: string;
  description?: string | null;
  status: LeaveTypeStatus;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

export enum LeaveStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export interface LeaveRecord {
  id: string;
  company_id: string;
  employee_id: string;
  employee?: {
    id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
    department?: { name: string } | null;
    designation?: { name: string } | null;
  } | null;
  leave_type_id: string;
  leave_type?: LeaveType | null;
  start_date: string;
  end_date: string;
  status: LeaveStatus;
  remarks?: string | null;
  is_paid?: boolean | null;
  isPayrollLocked?: boolean;
  payrollLockStatus?: "FINALIZED" | "PAID" | null;
  payrollLockMessage?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

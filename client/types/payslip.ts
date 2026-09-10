import { PayrollRecord } from "./payroll";

export interface Payslip {
  id: string;
  company_id: string;
  company?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    currency?: string;
  };
  payroll_record_id: string;
  payroll_record?: PayrollRecord;
  employee_id: string;
  employee?: {
    id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
    joining_date?: string;
    department?: { name: string } | null;
    designation?: { name: string } | null;
  };
  payslip_number: string;
  issued_at: string;
  created_at: string;
  updated_at: string;
}

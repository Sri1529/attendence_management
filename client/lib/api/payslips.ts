import { api } from "./client";
import { Payslip } from "@/types/payslip";
import { PayrollRecord } from "@/types/payroll";
import { PaginatedResponse } from "@/types/organization";

export interface PayslipQuery {
  page?: number;
  limit?: number;
}

export const payslipsApi = {
  createPayslip: (payrollRecordId: string) =>
    api.post<Payslip>(`/payroll/records/${payrollRecordId}/payslip`, {}),

  getByPayrollRecord: (payrollRecordId: string) =>
    api.get<Payslip>(`/payroll/records/${payrollRecordId}/payslip`),

  get: (id: string) => api.get<Payslip>(`/payslips/${id}`),

  downloadPdf: (id: string) => api.getBlob(`/payslips/${id}/pdf`),

  listByEmployee: (employeeId: string, query: PayslipQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.append("page", query.page.toString());
    if (query.limit) params.append("limit", query.limit.toString());
    const queryString = params.toString();
    return api.get<PaginatedResponse<Payslip>>(
      `/employees/${employeeId}/payslips${queryString ? `?${queryString}` : ""}`
    );
  },

  getPayrollHistory: (employeeId: string, query: PayslipQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.append("page", query.page.toString());
    if (query.limit) params.append("limit", query.limit.toString());
    const queryString = params.toString();
    return api.get<PaginatedResponse<PayrollRecord>>(
      `/employees/${employeeId}/payroll-history${queryString ? `?${queryString}` : ""}`
    );
  },
};

import { api } from "./client";
import {
  PayrollPeriod,
  PayrollPeriodStatus,
  PayrollRecord,
  PayrollRecordStatus,
  PayrollCorrection,
  PayrollRecordCorrectionsBreakdown,
  CreatePayrollCorrectionPayload,
  ReversePayrollCorrectionPayload,
} from "@/types/payroll";
import { PaginatedResponse } from "@/types/organization";

export interface PayrollPeriodQuery {
  page?: number;
  limit?: number;
  status?: PayrollPeriodStatus;
}

export interface PayrollRecordQuery {
  page?: number;
  limit?: number;
  employeeId?: string;
  status?: PayrollRecordStatus;
}

export interface CreatePayrollPeriodPayload {
  periodYear: number;
  periodMonth: number;
}

export interface AdvanceDeductionInput {
  advanceId: string;
  amount: string;
}

export interface LoanDeductionInput {
  loanId: string;
  amount: string;
}

export interface ManualAbsenceDeductionInput {
  employeeId: string;
  amount: string;
}

export interface GeneratePayrollPayload {
  advanceDeductions?: AdvanceDeductionInput[];
  loanDeductions?: LoanDeductionInput[];
  manualAbsenceDeductions?: ManualAbsenceDeductionInput[];
}

export const payrollApi = {
  listPeriods: (query: PayrollPeriodQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.append("page", query.page.toString());
    if (query.limit) params.append("limit", query.limit.toString());
    if (query.status) params.append("status", query.status);
    const queryString = params.toString();
    return api.get<PaginatedResponse<PayrollPeriod>>(
      `/payroll/periods${queryString ? `?${queryString}` : ""}`
    );
  },

  getPeriod: (id: string) => api.get<PayrollPeriod>(`/payroll/periods/${id}`),

  createPeriod: (payload: CreatePayrollPeriodPayload) =>
    api.post<PayrollPeriod>("/payroll/periods", payload),

  generatePayroll: (id: string, payload: GeneratePayrollPayload = {}) =>
    api.post<PayrollPeriod>(`/payroll/periods/${id}/generate`, payload),

  finalizePayroll: (id: string) =>
    api.post<PayrollPeriod>(`/payroll/periods/${id}/finalize`, {}),

  markPaid: (id: string) =>
    api.post<PayrollPeriod>(`/payroll/periods/${id}/paid`, {}),

  reopenPeriodForCorrection: (id: string, reason: string) =>
    api.post<PayrollPeriod>(`/payroll/periods/${id}/reopen-for-correction`, { reason }),

  cancelPeriod: (id: string) =>
    api.post<PayrollPeriod>(`/payroll/periods/${id}/cancel`, {}),

  listRecords: (periodId: string, query: PayrollRecordQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.append("page", query.page.toString());
    if (query.limit) params.append("limit", query.limit.toString());
    if (query.employeeId) params.append("employeeId", query.employeeId);
    if (query.status) params.append("status", query.status);
    const queryString = params.toString();
    return api.get<PaginatedResponse<PayrollRecord>>(
      `/payroll/periods/${periodId}/records${queryString ? `?${queryString}` : ""}`
    );
  },

  getRecord: (id: string) => api.get<PayrollRecord>(`/payroll/records/${id}`),

  payRecord: (
    id: string,
    payload: {
      paymentDate?: string;
      paymentMethod?: string;
      paymentReference?: string;
    },
  ) => api.post<PayrollRecord>(`/payroll/records/${id}/pay`, payload),

  getRecordCorrections: (id: string) =>
    api.get<PayrollRecordCorrectionsBreakdown>(`/payroll/records/${id}/corrections`),

  createRecordCorrection: (id: string, payload: CreatePayrollCorrectionPayload) =>
    api.post<PayrollCorrection>(`/payroll/records/${id}/corrections`, payload),

  reverseRecordCorrection: (id: string, payload: ReversePayrollCorrectionPayload) =>
    api.post<PayrollCorrection>(`/payroll/corrections/${id}/reverse`, payload),
};

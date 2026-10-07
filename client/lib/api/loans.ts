import { api } from "./client";
import {
  EmployeeLoan,
  LoanRepayment,
  CreateLoanPayload,
  LoanQuery,
} from "@/types/loan";
import { PaginatedResponse } from "@/types/organization";

export const loansApi = {
  list: (query: LoanQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.append("page", query.page.toString());
    if (query.limit) params.append("limit", query.limit.toString());
    if (query.employeeId) params.append("employeeId", query.employeeId);
    if (query.status) params.append("status", query.status);
    if (query.search) params.append("search", query.search);
    const queryString = params.toString();
    return api.get<PaginatedResponse<EmployeeLoan>>(
      `/loans${queryString ? `?${queryString}` : ""}`
    );
  },

  get: (id: string) => api.get<EmployeeLoan>(`/loans/${id}`),

  create: (payload: CreateLoanPayload) =>
    api.post<EmployeeLoan>("/loans", payload),

  cancel: (id: string, notes?: string) =>
    api.post<EmployeeLoan>(`/loans/${id}/cancel`, { notes }),

  getRepayments: (id: string) =>
    api.get<LoanRepayment[]>(`/loans/${id}/repayments`),

  getEmployeeLoans: (employeeId: string) =>
    api.get<EmployeeLoan[]>(`/employees/${employeeId}/loans`),
};

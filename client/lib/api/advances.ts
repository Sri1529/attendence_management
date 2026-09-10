import { api } from "./client";
import { EmployeeAdvance, AdvanceStatus } from "@/types/advances";

export interface AdvanceQuery {
  status?: AdvanceStatus;
}

export interface CreateAdvancePayload {
  amount: string;
  advanceDate: string;
  reason?: string;
  notes?: string;
}

export const advancesApi = {
  getAdvances: (employeeId: string, query: AdvanceQuery = {}) => {
    const params = new URLSearchParams();
    if (query.status) params.append("status", query.status);
    const queryString = params.toString();
    return api.get<EmployeeAdvance[]>(
      `/employees/${employeeId}/advances${queryString ? `?${queryString}` : ""}`
    );
  },

  getAdvanceById: (id: string) => api.get<EmployeeAdvance>(`/advances/${id}`),

  createAdvance: (employeeId: string, payload: CreateAdvancePayload) =>
    api.post<EmployeeAdvance>(`/employees/${employeeId}/advances`, payload),

  updateAdvanceStatus: (id: string, status: AdvanceStatus) =>
    api.patch<EmployeeAdvance>(`/advances/${id}/status`, { status }),
};

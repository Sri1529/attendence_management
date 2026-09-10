import { api } from "./client";
import {
  SalaryHistory,
  SalaryAdjustment,
  AdjustmentType,
  AdjustmentStatus,
} from "@/types/salary";

export interface CreateSalaryPayload {
  basicSalary: string;
  effectiveFrom: string;
  notes?: string;
}

export interface UpdateSalaryPayload {
  notes?: string;
}

export interface CorrectSalaryPayload {
  basicSalary?: string;
  effectiveFrom?: string;
  notes?: string;
}

export interface CreateAdjustmentPayload {
  adjustmentType: AdjustmentType;
  amount: string;
  adjustmentDate: string;
  description?: string;
}

export const salaryApi = {
  getCurrent: (employeeId: string, date?: string) => {
    const params = new URLSearchParams();
    if (date) params.append("date", date);
    const queryString = params.toString();
    return api.get<SalaryHistory | null>(
      `/employees/${employeeId}/salary/current${queryString ? `?${queryString}` : ""}`
    );
  },

  getHistory: (employeeId: string) =>
    api.get<SalaryHistory[]>(`/employees/${employeeId}/salary/history`),

  createSalary: (employeeId: string, payload: CreateSalaryPayload) =>
    api.post<SalaryHistory>(`/employees/${employeeId}/salary`, payload),

  updateSalaryHistoryNotes: (id: string, payload: UpdateSalaryPayload) =>
    api.patch<SalaryHistory>(`/salary-history/${id}`, payload),

  correctHistory: (id: string, payload: CorrectSalaryPayload) =>
    api.patch<SalaryHistory>(`/salary-history/${id}/correct`, payload),

  getAdjustments: (employeeId: string) =>
    api.get<SalaryAdjustment[]>(`/employees/${employeeId}/salary-adjustments`),

  createAdjustment: (employeeId: string, payload: CreateAdjustmentPayload) =>
    api.post<SalaryAdjustment>(`/employees/${employeeId}/salary-adjustments`, payload),

  updateAdjustmentStatus: (id: string, status: AdjustmentStatus) =>
    api.patch<SalaryAdjustment>(`/salary-adjustments/${id}/status`, { status }),
};

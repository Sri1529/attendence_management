import { api } from "./client";
import { LeaveRecord, LeaveStatus } from "@/types/leave";
import { PaginatedResponse } from "@/types/organization";

export interface LeaveRecordQuery {
  page?: number;
  limit?: number;
  search?: string;
  employeeId?: string;
  status?: LeaveStatus;
}

export interface CreateLeaveRecordPayload {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  remarks?: string;
  status?: LeaveStatus;
  is_paid?: boolean | null;
}

export interface UpdateLeaveRecordPayload {
  startDate?: string;
  endDate?: string;
  remarks?: string;
  leaveTypeId?: string;
  is_paid?: boolean | null;
}

export const leaveRecordsApi = {
  list: (query: LeaveRecordQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.append("page", String(query.page));
    if (query.limit) params.append("limit", String(query.limit));
    if (query.search) params.append("search", query.search);
    if (query.employeeId) params.append("employeeId", query.employeeId);
    if (query.status) params.append("status", query.status);
    const queryString = params.toString();
    return api.get<PaginatedResponse<LeaveRecord>>(
      `/leave-records${queryString ? `?${queryString}` : ""}`
    );
  },

  get: (id: string) => api.get<LeaveRecord>(`/leave-records/${id}`),

  create: (payload: CreateLeaveRecordPayload) =>
    api.post<LeaveRecord>("/leave-records", payload),

  update: (id: string, payload: UpdateLeaveRecordPayload) =>
    api.patch<LeaveRecord>(`/leave-records/${id}`, payload),

  updateStatus: (id: string, status: LeaveStatus) =>
    api.patch<LeaveRecord>(`/leave-records/${id}/status`, { status }),
};

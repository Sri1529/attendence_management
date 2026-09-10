import { api } from "./client";
import { LeaveType, LeaveTypeStatus } from "@/types/leave";
import { PaginatedResponse } from "@/types/organization";

export interface LeaveTypeQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateLeaveTypePayload {
  name: string;
  description?: string;
  is_paid?: boolean;
}

export interface UpdateLeaveTypePayload {
  name?: string;
  description?: string;
  is_paid?: boolean;
}

export const leaveTypesApi = {
  list: (query: LeaveTypeQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.append("page", String(query.page));
    if (query.limit) params.append("limit", String(query.limit));
    if (query.search) params.append("search", query.search);
    const queryString = params.toString();
    return api.get<PaginatedResponse<LeaveType>>(
      `/leave-types${queryString ? `?${queryString}` : ""}`
    );
  },

  get: (id: string) => api.get<LeaveType>(`/leave-types/${id}`),

  create: (payload: CreateLeaveTypePayload) =>
    api.post<LeaveType>("/leave-types", payload),

  update: (id: string, payload: UpdateLeaveTypePayload) =>
    api.patch<LeaveType>(`/leave-types/${id}`, payload),

  updateStatus: (id: string, status: LeaveTypeStatus) =>
    api.patch<LeaveType>(`/leave-types/${id}/status`, { status }),
};

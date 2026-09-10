import { api } from "./client";
import {
  Attendance,
  AttendanceStatus,
  BulkAttendancePayload,
} from "@/types/attendance";
import { PaginatedResponse } from "@/types/organization";

export interface AttendanceQuery {
  page?: number;
  limit?: number;
  search?: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus;
}

export interface CreateAttendancePayload {
  employeeId: string;
  attendanceDate: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface UpdateAttendancePayload {
  attendanceDate?: string;
  status?: AttendanceStatus;
  remarks?: string;
}

export const attendanceApi = {
  list: (query: AttendanceQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.append("page", String(query.page));
    if (query.limit) params.append("limit", String(query.limit));
    if (query.search) params.append("search", query.search);
    if (query.employeeId) params.append("employeeId", query.employeeId);
    if (query.startDate) params.append("startDate", query.startDate);
    if (query.endDate) params.append("endDate", query.endDate);
    if (query.status) params.append("status", query.status);
    const queryString = params.toString();
    return api.get<PaginatedResponse<Attendance>>(
      `/attendance${queryString ? `?${queryString}` : ""}`
    );
  },

  get: (id: string) => api.get<Attendance>(`/attendance/${id}`),

  create: (payload: CreateAttendancePayload) =>
    api.post<Attendance>("/attendance", payload),

  bulkCreate: (payload: BulkAttendancePayload) =>
    api.post<{ count: number }>("/attendance/bulk", payload),

  update: (id: string, payload: UpdateAttendancePayload) =>
    api.patch<Attendance>(`/attendance/${id}`, payload),

  updateStatus: (id: string, status: AttendanceStatus) =>
    api.patch<Attendance>(`/attendance/${id}/status`, { status }),
};

import { api } from "./client";
import { Department, DepartmentStatus, PaginatedResponse } from "@/types/organization";

export interface DepartmentQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateDepartmentPayload {
  name: string;
  description?: string;
}

export interface UpdateDepartmentPayload {
  name?: string;
  description?: string;
}

export const departmentsApi = {
  list: (query: DepartmentQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.append("page", String(query.page));
    if (query.limit) params.append("limit", String(query.limit));
    if (query.search) params.append("search", query.search);
    const queryString = params.toString();
    return api.get<PaginatedResponse<Department>>(
      `/departments${queryString ? `?${queryString}` : ""}`
    );
  },

  get: (id: string) => api.get<Department>(`/departments/${id}`),

  create: (payload: CreateDepartmentPayload) =>
    api.post<Department>("/departments", payload),

  update: (id: string, payload: UpdateDepartmentPayload) =>
    api.patch<Department>(`/departments/${id}`, payload),

  updateStatus: (id: string, status: DepartmentStatus) =>
    api.patch<Department>(`/departments/${id}/status`, { status }),
};

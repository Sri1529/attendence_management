import { api } from "./client";
import { Employee, EmploymentStatus, PaginatedResponse } from "@/types/organization";

export interface EmployeeQuery {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  designationId?: string;
  employmentStatus?: EmploymentStatus;
}

export interface CreateEmployeePayload {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  joiningDate: string;
  departmentId?: string;
  designationId?: string;
  employmentStatus?: EmploymentStatus;
}

export interface UpdateEmployeePayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  joiningDate?: string;
  departmentId?: string;
  designationId?: string;
}

export const employeesApi = {
  list: (query: EmployeeQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.append("page", String(query.page));
    if (query.limit) params.append("limit", String(query.limit));
    if (query.search) params.append("search", query.search);
    if (query.departmentId) params.append("departmentId", query.departmentId);
    if (query.designationId) params.append("designationId", query.designationId);
    if (query.employmentStatus) params.append("employmentStatus", query.employmentStatus);
    const queryString = params.toString();
    return api.get<PaginatedResponse<Employee>>(
      `/employees${queryString ? `?${queryString}` : ""}`
    );
  },

  get: (id: string) => api.get<Employee>(`/employees/${id}`),

  create: (payload: CreateEmployeePayload) =>
    api.post<Employee>("/employees", payload),

  update: (id: string, payload: UpdateEmployeePayload) =>
    api.patch<Employee>(`/employees/${id}`, payload),

  updateStatus: (id: string, status: EmploymentStatus) =>
    api.patch<Employee>(`/employees/${id}/status`, { status }),
};

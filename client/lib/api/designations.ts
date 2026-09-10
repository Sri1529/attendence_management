import { api } from "./client";
import { Designation, DesignationStatus, PaginatedResponse } from "@/types/organization";

export interface DesignationQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateDesignationPayload {
  name: string;
  description?: string;
}

export interface UpdateDesignationPayload {
  name?: string;
  description?: string;
}

export const designationsApi = {
  list: (query: DesignationQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.append("page", String(query.page));
    if (query.limit) params.append("limit", String(query.limit));
    if (query.search) params.append("search", query.search);
    const queryString = params.toString();
    return api.get<PaginatedResponse<Designation>>(
      `/designations${queryString ? `?${queryString}` : ""}`
    );
  },

  get: (id: string) => api.get<Designation>(`/designations/${id}`),

  create: (payload: CreateDesignationPayload) =>
    api.post<Designation>("/designations", payload),

  update: (id: string, payload: UpdateDesignationPayload) =>
    api.patch<Designation>(`/designations/${id}`, payload),

  updateStatus: (id: string, status: DesignationStatus) =>
    api.patch<Designation>(`/designations/${id}/status`, { status }),
};

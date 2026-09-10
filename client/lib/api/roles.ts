import { api } from "./client";
import { Role, RoleStatus } from "@/types/roles";

export interface CreateRolePayload {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
}

export const rolesApi = {
  findAll: async (): Promise<Role[]> => {
    return api.get<Role[]>("/roles");
  },

  findOne: async (id: string): Promise<Role> => {
    return api.get<Role>(`/roles/${id}`);
  },

  create: async (payload: CreateRolePayload): Promise<Role> => {
    return api.post<Role>("/roles", payload);
  },

  update: async (id: string, payload: UpdateRolePayload): Promise<Role> => {
    return api.patch<Role>(`/roles/${id}`, payload);
  },

  updateStatus: async (id: string, status: RoleStatus): Promise<Role> => {
    return api.patch<Role>(`/roles/${id}/status`, { status });
  },

  assignPermissions: async (id: string, permissionIds: string[]): Promise<Role> => {
    return api.patch<Role>(`/roles/${id}/permissions`, { permissionIds });
  },

  remove: async (id: string): Promise<{ success: boolean }> => {
    return api.delete<{ success: boolean }>(`/roles/${id}`);
  },
};

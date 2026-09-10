import { api } from "./client";
import { User, UserStatus } from "@/types/users";

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  roleId: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  roleId?: string;
}

export const usersApi = {
  findAll: async (): Promise<User[]> => {
    return api.get<User[]>("/users");
  },

  findOne: async (id: string): Promise<User> => {
    return api.get<User>(`/users/${id}`);
  },

  create: async (payload: CreateUserPayload): Promise<User> => {
    return api.post<User>("/users", payload);
  },

  update: async (id: string, payload: UpdateUserPayload): Promise<User> => {
    return api.patch<User>(`/users/${id}`, payload);
  },

  updateStatus: async (id: string, status: UserStatus): Promise<User> => {
    return api.patch<User>(`/users/${id}/status`, { status });
  },
};

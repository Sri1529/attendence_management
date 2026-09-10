import { api } from "./client";
import { Permission } from "@/types/permissions";

export const permissionsApi = {
  findAll: async (): Promise<Permission[]> => {
    return api.get<Permission[]>("/permissions");
  },
};

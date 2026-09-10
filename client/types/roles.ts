import { Permission } from "./permissions";

export enum RoleStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export interface Role {
  id: string;
  company_id: string;
  name: string;
  description?: string | null;
  is_system: boolean;
  status: RoleStatus;
  created_at: string;
  updated_at: string;
  permissions?: Permission[];
}

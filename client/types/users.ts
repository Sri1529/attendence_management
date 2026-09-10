import { Role } from "./roles";

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export interface User {
  id: string;
  company_id: string;
  role_id: string;
  role?: Role;
  name: string;
  email: string;
  status: UserStatus;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

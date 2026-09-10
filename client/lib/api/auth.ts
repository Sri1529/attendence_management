import { fetchApi } from "./client";

export interface UserRole {
  id: string;
  name: string;
  is_system: boolean;
}

export interface UserCompany {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  timezone: string;
  currency: string;
  status?: string;
}

export interface UserProfile {
  id: string;
  company_id: string;
  role_id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
  last_login_at?: string;
  created_at?: string;
  role?: UserRole;
  company?: UserCompany;
}

export interface AuthResponse {
  user: UserProfile;
  permissions: string[];
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  user: UserProfile;
  permissions: string[];
}

export async function loginApi(credentials: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return fetchApi<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
    requiresAuth: false,
  });
}

export async function registerApi(data: {
  companyName: string;
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return fetchApi<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
    requiresAuth: false,
  });
}

export async function getMeApi(): Promise<MeResponse> {
  return fetchApi<MeResponse>("/auth/me", {
    method: "GET",
    requiresAuth: true,
  });
}

export async function logoutApi(): Promise<{ message: string }> {
  return fetchApi<{ message: string }>("/auth/logout", {
    method: "POST",
    requiresAuth: true,
  });
}

export enum DepartmentStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export interface Department {
  id: string;
  company_id: string;
  name: string;
  description?: string | null;
  status: DepartmentStatus;
  created_at: string;
  updated_at: string;
}

export enum DesignationStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export interface Designation {
  id: string;
  company_id: string;
  name: string;
  description?: string | null;
  status: DesignationStatus;
  created_at: string;
  updated_at: string;
}

export enum EmploymentStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ON_NOTICE = "ON_NOTICE",
  TERMINATED = "TERMINATED",
}

export interface Employee {
  id: string;
  company_id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  joining_date: string;
  department_id?: string | null;
  department?: Department | null;
  designation_id?: string | null;
  designation?: Designation | null;
  employment_status: EmploymentStatus;
  created_at: string;
  updated_at: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

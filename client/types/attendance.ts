export enum AttendanceStatus {
  PRESENT = "PRESENT",
  ABSENT = "ABSENT",
  HALF_DAY = "HALF_DAY",
  LEAVE = "LEAVE",
  HOLIDAY = "HOLIDAY",
}

export interface Attendance {
  id: string;
  company_id: string;
  employee_id: string;
  employee?: {
    id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
    department?: { name: string } | null;
    designation?: { name: string } | null;
  } | null;
  attendance_date: string;
  status: AttendanceStatus;
  leave_record_id?: string | null;
  leave_record?: {
    id: string;
    status: string;
    start_date: string;
    end_date: string;
    leave_type?: { name: string } | null;
  } | null;
  remarks?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BulkAttendanceItemPayload {
  employeeId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface BulkAttendancePayload {
  attendanceDate: string;
  records: BulkAttendanceItemPayload[];
}

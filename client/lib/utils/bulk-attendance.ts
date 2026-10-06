import { AttendanceStatus } from "../../types/attendance";

export interface BulkAttendanceRowItem {
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    employee_code?: string;
  };
  status: AttendanceStatus;
  remarks: string;
  isLocked: boolean;
  leaveTypeName?: string;
  skip: boolean;
}

/**
 * Filter out locked rows and skipped rows to prepare records for bulk attendance submission.
 */
export function getSubmittableBulkRows(rows: BulkAttendanceRowItem[]): BulkAttendanceRowItem[] {
  return rows.filter((row) => !row.isLocked && !row.skip);
}

/**
 * Count the number of submittable (non-locked and non-skipped) employees for bulk attendance.
 */
export function getSubmittableBulkCount(rows: BulkAttendanceRowItem[]): number {
  return getSubmittableBulkRows(rows).length;
}

/**
 * Prepares the payload for bulk attendance API submission.
 * Filters out skipped and locked employees.
 */
export function prepareBulkAttendancePayload(
  attendanceDate: string,
  rows: BulkAttendanceRowItem[]
) {
  const submittable = getSubmittableBulkRows(rows);
  return {
    attendanceDate,
    records: submittable.map((r) => ({
      employeeId: r.employee.id,
      status: r.status,
      remarks: r.remarks.trim() || undefined,
    })),
  };
}

/**
 * Toggles the skip status for a specific row without altering status or remarks.
 */
export function toggleRowSkip(
  rows: BulkAttendanceRowItem[],
  index: number,
  skip: boolean
): BulkAttendanceRowItem[] {
  if (index < 0 || index >= rows.length) return rows;
  const updated = [...rows];
  updated[index] = { ...updated[index], skip };
  return updated;
}

import { describe, it, expect } from "vitest";
import { AttendanceStatus } from "../../types/attendance";
import {
  BulkAttendanceRowItem,
  getSubmittableBulkRows,
  getSubmittableBulkCount,
  prepareBulkAttendancePayload,
  toggleRowSkip,
} from "./bulk-attendance";

describe("Bulk Attendance Skip Logic", () => {
  const sampleRows: BulkAttendanceRowItem[] = [
    {
      employee: { id: "emp-1", first_name: "Rithu", last_name: "Rithu", employee_code: "EMP001" },
      status: AttendanceStatus.PRESENT,
      remarks: "On time",
      isLocked: false,
      skip: false,
    },
    {
      employee: { id: "emp-2", first_name: "Sriniga", last_name: "Sriniga", employee_code: "EMP002" },
      status: AttendanceStatus.PRESENT,
      remarks: "",
      isLocked: false,
      skip: false,
    },
    {
      employee: { id: "emp-3", first_name: "Anand", last_name: "Kumar", employee_code: "EMP003" },
      status: AttendanceStatus.ABSENT,
      remarks: "Unexcused",
      isLocked: false,
      skip: false,
    },
  ];

  it("1. All employees unskipped -> all are submitted", () => {
    const submittable = getSubmittableBulkRows(sampleRows);
    expect(submittable.length).toBe(3);
    const payload = prepareBulkAttendancePayload("2026-10-06", sampleRows);
    expect(payload.records.length).toBe(3);
    expect(payload.records.map((r) => r.employeeId)).toEqual(["emp-1", "emp-2", "emp-3"]);
  });

  it("2. One employee skipped -> only remaining employees are submitted", () => {
    const updatedRows = toggleRowSkip(sampleRows, 1, true); // Skip Sriniga (emp-2)
    const submittable = getSubmittableBulkRows(updatedRows);
    expect(submittable.length).toBe(2);
    expect(submittable.map((r) => r.employee.id)).toEqual(["emp-1", "emp-3"]);

    const payload = prepareBulkAttendancePayload("2026-10-06", updatedRows);
    expect(payload.records.map((r) => r.employeeId)).toEqual(["emp-1", "emp-3"]);
  });

  it("3. Multiple employees skipped -> only unskipped employees are submitted", () => {
    let updatedRows = toggleRowSkip(sampleRows, 0, true); // Skip Rithu (emp-1)
    updatedRows = toggleRowSkip(updatedRows, 2, true); // Skip Anand (emp-3)

    const submittable = getSubmittableBulkRows(updatedRows);
    expect(submittable.length).toBe(1);
    expect(submittable[0].employee.id).toBe("emp-2");

    const payload = prepareBulkAttendancePayload("2026-10-06", updatedRows);
    expect(payload.records.map((r) => r.employeeId)).toEqual(["emp-2"]);
  });

  it("4. All employees skipped -> Save button disabled (count is 0)", () => {
    let updatedRows = toggleRowSkip(sampleRows, 0, true);
    updatedRows = toggleRowSkip(updatedRows, 1, true);
    updatedRows = toggleRowSkip(updatedRows, 2, true);

    const count = getSubmittableBulkCount(updatedRows);
    expect(count).toBe(0);

    const payload = prepareBulkAttendancePayload("2026-10-06", updatedRows);
    expect(payload.records.length).toBe(0);
  });

  it("5. Skipped employee does not receive an attendance record", () => {
    const updatedRows = toggleRowSkip(sampleRows, 1, true); // Skip emp-2
    const payload = prepareBulkAttendancePayload("2026-10-06", updatedRows);

    const emp2Record = payload.records.find((r) => r.employeeId === "emp-2");
    expect(emp2Record).toBeUndefined();
  });

  it("6. Skipping does not change the employee's attendance status", () => {
    const initialStatus = sampleRows[0].status; // PRESENT
    const updatedRows = toggleRowSkip(sampleRows, 0, true); // Skip emp-1

    expect(updatedRows[0].skip).toBe(true);
    expect(updatedRows[0].status).toBe(initialStatus); // Still PRESENT
  });

  it("7. Unchecking Skip makes the employee eligible for submission again", () => {
    let updatedRows = toggleRowSkip(sampleRows, 0, true); // Skip emp-1
    expect(getSubmittableBulkCount(updatedRows)).toBe(2);

    updatedRows = toggleRowSkip(updatedRows, 0, false); // Unskip emp-1
    expect(getSubmittableBulkCount(updatedRows)).toBe(3);

    const payload = prepareBulkAttendancePayload("2026-10-06", updatedRows);
    expect(payload.records.map((r) => r.employeeId)).toContain("emp-1");
  });
});

import { describe, it, expect } from "vitest";
import { groupPermissions } from "./permission-grouping";
import { Permission } from "@/types/permissions";

describe("groupPermissions", () => {
  it("groups permissions into logical modules", () => {
    const mockPermissions: Permission[] = [
      { id: "1", code: "EMPLOYEE_VIEW", name: "View Employees", created_at: "" },
      { id: "2", code: "ATTENDANCE_VIEW", name: "View Attendance", created_at: "" },
      { id: "3", code: "PAYROLL_GENERATE", name: "Generate Payroll", created_at: "" },
      { id: "4", code: "USER_CREATE", name: "Create User", created_at: "" },
    ];

    const grouped = groupPermissions(mockPermissions);
    expect(grouped.length).toBe(4);

    const workforceGroup = grouped.find((g) => g.id === "workforce");
    expect(workforceGroup?.permissions.length).toBe(1);
    expect(workforceGroup?.permissions[0].code).toBe("EMPLOYEE_VIEW");

    const payrollGroup = grouped.find((g) => g.id === "payroll");
    expect(payrollGroup?.permissions.length).toBe(1);
    expect(payrollGroup?.permissions[0].code).toBe("PAYROLL_GENERATE");
  });
});

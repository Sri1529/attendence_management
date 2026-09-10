import { describe, it, expect } from "vitest";
import {
  getActionBadgeVariant,
  formatActionLabel,
  formatEntityTypeLabel,
  formatEntityContext,
  formatAuditDate,
  sanitizeMetadata,
} from "./audit-utils";

describe("auditUtils", () => {
  it("maps action names to badge variants correctly", () => {
    expect(getActionBadgeVariant("EMPLOYEE_CREATE")).toBe("success");
    expect(getActionBadgeVariant("USER_DEACTIVATE")).toBe("danger");
    expect(getActionBadgeVariant("ROLE_UPDATE")).toBe("warning");
    expect(getActionBadgeVariant("LOGIN")).toBe("primary");
    expect(getActionBadgeVariant("UNKNOWN_ACTION")).toBe("neutral");
  });

  it("formats raw action names into human readable labels", () => {
    expect(formatActionLabel("LEAVE_RECORD_STATUS_UPDATE")).toBe("Leave Status Updated");
    expect(formatActionLabel("EMPLOYEE_CREATE")).toBe("Employee Added");
    expect(formatActionLabel("COMPANY_REGISTER")).toBe("Company Registered");
    expect(formatActionLabel("LOGIN")).toBe("User Login");
  });

  it("formats entity types and contexts cleanly", () => {
    expect(formatEntityTypeLabel("LEAVE_RECORD")).toBe("Leave Record");
    expect(formatEntityContext("LEAVE_RECORD", { employeeName: "Sri Hari", leaveType: "Casual" })).toEqual({
      primary: "Sri Hari",
      secondary: "Leave Record • Casual",
    });
    expect(formatEntityContext("ATTENDANCE", { attendanceDate: "2026-09-04", count: 3 })).toEqual({
      primary: `3 employees • ${formatAuditDate("2026-09-04")}`,
      secondary: "Attendance",
    });
  });

  it("defensively strips sensitive keys from metadata objects", () => {
    const raw = {
      orderId: "order_123",
      password: "secret_password",
      refresh_token: "jwt_token",
      nested: {
        apiKey: "api_key",
        safeValue: 42,
      },
    };

    const sanitized = sanitizeMetadata(raw);
    expect(sanitized).toEqual({
      orderId: "order_123",
      nested: {
        safeValue: 42,
      },
    });
  });
});

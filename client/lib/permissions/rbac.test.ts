import { describe, it, expect } from "vitest";
import { PermissionCode } from "./codes";
import { hasPermission, hasAnyPermission, hasAllPermissions } from "./rbac";

describe("RBAC Helper Functions", () => {
  const userPermissions = [
    PermissionCode.EMPLOYEE_VIEW,
    PermissionCode.EMPLOYEE_CREATE,
    PermissionCode.ATTENDANCE_VIEW,
  ];

  it("should correctly identify when a user has a specific permission", () => {
    expect(hasPermission(userPermissions, PermissionCode.EMPLOYEE_VIEW)).toBe(true);
    expect(hasPermission(userPermissions, PermissionCode.EMPLOYEE_DELETE)).toBe(false);
  });

  it("should correctly identify when a user has ANY of the specified permissions", () => {
    expect(
      hasAnyPermission(userPermissions, [
        PermissionCode.EMPLOYEE_DELETE,
        PermissionCode.ATTENDANCE_VIEW,
      ])
    ).toBe(true);

    expect(
      hasAnyPermission(userPermissions, [
        PermissionCode.EMPLOYEE_DELETE,
        PermissionCode.PAYROLL_VIEW,
      ])
    ).toBe(false);
  });

  it("should correctly identify when a user has ALL of the specified permissions", () => {
    expect(
      hasAllPermissions(userPermissions, [
        PermissionCode.EMPLOYEE_VIEW,
        PermissionCode.EMPLOYEE_CREATE,
      ])
    ).toBe(true);

    expect(
      hasAllPermissions(userPermissions, [
        PermissionCode.EMPLOYEE_VIEW,
        PermissionCode.EMPLOYEE_DELETE,
      ])
    ).toBe(false);
  });

  it("should handle null or undefined user permissions gracefully", () => {
    expect(hasPermission(null, PermissionCode.EMPLOYEE_VIEW)).toBe(false);
    expect(hasAnyPermission(undefined, [PermissionCode.EMPLOYEE_VIEW])).toBe(false);
    expect(hasAllPermissions(null, [PermissionCode.EMPLOYEE_VIEW])).toBe(false);
  });
});

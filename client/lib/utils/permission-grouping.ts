import { Permission } from "@/types/permissions";

export interface PermissionSubGroup {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  subGroups: PermissionSubGroup[];
  permissions: Permission[];
}

// Order priority within sub-groups (VIEW -> CREATE -> UPDATE -> DELETE/etc.)
const actionOrderMap: Record<string, number> = {
  VIEW: 1,
  GENERATE: 2,
  CREATE: 3,
  DOWNLOAD: 4,
  UPDATE: 5,
  FINALIZE: 6,
  MARK_PAID: 7,
  DELETE: 8,
  DEACTIVATE: 8,
  MANAGE: 2,
};

function getActionPriority(code: string): number {
  const parts = code.toUpperCase().split("_");
  const lastPart = parts[parts.length - 1];
  return actionOrderMap[lastPart] || 99;
}

export function groupPermissions(permissions: Permission[]): PermissionGroup[] {
  const subGroupDefs: Array<{
    moduleId: "workforce" | "operations" | "payroll" | "admin" | "other";
    subId: string;
    subName: string;
    prefixes: string[];
  }> = [
    // Workforce & Organization
    { moduleId: "workforce", subId: "employee", subName: "Employee Management", prefixes: ["EMPLOYEE_"] },
    { moduleId: "workforce", subId: "department", subName: "Department Management", prefixes: ["DEPARTMENT_"] },
    { moduleId: "workforce", subId: "designation", subName: "Designation Management", prefixes: ["DESIGNATION_"] },

    // Time & Operations
    { moduleId: "operations", subId: "attendance", subName: "Daily Attendance Logs", prefixes: ["ATTENDANCE_"] },
    { moduleId: "operations", subId: "leave", subName: "Leave & Absence Records", prefixes: ["LEAVE_"] },

    // Compensation & Payroll
    { moduleId: "payroll", subId: "salary", subName: "Salary Structures", prefixes: ["SALARY_"] },
    { moduleId: "payroll", subId: "advance", subName: "Salary Advances", prefixes: ["ADVANCE_"] },
    { moduleId: "payroll", subId: "payroll_and_payslips", subName: "Payroll Engine & Payslip Statements", prefixes: ["PAYROLL_", "PAYSLIP_"] },

    // Administration & Security
    { moduleId: "admin", subId: "users", subName: "User Accounts & Credentials", prefixes: ["USER_"] },
    { moduleId: "admin", subId: "roles", subName: "Custom Roles & Permissions", prefixes: ["ROLE_"] },
    { moduleId: "admin", subId: "settings", subName: "Company & Organization Settings", prefixes: ["COMPANY_SETTINGS_"] },
    { moduleId: "admin", subId: "subscription", subName: "Subscription & Billing Plans", prefixes: ["SUBSCRIPTION_"] },
    { moduleId: "admin", subId: "audit", subName: "Security & System Audit Logs", prefixes: ["AUDIT_LOG_"] },
  ];

  const moduleMeta = {
    workforce: {
      id: "workforce",
      name: "Workforce & Organization",
      description: "Employee records, departments, and job designations",
    },
    operations: {
      id: "operations",
      name: "Time & Operations",
      description: "Daily attendance logs, leave types, and leave approval requests",
    },
    payroll: {
      id: "payroll",
      name: "Compensation & Payroll",
      description: "Base salary structures, salary advances, monthly payroll processing, and payslip statements",
    },
    admin: {
      id: "admin",
      name: "Administration & Security",
      description: "User management, custom RBAC roles, tenant settings, subscription plan, and security audit logs",
    },
    other: {
      id: "other",
      name: "Other System Permissions",
      description: "Miscellaneous system capabilities",
    },
  };

  const subGroupMap = new Map<string, { moduleId: string; subId: string; subName: string; permissions: Permission[] }>();
  subGroupDefs.forEach((def) => {
    subGroupMap.set(def.subId, {
      moduleId: def.moduleId,
      subId: def.subId,
      subName: def.subName,
      permissions: [],
    });
  });

  const otherPermissions: Permission[] = [];

  permissions.forEach((perm) => {
    const code = perm.code.toUpperCase();
    const matchedDef = subGroupDefs.find((def) => def.prefixes.some((prefix) => code.startsWith(prefix)));

    if (matchedDef) {
      const sg = subGroupMap.get(matchedDef.subId);
      if (sg) sg.permissions.push(perm);
    } else {
      otherPermissions.push(perm);
    }
  });

  subGroupMap.forEach((sg) => {
    sg.permissions.sort((a, b) => {
      const orderA = getActionPriority(a.code);
      const orderB = getActionPriority(b.code);
      if (orderA !== orderB) return orderA - orderB;
      return a.code.localeCompare(b.code);
    });
  });

  const moduleGroups: Record<string, PermissionGroup> = {
    workforce: { ...moduleMeta.workforce, subGroups: [], permissions: [] },
    operations: { ...moduleMeta.operations, subGroups: [], permissions: [] },
    payroll: { ...moduleMeta.payroll, subGroups: [], permissions: [] },
    admin: { ...moduleMeta.admin, subGroups: [], permissions: [] },
    other: { ...moduleMeta.other, subGroups: [], permissions: [] },
  };

  subGroupDefs.forEach((def) => {
    const sg = subGroupMap.get(def.subId);
    if (sg && sg.permissions.length > 0) {
      moduleGroups[def.moduleId].subGroups.push({
        id: sg.subId,
        name: sg.subName,
        permissions: sg.permissions,
      });
      moduleGroups[def.moduleId].permissions.push(...sg.permissions);
    }
  });

  if (otherPermissions.length > 0) {
    moduleGroups.other.subGroups.push({
      id: "misc",
      name: "General Permissions",
      permissions: otherPermissions,
    });
    moduleGroups.other.permissions.push(...otherPermissions);
  }

  return Object.values(moduleGroups).filter((g) => g.permissions.length > 0);
}

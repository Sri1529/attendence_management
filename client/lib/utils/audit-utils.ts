export type ActionBadgeVariant = "success" | "danger" | "warning" | "primary" | "neutral";

export function getActionBadgeVariant(action: string): ActionBadgeVariant {
  const upper = action.toUpperCase();
  if (upper.includes("CREATE") || upper.includes("REGISTER") || upper.includes("CAPTURED") || upper.includes("GENERATE") || upper.includes("SUCCESS")) {
    return "success";
  }
  if (upper.includes("DELETE") || upper.includes("CANCEL") || upper.includes("FAILED") || upper.includes("DEACTIVATE") || upper.includes("REJECT")) {
    return "danger";
  }
  if (upper.includes("UPDATE") || upper.includes("EDIT") || upper.includes("FINALIZE") || upper.includes("REPAY") || upper.includes("REOPEN")) {
    return "warning";
  }
  if (upper.includes("LOGIN") || upper.includes("LOGOUT") || upper.includes("AUTH") || upper.includes("TRIAL") || upper.includes("PAYMENT")) {
    return "primary";
  }
  return "neutral";
}

export function formatActionLabel(action?: string | null): string {
  if (!action) return "System Event";
  const upper = action.toUpperCase();
  const actionMap: Record<string, string> = {
    LOGIN: "User Login",
    LOGOUT: "User Logout",
    COMPANY_REGISTER: "Company Registered",
    EMPLOYEE_CREATE: "Employee Added",
    EMPLOYEE_UPDATE: "Employee Updated",
    EMPLOYEE_STATUS_UPDATE: "Employee Status Changed",
    DEPARTMENT_CREATE: "Department Created",
    DEPARTMENT_UPDATE: "Department Updated",
    DEPARTMENT_STATUS_UPDATE: "Department Status Changed",
    DESIGNATION_CREATE: "Designation Created",
    DESIGNATION_UPDATE: "Designation Updated",
    DESIGNATION_STATUS_UPDATE: "Designation Status Changed",
    LEAVE_TYPE_CREATE: "Leave Category Created",
    LEAVE_TYPE_UPDATE: "Leave Category Updated",
    LEAVE_TYPE_STATUS_UPDATE: "Leave Category Status Changed",
    LEAVE_TYPE_SALARY_TREATMENT_UPDATE: "Leave Category Paid/Unpaid Policy Updated",
    LEAVE_RECORD_CREATE: "Leave Requested",
    LEAVE_RECORD_UPDATE: "Leave Request Updated",
    LEAVE_RECORD_STATUS_UPDATE: "Leave Status Updated",
    LEAVE_RECORD_SALARY_TREATMENT_OVERRIDE: "Leave Request Salary Treatment Overridden",
    ABSENCE_DEDUCTION_MODE_UPDATE: "Absence Deduction Policy Updated",
    SALARY_CREATE: "Salary Revision Recorded",
    SALARY_UPDATE: "Salary Record Updated",
    SALARY_ADJUSTMENT_CREATE: "Salary Adjustment Created",
    ADVANCE_CREATE: "Salary Advance Issued",
    ADVANCE_STATUS_UPDATE: "Salary Advance Status Changed",
    USER_CREATE: "User Account Created",
    USER_UPDATE: "User Account Updated",
    USER_STATUS_UPDATE: "User Status Changed",
    ROLE_CREATE: "Role Created",
    ROLE_UPDATE: "Role Updated",
    ROLE_DELETE: "Role Deleted",
    ROLE_PERMISSIONS_UPDATE: "Role Permissions Updated",
    USER_ROLE_UPDATE: "User Role Updated",
    ATTENDANCE_CREATE: "Attendance Entry Created",
    ATTENDANCE_BULK_CREATE: "Bulk Attendance Recorded",
    ATTENDANCE_UPDATE: "Attendance Record Updated",
    ATTENDANCE_LEAVE_SYNC: "Attendance Leave Synchronized",
    PAYROLL_PERIOD_CREATE: "Payroll Period Created",
    PAYROLL_GENERATE: "Payroll Generated",
    PAYROLL_FINALIZE: "Payroll Finalized",
    PAYROLL_REOPENED_FOR_CORRECTION: "Payroll Reopened for Correction",
    PAYSLIP_REGISTRATION: "Payslip Registered",
    PAYSLIP_GENERATE: "Payslip Generated",
    PAYROLL_RECORD_UPDATE: "Payroll Record Updated",
    PAYROLL_RECORD_DELETE: "Payroll Record Deleted",
    PAYROLL_CORRECTION_CREATED: "Payroll Correction Created",
    PAYROLL_CORRECTION_APPLIED: "Payroll Correction Applied",
    PAYROLL_CORRECTION_REVERSED: "Payroll Correction Reversed",
    PAYMENT_ORDER_CREATED: "Payment Order Created",
    PAYMENT_CAPTURED: "Payment Processed",
    SUBSCRIPTION_PAYMENT_ACTIVATED: "Subscription Activated",
    SUBSCRIPTION_RENEWED: "Subscription Renewed",
  };

  if (actionMap[upper]) return actionMap[upper];

  // Fallback: title case from SNAKE_CASE
  return upper
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function formatEntityTypeLabel(entityType?: string | null): string {
  if (!entityType) return "General System";
  const upper = entityType.toUpperCase();
  const entityMap: Record<string, string> = {
    COMPANY: "Company Profile",
    EMPLOYEE: "Employee Record",
    DEPARTMENT: "Department",
    DESIGNATION: "Designation",
    LEAVE_TYPE: "Leave Policy",
    LEAVE_RECORD: "Leave Record",
    ATTENDANCE: "Attendance",
    SALARY: "Salary Record",
    SALARY_ADJUSTMENT: "Salary Adjustment",
    SALARY_ADVANCE: "Salary Advance",
    USER: "User Account",
    ROLE: "Role & Permissions",
    PAYROLL_PERIOD: "Payroll Period",
    PAYROLL_CORRECTION: "Payroll Correction",
    PAYSLIP: "Salary Payslip",
    PAYMENT_TRANSACTION: "Payment Receipt",
    SUBSCRIPTION: "Subscription Plan",
  };

  if (entityMap[upper]) return entityMap[upper];

  return upper
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function formatAuditDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatAuditFullDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMetadataKeyLabel(key: string): string {
  const keyMap: Record<string, string> = {
    employeeName: "Employee Name",
    employeeCode: "Employee Code",
    employeeId: "Employee ID",
    attendanceDate: "Attendance Date",
    leaveTypeName: "Leave Category",
    leaveType: "Leave Category",
    startDate: "Start Date",
    endDate: "End Date",
    advanceNumber: "Advance Number",
    advanceDate: "Advance Date",
    repaymentDate: "Repayment Date",
    reason: "Reason",
    count: "Employees Updated",
    recordsInserted: "Records Inserted",
    recordsUpdated: "Records Updated",
    status: "Status",
    previousStatus: "Previous Status",
    remarks: "Remarks",
    amount: "Amount",
    billingInterval: "Billing Interval",
    grossSalary: "Gross Salary",
    netSalary: "Net Salary",
    originalNetPay: "Original Net Pay",
    adjustedNetPay: "Adjusted Net Pay",
    correctionType: "Correction Type",
    correctionId: "Correction ID",
    reversalCorrectionId: "Reversal Target ID",
    reversalAmount: "Reversal Amount",
    companyName: "Company Name",
    companyId: "Company ID",
    name: "Name",
    email: "Email",
    roleName: "Role Name",
    departmentName: "Department",
    designationName: "Designation",
  };

  if (keyMap[key]) return keyMap[key];

  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

export function extractAuditRecords(metadata?: Record<string, unknown> | null): Array<{
  employeeId?: string;
  employeeName?: string;
  employeeCode?: string;
  status: string;
  remarks?: string;
  leaveTypeName?: string;
  isLeave?: boolean;
}> {
  if (!metadata || typeof metadata !== "object") return [];
  const raw = (metadata as Record<string, unknown>).records;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as ReturnType<typeof extractAuditRecords>;
  if (typeof raw === "object") return Object.values(raw) as ReturnType<typeof extractAuditRecords>;
  return [];
}

export function formatEntityContext(
  entityType?: string | null,
  metadata?: Record<string, unknown> | null,
): { primary: string; secondary?: string } {
  const label = formatEntityTypeLabel(entityType);
  if (!metadata || typeof metadata !== "object") {
    return { primary: label };
  }

  const meta = metadata as Record<string, unknown>;

  if (entityType?.toUpperCase() === "PAYROLL_CORRECTION" || meta.correctionType) {
    const empName = typeof meta.employeeName === "string" ? meta.employeeName : "";
    const empCode = typeof meta.employeeCode === "string" ? ` (${meta.employeeCode})` : "";
    const primary = `${empName}${empCode}`.trim() || label;
    const typeStr = typeof meta.correctionType === "string" ? meta.correctionType.replace(/_/g, " ") : "Correction";
    const numAmt = meta.amount !== undefined && meta.amount !== null ? Number(meta.amount) : null;
    const amtStr = numAmt !== null ? ` • ${numAmt >= 0 ? "+" : ""}₹${Math.abs(numAmt).toLocaleString("en-IN")}` : "";
    return {
      primary,
      secondary: `${typeStr}${amtStr}`,
    };
  }

  if (meta.attendanceDate && meta.count !== undefined) {
    const count = Number(meta.count);
    const dateFormatted = formatAuditDate(String(meta.attendanceDate));
    return {
      primary: `${count} employee${count === 1 ? "" : "s"} • ${dateFormatted}`,
      secondary: "Attendance",
    };
  }

  if (typeof meta.advanceNumber === "string" && meta.advanceNumber) {
    const empStr = typeof meta.employeeName === "string" ? ` • ${meta.employeeName}` : "";
    return { primary: `${meta.advanceNumber}${empStr}`, secondary: label };
  }

  if (typeof meta.employeeName === "string" && meta.employeeName) {
    const leaveTypeStr = typeof meta.leaveType === "string" ? ` • ${meta.leaveType}` : "";
    return { primary: meta.employeeName, secondary: `${label}${leaveTypeStr}` };
  }

  if (typeof meta.name === "string" && meta.name) {
    return { primary: meta.name, secondary: label };
  }

  if (typeof meta.companyName === "string" && meta.companyName) {
    return { primary: meta.companyName, secondary: "Company" };
  }

  if (typeof meta.email === "string" && meta.email) {
    return { primary: meta.email, secondary: label };
  }

  if (typeof meta.status === "string" && meta.status) {
    return { primary: `Status: ${meta.status}`, secondary: label };
  }

  if (meta.amount !== undefined && meta.amount !== null) {
    const intervalStr = typeof meta.billingInterval === "string" ? ` (${meta.billingInterval})` : "";
    return { primary: `$${meta.amount}`, secondary: `${label}${intervalStr}` };
  }

  return { primary: label };
}

export function sanitizeMetadata(metadata?: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object") return null;

  const sensitiveKeys = [
    "password",
    "password_hash",
    "refreshtoken",
    "refresh_token",
    "refresh_token_hash",
    "accesstoken",
    "access_token",
    "secret",
    "apikey",
    "keysecret",
    "webhooksecret",
  ];

  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      continue;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      clean[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      clean[key] = value;
    }
  }

  return Object.keys(clean).length > 0 ? clean : null;
}

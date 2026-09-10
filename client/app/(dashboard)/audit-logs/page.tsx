"use client";

import React, { useState, useEffect } from "react";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { useQueryParams } from "@/hooks/use-query-params";
import { auditLogsApi } from "@/lib/api/audit-logs";
import { attendanceApi } from "@/lib/api/attendance";
import { leaveRecordsApi } from "@/lib/api/leave-records";
import {
  getActionBadgeVariant,
  formatActionLabel,
  formatEntityTypeLabel,
  formatEntityContext,
  formatAuditDate,
  formatAuditFullDate,
  formatMetadataKeyLabel,
  extractAuditRecords,
  sanitizeMetadata,
} from "@/lib/utils/audit-utils";
import { AuditLog, AuditLogResponse } from "@/types/audit-log";
import { History, User as UserIcon, Code2, Copy, Check, Eye, Globe, CheckCircle2, Lock } from "lucide-react";

export default function AuditLogsPage() {
  const { toast } = useToast();
  const { getIntParam, getParam, setParam, setParams } = useQueryParams();

  const page = getIntParam("page", 1);
  const limit = getIntParam("limit", 20);
  const actionFilter = getParam("action", "");
  const entityTypeFilter = getParam("entityType", "");
  const startDateFilter = getParam("startDate", "");
  const endDateFilter = getParam("endDate", "");

  const [dataResponse, setDataResponse] = useState<AuditLogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inspector Modal State
  const [inspectLog, setInspectLog] = useState<AuditLog | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const [fallbackRecords, setFallbackRecords] = useState<
    Array<{
      employeeId?: string;
      employeeName: string;
      employeeCode: string;
      status: string;
      remarks?: string;
      leaveTypeName?: string;
      isLeave?: boolean;
    }>
  >([]);
  const [isFallbackLoading, setIsFallbackLoading] = useState(false);

  const [leaveDetails, setLeaveDetails] = useState<{
    employeeName?: string;
    employeeCode?: string;
    leaveCategory?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!inspectLog) {
      Promise.resolve().then(() => {
        if (isMounted) {
          setFallbackRecords([]);
          setLeaveDetails(null);
        }
      });
      return () => {
        isMounted = false;
      };
    }

    if (
      inspectLog.entity_type === "LEAVE_RECORD" &&
      inspectLog.entity_id &&
      !inspectLog.metadata?.employeeName
    ) {
      leaveRecordsApi
        .get(inspectLog.entity_id)
        .then((res) => {
          if (res) {
            const rec = res;
            setLeaveDetails({
              employeeName:
                `${rec.employee?.first_name || ""} ${rec.employee?.last_name || ""}`.trim() ||
                undefined,
              employeeCode: rec.employee?.employee_code || undefined,
              leaveCategory: rec.leave_type?.name || undefined,
              startDate: rec.start_date || undefined,
              endDate: rec.end_date || undefined,
              status: rec.status || undefined,
            });
          }
        })
        .catch(() => {
          setLeaveDetails(null);
        });
    } else {
      Promise.resolve().then(() => {
        if (isMounted) setLeaveDetails(null);
      });
    }

    const embedded = extractAuditRecords(inspectLog.metadata);
    if (embedded.length > 0) {
      Promise.resolve().then(() => {
        if (isMounted) setFallbackRecords([]);
      });
      return;
    }

    const attDate = inspectLog.metadata?.attendanceDate as string | undefined;
    if (inspectLog.action === "ATTENDANCE_BULK_CREATE" && attDate) {
      Promise.resolve().then(() => {
        if (isMounted) setIsFallbackLoading(true);
      });
      attendanceApi
        .list({ startDate: attDate, endDate: attDate, limit: 100 })
        .then((res) => {
          const records = (res.data || []).map((att) => ({
            employeeId: att.employee_id,
            employeeName:
              `${att.employee?.first_name || ""} ${att.employee?.last_name || ""}`.trim() ||
              "Employee",
            employeeCode: att.employee?.employee_code || "—",
            status: att.status,
            remarks: att.remarks || undefined,
            isLeave: !!att.leave_record_id || att.status === "LEAVE",
            leaveTypeName: att.leave_record?.leave_type?.name,
          }));
          setFallbackRecords(records);
        })
        .catch(() => {
          setFallbackRecords([]);
        })
        .finally(() => {
          setIsFallbackLoading(false);
        });
    }
  }, [inspectLog]);

  useEffect(() => {
    let isMounted = true;

    const getStartIso = (d: string) => {
      if (!d) return undefined;
      const parts = d.split("-").map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) return undefined;
      const [y, m, day] = parts;
      const date = new Date(y, m - 1, day, 0, 0, 0, 0);
      return date.toISOString();
    };

    const getEndIso = (d: string) => {
      if (!d) return undefined;
      const parts = d.split("-").map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) return undefined;
      const [y, m, day] = parts;
      const date = new Date(y, m - 1, day, 23, 59, 59, 999);
      return date.toISOString();
    };

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await auditLogsApi.getAuditLogs({
          page,
          limit,
          action: actionFilter || undefined,
          entityType: entityTypeFilter || undefined,
          startDate: getStartIso(startDateFilter),
          endDate: getEndIso(endDateFilter),
        });
        if (isMounted) setDataResponse(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load audit trail logs.";
        if (isMounted) setError(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [page, limit, actionFilter, entityTypeFilter, startDateFilter, endDateFilter]);

  const handleCopyMetadata = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success("Copied to Clipboard", "Audit metadata copied.");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const columns: ColumnDef<AuditLog>[] = [
    {
      header: "Timestamp",
      cell: (row) => (
        <div>
          <div className="font-semibold text-xs text-foreground">
            {new Date(row.created_at).toLocaleDateString()}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            {new Date(row.created_at).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      header: "User / Actor",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-primary/10 text-primary shrink-0">
            <UserIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-semibold text-foreground text-xs">
              {row.user?.name || "System Automated"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {row.user?.email || "system@app"}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Action",
      cell: (row) => (
        <Badge variant={getActionBadgeVariant(row.action)} showDot className="text-[11px] font-medium">
          {formatActionLabel(row.action)}
        </Badge>
      ),
    },
    {
      header: "Entity Context",
      cell: (row) => {
        const ctx = formatEntityContext(row.entity_type, row.metadata);
        return (
          <div>
            <div className="font-semibold text-foreground text-xs">
              {ctx.primary}
            </div>
            {ctx.secondary && (
              <div className="text-[11px] text-muted-foreground">
                {ctx.secondary}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: "IP Address",
      cell: (row) => (
        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
          <Globe className="w-3 h-3" /> {row.ip_address || "—"}
        </span>
      ),
    },
    {
      header: "Metadata",
      cell: (row) => (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => {
            setInspectLog(row);
            setIsCopied(false);
          }}
        >
          <Eye className="w-3.5 h-3.5 mr-1" /> Inspect
        </Button>
      ),
    },
  ];

  const cleanMetadata = React.useMemo(() => {
    if (!inspectLog) return null;
    const base = sanitizeMetadata(inspectLog.metadata) || {};
    if (leaveDetails) {
      const merged: Record<string, unknown> = {};
      if (leaveDetails.employeeName) merged.employeeName = leaveDetails.employeeName;
      if (leaveDetails.employeeCode) merged.employeeCode = leaveDetails.employeeCode;
      if (leaveDetails.leaveCategory) merged.leaveCategory = leaveDetails.leaveCategory;
      if (leaveDetails.startDate) merged.startDate = leaveDetails.startDate;
      if (leaveDetails.endDate) merged.endDate = leaveDetails.endDate;
      return { ...merged, ...base };
    }
    return Object.keys(base).length > 0 ? base : null;
  }, [inspectLog, leaveDetails]);
  const formattedMetadataJson = cleanMetadata ? JSON.stringify(cleanMetadata, null, 2) : "";

  return (
    <PageContainer maxWidth="xl" className="py-6 space-y-6">
      <PageHeader
        title="Security Audit Trail"
        description="Enterprise audit ledger tracking administrative, workforce, payroll, and payment events."
        badge={
          <Badge variant="primary" showDot>
            Immutable Audit Log
          </Badge>
        }
      />

      {/* Date Range & Custom Filter Controls */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3">
        <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <History className="w-4 h-4 text-primary" /> Filter Audit Ledger
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Input
            label="Start Date"
            type="date"
            value={startDateFilter}
            onChange={(e) => setParams({ startDate: e.target.value, page: 1 })}
          />
          <Input
            label="End Date"
            type="date"
            value={endDateFilter}
            onChange={(e) => setParams({ endDate: e.target.value, page: 1 })}
          />
        </div>
      </div>

      <FilterBar
        filters={[
          {
            key: "action",
            label: "Action",
            value: actionFilter,
            options: [
              { value: "LOGIN", label: "User Login" },
              { value: "COMPANY_REGISTER", label: "Company Registered" },
              { value: "EMPLOYEE_CREATE", label: "Employee Added" },
              { value: "EMPLOYEE_UPDATE", label: "Employee Updated" },
              { value: "EMPLOYEE_STATUS_UPDATE", label: "Employee Status Changed" },
              { value: "DEPARTMENT_CREATE", label: "Department Created" },
              { value: "DEPARTMENT_UPDATE", label: "Department Updated" },
              { value: "DEPARTMENT_STATUS_UPDATE", label: "Department Status Changed" },
              { value: "DESIGNATION_CREATE", label: "Designation Created" },
              { value: "DESIGNATION_UPDATE", label: "Designation Updated" },
              { value: "DESIGNATION_STATUS_UPDATE", label: "Designation Status Changed" },
              { value: "LEAVE_TYPE_CREATE", label: "Leave Category Created" },
              { value: "LEAVE_TYPE_UPDATE", label: "Leave Category Updated" },
              { value: "LEAVE_RECORD_CREATE", label: "Leave Requested" },
              { value: "LEAVE_RECORD_UPDATE", label: "Leave Request Updated" },
              { value: "LEAVE_RECORD_STATUS_UPDATE", label: "Leave Status Updated" },
              { value: "ATTENDANCE_BULK_CREATE", label: "Bulk Attendance Recorded" },
              { value: "ATTENDANCE_CREATE", label: "Attendance Entry Created" },
              { value: "ATTENDANCE_UPDATE", label: "Attendance Record Updated" },
              { value: "ATTENDANCE_LEAVE_SYNC", label: "Attendance Leave Synchronized" },
              { value: "SALARY_CREATE", label: "Salary Revision Recorded" },
              { value: "SALARY_ADJUSTMENT_CREATE", label: "Salary Adjustment Created" },
              { value: "ADVANCE_CREATE", label: "Salary Advance Issued" },
              { value: "ADVANCE_STATUS_UPDATE", label: "Salary Advance Status Changed" },
              { value: "USER_CREATE", label: "User Account Created" },
              { value: "USER_UPDATE", label: "User Account Updated" },
              { value: "USER_STATUS_UPDATE", label: "User Status Changed" },
              { value: "ROLE_CREATE", label: "Role Created" },
              { value: "ROLE_UPDATE", label: "Role Updated" },
              { value: "ROLE_PERMISSIONS_UPDATE", label: "Role Permissions Updated" },
              { value: "PAYROLL_GENERATE", label: "Payroll Generated" },
              { value: "PAYROLL_FINALIZE", label: "Payroll Finalized" },
              { value: "PAYROLL_REOPENED_FOR_CORRECTION", label: "Payroll Reopened for Correction" },
              { value: "PAYROLL_CORRECTION_CREATED", label: "Payroll Correction Created" },
              { value: "PAYROLL_CORRECTION_APPLIED", label: "Payroll Correction Applied" },
              { value: "PAYROLL_CORRECTION_REVERSED", label: "Payroll Correction Reversed" },
              { value: "PAYMENT_ORDER_CREATED", label: "Payment Order Created" },
            ],
          },
          {
            key: "entityType",
            label: "Entity Type",
            value: entityTypeFilter,
            options: [
              { value: "COMPANY", label: "Company Profile" },
              { value: "EMPLOYEE", label: "Employee" },
              { value: "DEPARTMENT", label: "Department" },
              { value: "DESIGNATION", label: "Designation" },
              { value: "LEAVE_TYPE", label: "Leave Policy" },
              { value: "LEAVE_RECORD", label: "Leave Record" },
              { value: "ATTENDANCE", label: "Attendance" },
              { value: "SALARY", label: "Salary Record" },
              { value: "SALARY_ADJUSTMENT", label: "Salary Adjustment" },
              { value: "SALARY_ADVANCE", label: "Salary Advance" },
              { value: "USER", label: "User Account" },
              { value: "ROLE", label: "User Role" },
              { value: "PAYROLL_PERIOD", label: "Payroll Run" },
              { value: "PAYROLL_CORRECTION", label: "Payroll Correction" },
              { value: "PAYMENT_TRANSACTION", label: "Payment Receipt" },
            ],
          },
        ]}
        onFilterChange={(key, val) => setParams({ [key]: val, page: 1 })}
        onClearAll={() => setParams({ action: "", entityType: "", startDate: "", endDate: "", page: 1 })}
      />

      <DataTable
        columns={columns}
        data={dataResponse?.data || []}
        isLoading={isLoading}
        error={error}
        emptyTitle="No audit logs recorded"
        emptyDescription="Administrative and security actions will be recorded here automatically."
        pagination={{
          page,
          limit,
          total: dataResponse?.meta.total || 0,
          totalPages: dataResponse?.meta.totalPages || 1,
          onPageChange: (p) => setParam("page", p),
          onLimitChange: (l) => setParams({ limit: l, page: 1 }),
        }}
      />

      {/* Human-Readable Inspector Modal */}
      <Modal
        isOpen={!!inspectLog}
        onClose={() => setInspectLog(null)}
        title={
          inspectLog?.action === "ATTENDANCE_BULK_CREATE"
            ? "Bulk Attendance Recorded"
            : `Audit Details — ${formatActionLabel(inspectLog?.action)}`
        }
        description={
          inspectLog
            ? inspectLog.action === "ATTENDANCE_BULK_CREATE"
              ? formatAuditFullDate(
                  (inspectLog.metadata?.attendanceDate as string) || inspectLog.created_at
                )
              : `Recorded on ${new Date(inspectLog.created_at).toLocaleString()}`
            : ""
        }
        size={inspectLog?.action === "ATTENDANCE_BULK_CREATE" ? "lg" : "md"}
      >
        {inspectLog && (
          <div className="space-y-5 text-xs">
            {/* Context Summary Header */}
            <div className="p-4 rounded-xl bg-secondary/40 border border-border space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[11px] text-muted-foreground font-medium block">
                    Performed By
                  </span>
                  <span className="font-semibold text-foreground">
                    {inspectLog.user?.name || "System Automated"}
                  </span>
                </div>
                {inspectLog.action === "ATTENDANCE_BULK_CREATE" ? (
                  <>
                    <div>
                      <span className="text-[11px] text-muted-foreground font-medium block">
                        Attendance Date
                      </span>
                      <span className="font-semibold text-foreground font-mono">
                        {formatAuditDate(
                          (inspectLog.metadata?.attendanceDate as string) || inspectLog.created_at
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground font-medium block">
                        Employees Updated
                      </span>
                      <span className="font-semibold text-foreground">
                        {typeof inspectLog.metadata?.count === "number"
                          ? `${inspectLog.metadata.count} employees`
                          : Array.isArray(inspectLog.metadata?.records)
                          ? `${(inspectLog.metadata?.records as Array<unknown>).length} employees`
                          : "1 employee"}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-[11px] text-muted-foreground font-medium block">
                        Event Category
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatEntityTypeLabel(inspectLog.entity_type)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground font-medium block">
                        Action
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatActionLabel(inspectLog.action)}
                      </span>
                    </div>
                  </>
                )}
                <div>
                  <span className="text-[11px] text-muted-foreground font-medium block">
                    IP Address
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {inspectLog.ip_address || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Specialized Bulk Attendance Inspector */}
            {inspectLog.action === "ATTENDANCE_BULK_CREATE" ||
            (inspectLog.metadata && extractAuditRecords(inspectLog.metadata).length > 0) ? (
              <div className="space-y-4">
                {/* Result Statistics Summary */}
                {(() => {
                  const embedded = extractAuditRecords(inspectLog.metadata);
                  const records = embedded.length > 0 ? embedded : fallbackRecords;

                  const totalCount =
                    records.length || (inspectLog.metadata?.count as number) || 0;
                  const presentCount = records.filter(
                    (r) => r.status === "PRESENT"
                  ).length;
                  const leaveCount = records.filter(
                    (r) => r.status === "LEAVE" || r.isLeave
                  ).length;
                  const absentCount = records.filter(
                    (r) => r.status === "ABSENT"
                  ).length;
                  const halfDayCount = records.filter(
                    (r) => r.status === "HALF_DAY"
                  ).length;
                  const holidayCount = records.filter(
                    (r) => r.status === "HOLIDAY"
                  ).length;

                  return (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="px-3.5 py-2 rounded-xl bg-card border border-border flex flex-col min-w-[85px]">
                          <span className="text-base font-bold text-foreground">
                            {totalCount}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            Employees
                          </span>
                        </div>
                        {presentCount > 0 && (
                          <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col min-w-[85px]">
                            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                              {presentCount}
                            </span>
                            <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">
                              Present
                            </span>
                          </div>
                        )}
                        {leaveCount > 0 && (
                          <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col min-w-[85px]">
                            <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                              {leaveCount}
                            </span>
                            <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-medium">
                              Leave
                            </span>
                          </div>
                        )}
                        {absentCount > 0 && (
                          <div className="px-3.5 py-2 rounded-xl bg-danger/10 border border-danger/20 flex flex-col min-w-[85px]">
                            <span className="text-base font-bold text-danger">
                              {absentCount}
                            </span>
                            <span className="text-[11px] text-danger/80 font-medium">
                              Absent
                            </span>
                          </div>
                        )}
                        {halfDayCount > 0 && (
                          <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col min-w-[85px]">
                            <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                              {halfDayCount}
                            </span>
                            <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-medium">
                              Half Day
                            </span>
                          </div>
                        )}
                        {holidayCount > 0 && (
                          <div className="px-3.5 py-2 rounded-xl bg-secondary border border-border flex flex-col min-w-[85px]">
                            <span className="text-base font-bold text-foreground">
                              {holidayCount}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-medium">
                              Holiday
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Desktop Attendance Table */}
                      <div className="hidden sm:block max-h-72 overflow-y-auto border border-border rounded-xl">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold sticky top-0 bg-card z-10">
                            <tr>
                              <th className="px-3.5 py-2.5">Employee</th>
                              <th className="px-3.5 py-2.5">Employee Code</th>
                              <th className="px-3.5 py-2.5">Status</th>
                              <th className="px-3.5 py-2.5">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {isFallbackLoading ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="p-4 text-center text-muted-foreground italic"
                                >
                                  Loading workforce employee records...
                                </td>
                              </tr>
                            ) : records.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="p-4 text-center text-muted-foreground italic"
                                >
                                  Bulk attendance recorded for {totalCount} active workforce employees.
                                </td>
                              </tr>
                            ) : (
                              records.map((r, idx) => {
                                const isLeave = r.isLeave || r.status === "LEAVE";
                                return (
                                  <tr
                                    key={r.employeeId || idx}
                                    className="hover:bg-secondary/30"
                                  >
                                    <td className="px-3.5 py-2.5 font-semibold text-foreground">
                                      {r.employeeName || "Employee"}
                                    </td>
                                    <td className="px-3.5 py-2.5 text-muted-foreground font-mono text-[11px]">
                                      {r.employeeCode || "—"}
                                    </td>
                                    <td className="px-3.5 py-2.5">
                                      <Badge
                                        variant={
                                          r.status === "PRESENT"
                                            ? "success"
                                            : r.status === "ABSENT"
                                            ? "danger"
                                            : r.status === "HALF_DAY"
                                            ? "warning"
                                            : r.status === "LEAVE"
                                            ? "primary"
                                            : "neutral"
                                        }
                                        showDot
                                      >
                                        {r.status?.replace("_", " ") || "PRESENT"}
                                      </Badge>
                                    </td>
                                    <td className="px-3.5 py-2.5">
                                      {isLeave ? (
                                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                                          <Lock className="w-3.5 h-3.5" />
                                          <span>
                                            Approved Leave{" "}
                                            {r.leaveTypeName ? `(${r.leaveTypeName})` : ""}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">
                                          {r.remarks || "—"}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Stacked Employee Cards */}
                      <div className="block sm:hidden space-y-2 max-h-72 overflow-y-auto">
                        {records.length === 0 ? (
                          <div className="p-3 text-center rounded-xl bg-secondary/30 text-muted-foreground italic">
                            Bulk attendance recorded for {totalCount} active workforce employees.
                          </div>
                        ) : (
                          records.map((r, idx) => {
                            const isLeave = r.isLeave || r.status === "LEAVE";
                            return (
                              <div
                                key={r.employeeId || idx}
                                className="p-3 rounded-xl border border-border bg-card space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="font-semibold text-foreground text-xs">
                                    {r.employeeName || "Employee"}
                                  </div>
                                  <Badge
                                    variant={
                                      r.status === "PRESENT"
                                        ? "success"
                                        : r.status === "ABSENT"
                                        ? "danger"
                                        : r.status === "HALF_DAY"
                                        ? "warning"
                                        : r.status === "LEAVE"
                                        ? "primary"
                                        : "neutral"
                                    }
                                    showDot
                                  >
                                    {r.status?.replace("_", " ") || "PRESENT"}
                                  </Badge>
                                </div>
                                <div className="text-[11px] text-muted-foreground font-mono">
                                  {r.employeeCode || "—"}
                                </div>
                                {isLeave ? (
                                  <div className="text-[11px] flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium pt-1">
                                    <Lock className="w-3 h-3" />
                                    <span>
                                      Approved Leave{" "}
                                      {r.leaveTypeName ? `(${r.leaveTypeName})` : ""}
                                    </span>
                                  </div>
                                ) : r.remarks ? (
                                  <div className="text-[11px] text-muted-foreground pt-1">
                                    {r.remarks}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* General Human-Readable Key-Value Grid for Other Events */
              <div className="space-y-3">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Event Details
                </div>
                {cleanMetadata ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-card border border-border">
                    {Object.entries(cleanMetadata).map(([key, val]) => {
                      if (val === null || val === undefined) return null;
                      const formattedVal =
                        typeof val === "boolean"
                          ? val
                            ? "Yes"
                            : "No"
                          : typeof val === "object"
                          ? JSON.stringify(val)
                          : String(val);

                      return (
                        <div key={key} className="space-y-0.5">
                          <span className="text-[11px] text-muted-foreground font-medium block">
                            {formatMetadataKeyLabel(key)}
                          </span>
                          <span className="font-semibold text-foreground text-xs block truncate">
                            {formattedVal}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center rounded-xl bg-secondary/30 text-muted-foreground text-xs italic border border-dashed border-border">
                    No additional parameters recorded for this event.
                  </div>
                )}
              </div>
            )}

            {/* Footer Summary & Close */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Completed successfully</span>
              </div>
              <Button variant="ghost" onClick={() => setInspectLog(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}

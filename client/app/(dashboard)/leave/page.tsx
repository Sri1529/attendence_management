"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Can } from "@/components/auth/can";
import { useToast } from "@/hooks/use-toast";
import { useQueryParams } from "@/hooks/use-query-params";
import { leaveRecordsApi } from "@/lib/api/leave-records";
import { leaveTypesApi } from "@/lib/api/leave-types";
import { employeesApi } from "@/lib/api/employees";
import { LeaveRecord, LeaveStatus, LeaveType } from "@/types/leave";
import { Employee, PaginatedResponse } from "@/types/organization";
import { PermissionCode } from "@/lib/permissions/codes";
import { formatDurationDate } from "@/lib/utils/format-date";
import { Plus, Check, X, Ban, AlertCircle, User, Lock } from "lucide-react";

export default function LeaveRecordsPage() {
  const { toast } = useToast();
  const { getIntParam, getParam, setParam, setParams } = useQueryParams();

  const page = getIntParam("page", 1);
  const limit = getIntParam("limit", 20);
  const search = getParam("search", "");
  const employeeId = getParam("employeeId", "");
  const status = getParam("status", "") as LeaveStatus | "";

  const [dataResponse, setDataResponse] = useState<PaginatedResponse<LeaveRecord> | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Leave Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [newLeaveTypeId, setNewLeaveTypeId] = useState("");
  const [newStartDate, setNewStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newEndDate, setNewEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newIsPaidOverride, setNewIsPaidOverride] = useState<"default" | "paid" | "unpaid">("default");
  const [newRemarks, setNewRemarks] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Status Action State (Approve / Reject / Cancel)
  const [targetRecord, setTargetRecord] = useState<{
    record: LeaveRecord;
    action: LeaveStatus;
  } | null>(null);

  useEffect(() => {
    employeesApi.list({ limit: 100 }).then((res) => setEmployees(res.data)).catch(() => null);
    leaveTypesApi.list({ limit: 100 }).then((res) => setLeaveTypes(res.data.filter((t) => t.status === "ACTIVE"))).catch(() => null);
  }, []);

  const fetchLeaveRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await leaveRecordsApi.list({
        page,
        limit,
        search,
        employeeId: employeeId || undefined,
        status: status || undefined,
      });
      setDataResponse(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load leave records.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, employeeId, status]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await leaveRecordsApi.list({
          page,
          limit,
          search,
          employeeId: employeeId || undefined,
          status: status || undefined,
        });
        if (isMounted) setDataResponse(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load leave records.";
        if (isMounted) setError(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [page, limit, search, employeeId, status]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newEmployeeId || !newLeaveTypeId || !newStartDate || !newEndDate) {
      setCreateError("Please fill in all required fields (Employee, Leave Type, Start Date, End Date).");
      return;
    }

    if (newStartDate > newEndDate) {
      setCreateError("Start date cannot be after end date.");
      return;
    }

    const isPaidPayload = newIsPaidOverride === "default"
      ? null
      : newIsPaidOverride === "paid";

    setIsCreating(true);
    try {
      await leaveRecordsApi.create({
        employeeId: newEmployeeId,
        leaveTypeId: newLeaveTypeId,
        startDate: newStartDate,
        endDate: newEndDate,
        is_paid: isPaidPayload,
        remarks: newRemarks.trim() || undefined,
      });
      toast.success("Leave Request Created", "Leave request was submitted successfully.");
      setIsCreateOpen(false);
      setNewEmployeeId("");
      setNewLeaveTypeId("");
      setNewIsPaidOverride("default");
      setNewRemarks("");
      fetchLeaveRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit leave request.";
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async () => {
    if (!targetRecord) return;
    const { record, action } = targetRecord;

    try {
      await leaveRecordsApi.updateStatus(record.id, action);
      toast.success("Status Updated", `Leave request status changed to ${action}.`);
      setTargetRecord(null);
      fetchLeaveRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update leave status.";
      toast.error("Status Update Failed", msg);
    }
  };

  const statusBadgeVariant = (s: LeaveStatus) => {
    switch (s) {
      case LeaveStatus.APPROVED:
        return "success";
      case LeaveStatus.PENDING:
        return "warning";
      case LeaveStatus.REJECTED:
        return "danger";
      case LeaveStatus.CANCELLED:
        return "neutral";
      default:
        return "neutral";
    }
  };

  const columns: ColumnDef<LeaveRecord>[] = [
    {
      header: "Employee",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-full bg-primary/10 text-primary">
            <User className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-semibold text-foreground">
              {row.employee?.first_name} {row.employee?.last_name}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground">
              {row.employee?.employee_code}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Leave Type",
      cell: (row) => (
        <span className="font-medium text-foreground">
          {row.leave_type?.name || "Leave"}
        </span>
      ),
    },
    {
      header: "Salary Treatment",
      cell: (row) => {
        if (row.is_paid === true) {
          return <Badge variant="success">Paid (Override)</Badge>;
        }
        if (row.is_paid === false) {
          return <Badge variant="warning">Unpaid (Override)</Badge>;
        }
        const defaultIsPaid = row.leave_type?.is_paid !== false;
        return (
          <Badge variant={defaultIsPaid ? "success" : "warning"}>
            {defaultIsPaid ? "Paid (Default)" : "Unpaid (Default)"}
          </Badge>
        );
      },
    },
    {
      header: "Duration",
      cell: (row) => {
        const startFormatted = formatDurationDate(row.start_date);
        const endFormatted = formatDurationDate(row.end_date);
        return (
          <div className="text-xs text-foreground font-medium font-mono">
            {row.start_date === row.end_date ? (
              startFormatted
            ) : (
              <>
                {startFormatted} <span className="text-muted-foreground font-sans">to</span> {endFormatted}
              </>
            )}
          </div>
        );
      },
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge variant={statusBadgeVariant(row.status)} showDot>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Remarks",
      cell: (row) => (
        <span className="text-muted-foreground truncate max-w-xs block">
          {row.remarks || "—"}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: (row) => {
        if (row.isPayrollLocked) {
          if (row.payrollLockStatus === "PAID") {
            return (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                title={row.payrollLockMessage || "This leave is part of a paid payroll and cannot be modified."}
              >
                <Lock className="w-3 h-3 shrink-0 text-amber-500" />
                <span>Locked — Paid Payroll</span>
              </span>
            );
          }
          if (row.payrollLockStatus === "FINALIZED") {
            return (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                title={row.payrollLockMessage || "This leave is part of a finalized payroll. Reopen the payroll for correction before changing it."}
              >
                <Lock className="w-3 h-3 shrink-0 text-slate-500" />
                <span>Locked by Payroll</span>
              </span>
            );
          }
        }

        return (
          <div className="flex items-center gap-1">
            <Can permission={PermissionCode.LEAVE_UPDATE}>
              {row.status === LeaveStatus.PENDING && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px] text-emerald-500 hover:bg-emerald-500/10"
                    onClick={() => setTargetRecord({ record: row, action: LeaveStatus.APPROVED })}
                  >
                    <Check className="w-3 h-3 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px] text-red-500 hover:bg-red-500/10"
                    onClick={() => setTargetRecord({ record: row, action: LeaveStatus.REJECTED })}
                  >
                    <X className="w-3 h-3 mr-1" /> Reject
                  </Button>
                </>
              )}

              {(row.status === LeaveStatus.PENDING || row.status === LeaveStatus.APPROVED) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:bg-secondary"
                  onClick={() => setTargetRecord({ record: row, action: LeaveStatus.CANCELLED })}
                >
                  <Ban className="w-3 h-3 mr-1" /> Cancel
                </Button>
              )}
            </Can>
          </div>
        );
      },
    },
  ];

  return (
    <PageContainer maxWidth="xl" className="py-6">
      <PageHeader
        title="Leave Records"
        description="Manage employee leave requests, approvals, rejections, and leave history."
        actions={
          <Can permission={PermissionCode.LEAVE_CREATE}>
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateOpen(true)}
            >
              Apply for Leave
            </Button>
          </Can>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => setParams({ search: val, page: 1 })}
        filters={[
          {
            key: "employeeId",
            label: "Employee",
            value: employeeId,
            options: employees.map((e) => ({
              value: e.id,
              label: `${e.first_name} ${e.last_name} (${e.employee_code})`,
            })),
          },
          {
            key: "status",
            label: "Status",
            value: status,
            options: [
              { value: LeaveStatus.PENDING, label: "PENDING" },
              { value: LeaveStatus.APPROVED, label: "APPROVED" },
              { value: LeaveStatus.REJECTED, label: "REJECTED" },
              { value: LeaveStatus.CANCELLED, label: "CANCELLED" },
            ],
          },
        ]}
        onFilterChange={(key, val) => setParams({ [key]: val, page: 1 })}
        onClearAll={() => setParams({ search: "", employeeId: "", status: "", page: 1 })}
      />

      <DataTable
        columns={columns}
        data={dataResponse?.data || []}
        isLoading={isLoading}
        error={error}
        emptyTitle="No leave records found"
        emptyDescription="Create your company's first leave request using the button above."
        pagination={{
          page,
          limit,
          total: dataResponse?.meta.total || 0,
          totalPages: dataResponse?.meta.totalPages || 1,
          onPageChange: (p) => setParam("page", p),
          onLimitChange: (l) => setParams({ limit: l, page: 1 }),
        }}
      />

      {/* New Leave Request Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Apply for Leave"
        description="Submit a new employee leave request."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <Select
            label="Employee"
            required
            placeholder="Select Employee"
            value={newEmployeeId}
            onChange={(e) => setNewEmployeeId(e.target.value)}
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.first_name} ${e.last_name} (${e.employee_code})`,
            }))}
          />

          <Select
            label="Leave Type"
            required
            placeholder="Select Leave Category"
            value={newLeaveTypeId}
            onChange={(e) => setNewLeaveTypeId(e.target.value)}
            options={leaveTypes.map((t) => ({
              value: t.id,
              label: t.name,
            }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              required
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              required
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Salary Treatment Override
            </label>
            <select
              value={newIsPaidOverride}
              onChange={(e) => setNewIsPaidOverride(e.target.value as "default" | "paid" | "unpaid")}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="default">Use Leave Type Default Policy</option>
              <option value="paid">Explicitly Paid Leave (No deduction)</option>
              <option value="unpaid">Explicitly Unpaid Leave (Deduct from salary)</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              Allows overriding the standard paid/unpaid setting of the leave type for this specific request.
            </p>
          </div>

          <Textarea
            label="Reason / Remarks (Optional)"
            placeholder="Additional details for leave request..."
            rows={3}
            value={newRemarks}
            onChange={(e) => setNewRemarks(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isCreating}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialogs for Status Actions */}
      <ConfirmationDialog
        isOpen={!!targetRecord}
        onClose={() => setTargetRecord(null)}
        title={`${targetRecord?.action} Leave Request?`}
        description={
          targetRecord?.action === LeaveStatus.APPROVED
            ? `Approve leave for ${targetRecord?.record.employee?.first_name} ${targetRecord?.record.employee?.last_name} (${formatDurationDate(targetRecord?.record.start_date)}${targetRecord?.record.start_date === targetRecord?.record.end_date ? "" : ` to ${formatDurationDate(targetRecord?.record.end_date)}`})?`
            : targetRecord?.action === LeaveStatus.REJECTED
            ? `Reject leave request for ${targetRecord?.record.employee?.first_name} ${targetRecord?.record.employee?.last_name}?`
            : `Cancel leave request for ${targetRecord?.record.employee?.first_name} ${targetRecord?.record.employee?.last_name}?`
        }
        confirmText={
          targetRecord?.action === LeaveStatus.APPROVED
            ? "Approve"
            : targetRecord?.action === LeaveStatus.REJECTED
            ? "Reject"
            : "Cancel Leave"
        }
        variant={
          targetRecord?.action === LeaveStatus.APPROVED
            ? "primary"
            : targetRecord?.action === LeaveStatus.REJECTED
            ? "danger"
            : "warning"
        }
        onConfirm={handleStatusChange}
      />
    </PageContainer>
  );
}

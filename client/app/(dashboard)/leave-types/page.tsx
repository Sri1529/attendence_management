"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Can } from "@/components/auth/can";
import { useToast } from "@/hooks/use-toast";
import { useQueryParams } from "@/hooks/use-query-params";
import { leaveTypesApi } from "@/lib/api/leave-types";
import { LeaveType, LeaveTypeStatus } from "@/types/leave";
import { PaginatedResponse } from "@/types/organization";
import { PermissionCode } from "@/lib/permissions/codes";
import { Plus, Edit2, Power, AlertCircle, ListTree } from "lucide-react";

export default function LeaveTypesPage() {
  const { toast } = useToast();
  const { getIntParam, getParam, setParam, setParams } = useQueryParams();

  const page = getIntParam("page", 1);
  const limit = getIntParam("limit", 20);
  const search = getParam("search", "");

  const [dataResponse, setDataResponse] = useState<PaginatedResponse<LeaveType> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createIsPaid, setCreateIsPaid] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Edit Modal State
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsPaid, setEditIsPaid] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Status Change State
  const [statusType, setStatusType] = useState<LeaveType | null>(null);

  const fetchLeaveTypes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await leaveTypesApi.list({ page, limit, search });
      setDataResponse(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load leave types.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await leaveTypesApi.list({ page, limit, search });
        if (isMounted) setDataResponse(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load leave types.";
        if (isMounted) setError(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [page, limit, search]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createName.trim()) {
      setCreateError("Leave type name is required.");
      return;
    }

    setIsCreating(true);
    try {
      await leaveTypesApi.create({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
        is_paid: createIsPaid,
      });
      toast.success("Leave Type Created", `"${createName}" was added successfully.`);
      setIsCreateOpen(false);
      setCreateName("");
      setCreateDescription("");
      setCreateIsPaid(true);
      fetchLeaveTypes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create leave type.";
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditOpen = (lt: LeaveType) => {
    setEditingType(lt);
    setEditName(lt.name);
    setEditDescription(lt.description || "");
    setEditIsPaid(lt.is_paid !== undefined ? lt.is_paid : true);
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError("Leave type name is required.");
      return;
    }

    setIsUpdating(true);
    try {
      await leaveTypesApi.update(editingType.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        is_paid: editIsPaid,
      });
      toast.success("Leave Type Updated", `"${editName}" details were updated.`);
      setEditingType(null);
      fetchLeaveTypes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update leave type.";
      setEditError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!statusType) return;
    const newStatus =
      statusType.status === LeaveTypeStatus.ACTIVE
        ? LeaveTypeStatus.INACTIVE
        : LeaveTypeStatus.ACTIVE;

    try {
      await leaveTypesApi.updateStatus(statusType.id, newStatus);
      toast.success("Status Changed", `Leave type "${statusType.name}" is now ${newStatus}.`);
      setStatusType(null);
      fetchLeaveTypes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change status.";
      toast.error("Status Change Failed", msg);
    }
  };

  const columns: ColumnDef<LeaveType>[] = [
    {
      header: "Leave Type Name",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <ListTree className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{row.name}</div>
            {row.description && (
              <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                {row.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Salary Treatment",
      cell: (row) => (
        <Badge variant={row.is_paid !== false ? "success" : "warning"}>
          {row.is_paid !== false ? "Paid Leave" : "Unpaid Leave"}
        </Badge>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge variant={row.status === LeaveTypeStatus.ACTIVE ? "success" : "neutral"} showDot>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Created Date",
      cell: (row) => (
        <span className="text-muted-foreground">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Can permission={PermissionCode.LEAVE_UPDATE}>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => handleEditOpen(row)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={`h-8 px-2.5 text-xs font-medium ${
                row.status === LeaveTypeStatus.ACTIVE
                  ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                  : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              }`}
              leftIcon={<Power className="w-3.5 h-3.5" />}
              onClick={() => setStatusType(row)}
            >
              {row.status === LeaveTypeStatus.ACTIVE ? "Deactivate" : "Activate"}
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  return (
    <PageContainer maxWidth="xl" className="py-6">
      <PageHeader
        title="Leave Types"
        description="Configure paid and unpaid leave policy categories for your company."
        actions={
          <Can permission={PermissionCode.LEAVE_CREATE}>
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateOpen(true)}
            >
              Create Leave Type
            </Button>
          </Can>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => setParams({ search: val, page: 1 })}
        onClearAll={() => setParams({ search: "", page: 1 })}
      />

      <DataTable
        columns={columns}
        data={dataResponse?.data || []}
        isLoading={isLoading}
        error={error}
        emptyTitle="No leave types found"
        emptyDescription="Create your company's first leave category (e.g. Annual Leave, Sick Leave)."
        pagination={{
          page,
          limit,
          total: dataResponse?.meta.total || 0,
          totalPages: dataResponse?.meta.totalPages || 1,
          onPageChange: (p) => setParam("page", p),
          onLimitChange: (l) => setParams({ limit: l, page: 1 }),
        }}
      />

      {/* Create Leave Type Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Leave Type"
        description="Define a new leave category for your company."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <Input
            label="Leave Type Name"
            required
            placeholder="e.g. Paid Time Off, Sick Leave, Maternity Leave"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Salary Treatment Policy
            </label>
            <select
              value={createIsPaid ? "paid" : "unpaid"}
              onChange={(e) => setCreateIsPaid(e.target.value === "paid")}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="paid">Paid Leave (No salary deduction)</option>
              <option value="unpaid">Unpaid Leave (Deducts basic salary per day)</option>
            </select>
          </div>

          <Textarea
            label="Description (Optional)"
            placeholder="Overview of entitlement or policy rules..."
            rows={3}
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
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
              Save Leave Type
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Leave Type Modal */}
      <Modal
        isOpen={!!editingType}
        onClose={() => setEditingType(null)}
        title="Edit Leave Type"
        description="Update leave category details."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <Input
            label="Leave Type Name"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Salary Treatment Policy
            </label>
            <select
              value={editIsPaid ? "paid" : "unpaid"}
              onChange={(e) => setEditIsPaid(e.target.value === "paid")}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="paid">Paid Leave (No salary deduction)</option>
              <option value="unpaid">Unpaid Leave (Deducts basic salary per day)</option>
            </select>
          </div>

          <Textarea
            label="Description (Optional)"
            rows={3}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingType(null)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isUpdating}>
              Update Leave Type
            </Button>
          </div>
        </form>
      </Modal>

      {/* Status Confirmation */}
      <ConfirmationDialog
        isOpen={!!statusType}
        onClose={() => setStatusType(null)}
        title={
          statusType?.status === LeaveTypeStatus.ACTIVE
            ? "Deactivate Leave Type?"
            : "Activate Leave Type?"
        }
        description={
          statusType?.status === LeaveTypeStatus.ACTIVE
            ? `Deactivating "${statusType?.name}" will prevent selecting it for new leave requests.`
            : `Activating "${statusType?.name}" will allow employees to request this leave type.`
        }
        confirmText={statusType?.status === LeaveTypeStatus.ACTIVE ? "Deactivate" : "Activate"}
        variant={statusType?.status === LeaveTypeStatus.ACTIVE ? "warning" : "primary"}
        onConfirm={handleStatusToggle}
      />
    </PageContainer>
  );
}

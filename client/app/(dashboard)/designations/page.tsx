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
import { designationsApi } from "@/lib/api/designations";
import { Designation, DesignationStatus, PaginatedResponse } from "@/types/organization";
import { PermissionCode } from "@/lib/permissions/codes";
import { Plus, Edit2, Power, AlertCircle, Briefcase } from "lucide-react";

export default function DesignationsPage() {
  const { toast } = useToast();
  const { getIntParam, getParam, setParam, setParams } = useQueryParams();

  const page = getIntParam("page", 1);
  const limit = getIntParam("limit", 20);
  const search = getParam("search", "");

  const [dataResponse, setDataResponse] = useState<PaginatedResponse<Designation> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Edit Modal State
  const [editingDesg, setEditingDesg] = useState<Designation | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Status Change Confirmation State
  const [statusDesg, setStatusDesg] = useState<Designation | null>(null);

  const fetchDesignations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await designationsApi.list({ page, limit, search });
      setDataResponse(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load designations";
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
        const res = await designationsApi.list({ page, limit, search });
        if (isMounted) setDataResponse(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load designations";
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
      setCreateError("Designation name is required.");
      return;
    }

    setIsCreating(true);
    try {
      await designationsApi.create({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
      });
      toast.success("Designation Created", `"${createName}" was added successfully.`);
      setIsCreateOpen(false);
      setCreateName("");
      setCreateDescription("");
      fetchDesignations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create designation.";
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditOpen = (desg: Designation) => {
    setEditingDesg(desg);
    setEditName(desg.name);
    setEditDescription(desg.description || "");
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDesg) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError("Designation name is required.");
      return;
    }

    setIsUpdating(true);
    try {
      await designationsApi.update(editingDesg.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      toast.success("Designation Updated", `"${editName}" details were updated.`);
      setEditingDesg(null);
      fetchDesignations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update designation.";
      setEditError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!statusDesg) return;
    const newStatus =
      statusDesg.status === DesignationStatus.ACTIVE
        ? DesignationStatus.INACTIVE
        : DesignationStatus.ACTIVE;

    try {
      await designationsApi.updateStatus(statusDesg.id, newStatus);
      toast.success(
        "Status Changed",
        `Designation "${statusDesg.name}" is now ${newStatus}.`
      );
      setStatusDesg(null);
      fetchDesignations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change designation status.";
      toast.error("Status Change Failed", msg);
    }
  };

  const columns: ColumnDef<Designation>[] = [
    {
      header: "Designation Title",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Briefcase className="w-4 h-4" />
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
      header: "Status",
      cell: (row) => (
        <Badge variant={row.status === DesignationStatus.ACTIVE ? "success" : "neutral"} showDot>
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
          <Can permission={PermissionCode.DESIGNATION_UPDATE}>
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
                row.status === DesignationStatus.ACTIVE
                  ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                  : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              }`}
              leftIcon={<Power className="w-3.5 h-3.5" />}
              onClick={() => setStatusDesg(row)}
            >
              {row.status === DesignationStatus.ACTIVE ? "Deactivate" : "Activate"}
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  return (
    <PageContainer maxWidth="xl" className="py-6">
      <PageHeader
        title="Designations"
        description="Manage job titles and designation roles for employees in your organization."
        actions={
          <Can permission={PermissionCode.DESIGNATION_CREATE}>
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateOpen(true)}
            >
              Create Designation
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
        emptyTitle="No designations found"
        emptyDescription="Create your company's first designation role using the button above."
        pagination={{
          page,
          limit,
          total: dataResponse?.meta.total || 0,
          totalPages: dataResponse?.meta.totalPages || 1,
          onPageChange: (p) => setParam("page", p),
          onLimitChange: (l) => setParams({ limit: l, page: 1 }),
        }}
      />

      {/* Create Designation Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Designation"
        description="Add a new job title role for company employees."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <Input
            label="Designation Title"
            required
            placeholder="e.g. Senior Software Engineer, HR Manager, Accountant"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />

          <Textarea
            label="Description (Optional)"
            placeholder="Brief overview of role responsibilities..."
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
              Save Designation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Designation Modal */}
      <Modal
        isOpen={!!editingDesg}
        onClose={() => setEditingDesg(null)}
        title="Edit Designation"
        description="Update details for this designation role."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <Input
            label="Designation Title"
            required
            placeholder="Designation Title"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />

          <Textarea
            label="Description (Optional)"
            placeholder="Brief description..."
            rows={3}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingDesg(null)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isUpdating}>
              Update Designation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Status Toggle Confirmation */}
      <ConfirmationDialog
        isOpen={!!statusDesg}
        onClose={() => setStatusDesg(null)}
        title={
          statusDesg?.status === DesignationStatus.ACTIVE
            ? "Deactivate Designation?"
            : "Activate Designation?"
        }
        description={
          statusDesg?.status === DesignationStatus.ACTIVE
            ? `Deactivating "${statusDesg?.name}" may prevent assigning it to new employees. Existing employee records will remain intact.`
            : `Activating "${statusDesg?.name}" will allow assigning it to company employees.`
        }
        confirmText={
          statusDesg?.status === DesignationStatus.ACTIVE ? "Deactivate" : "Activate"
        }
        variant={statusDesg?.status === DesignationStatus.ACTIVE ? "warning" : "primary"}
        onConfirm={handleStatusToggle}
      />
    </PageContainer>
  );
}

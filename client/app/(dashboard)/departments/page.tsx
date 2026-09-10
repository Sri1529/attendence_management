"use client";

import React, { useState, useEffect } from "react";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Can } from "@/components/auth/can";
import { useToast } from "@/hooks/use-toast";
import { useQueryParams } from "@/hooks/use-query-params";
import { departmentsApi } from "@/lib/api/departments";
import { Department, DepartmentStatus, PaginatedResponse } from "@/types/organization";
import { PermissionCode } from "@/lib/permissions/codes";
import { Plus, Edit2, Ban, Building2 } from "lucide-react";

export default function DepartmentsPage() {
  const { toast } = useToast();
  const { getIntParam, getParam, setParam, setParams } = useQueryParams();

  const page = getIntParam("page", 1);
  const limit = getIntParam("limit", 20);
  const search = getParam("search", "");

  const [dataResponse, setDataResponse] = useState<PaginatedResponse<Department> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editDepartment, setEditDepartment] = useState<Department | null>(null);
  const [statusDepartment, setStatusDepartment] = useState<Department | null>(null);

  // Form States
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await departmentsApi.list({ page, limit, search });
        if (isMounted) setDataResponse(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load departments";
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

  const fetchDepartments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await departmentsApi.list({ page, limit, search });
      setDataResponse(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load departments";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setName("");
    setDescription("");
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditDepartment(dept);
    setName(dept.name);
    setDescription(dept.description || "");
    setFormError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await departmentsApi.create({
        name,
        description: description || undefined,
      });
      toast.success("Department Created", `Department '${name}' has been created.`);
      setIsCreateOpen(false);
      fetchDepartments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create department";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDepartment) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await departmentsApi.update(editDepartment.id, {
        name,
        description: description || undefined,
      });
      toast.success("Department Updated", `Department '${name}' updated.`);
      setEditDepartment(null);
      fetchDepartments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update department";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggleConfirm = async () => {
    if (!statusDepartment) return;
    const nextStatus =
      statusDepartment.status === DepartmentStatus.ACTIVE
        ? DepartmentStatus.INACTIVE
        : DepartmentStatus.ACTIVE;

    try {
      await departmentsApi.updateStatus(statusDepartment.id, nextStatus);
      toast.success(
        "Department Status Updated",
        `Department '${statusDepartment.name}' is now ${nextStatus}.`
      );
      setStatusDepartment(null);
      fetchDepartments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update department status";
      toast.error("Update Failed", msg);
    }
  };

  const columns: ColumnDef<Department>[] = [
    {
      header: "Department Name",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary shrink-0" />
          <span className="font-semibold text-foreground text-xs">{row.name}</span>
        </div>
      ),
    },
    {
      header: "Description",
      cell: (row) => (
        <span className="text-xs text-muted-foreground truncate max-w-xs block">
          {row.description || "—"}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge variant={row.status === DepartmentStatus.ACTIVE ? "success" : "neutral"} showDot>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Can permission={PermissionCode.DEPARTMENT_UPDATE}>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => handleOpenEdit(row)}
            >
              Edit
            </Button>
          </Can>
          <Can permission={PermissionCode.DEPARTMENT_UPDATE}>
            <Button
              size="sm"
              variant="ghost"
              className={`h-8 px-2.5 text-xs font-medium ${
                row.status === DepartmentStatus.ACTIVE
                  ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                  : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              }`}
              leftIcon={<Ban className="w-3.5 h-3.5" />}
              onClick={() => setStatusDepartment(row)}
            >
              {row.status === DepartmentStatus.ACTIVE ? "Deactivate" : "Activate"}
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  return (
    <PageContainer maxWidth="xl" className="py-6 space-y-6">
      <PageHeader
        title="Departments"
        description="Organize company workforce units, teams, and organizational divisions."
        actions={
          <Can permission={PermissionCode.DEPARTMENT_CREATE}>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreate}
            >
              Create Department
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
        emptyTitle="No departments found"
        emptyDescription="Create your company's first department to group employees."
        pagination={{
          page,
          limit,
          total: dataResponse?.meta.total || 0,
          totalPages: dataResponse?.meta.totalPages || 1,
          onPageChange: (p) => setParam("page", p),
          onLimitChange: (l) => setParams({ limit: l, page: 1 }),
        }}
      />

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Department"
        description="Add a new organizational unit to your company."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-danger/10 text-danger text-xs font-medium">
              {formError}
            </div>
          )}
          <Input
            label="Department Name"
            placeholder="e.g. Engineering"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Textarea
            label="Description (Optional)"
            placeholder="Department responsibilities..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create Department
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editDepartment}
        onClose={() => setEditDepartment(null)}
        title="Edit Department"
        description={`Update department parameters for ${editDepartment?.name}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-danger/10 text-danger text-xs font-medium">
              {formError}
            </div>
          )}
          <Input
            label="Department Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Textarea
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditDepartment(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Status Toggle Confirmation */}
      <ConfirmationDialog
        isOpen={!!statusDepartment}
        onClose={() => setStatusDepartment(null)}
        onConfirm={handleStatusToggleConfirm}
        title="Toggle Department Status"
        description={`Are you sure you want to ${
          statusDepartment?.status === DepartmentStatus.ACTIVE ? "deactivate" : "activate"
        } department '${statusDepartment?.name}'?`}
        confirmText="Confirm Status Change"
        variant={statusDepartment?.status === DepartmentStatus.ACTIVE ? "danger" : "primary"}
      />
    </PageContainer>
  );
}

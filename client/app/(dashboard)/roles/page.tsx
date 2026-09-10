"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { rolesApi } from "@/lib/api/roles";
import { Role, RoleStatus } from "@/types/roles";
import { PermissionCode } from "@/lib/permissions/codes";
import { Plus, Edit2, Shield, Lock, Trash2, ArrowRight, AlertCircle, Ban } from "lucide-react";

export default function RolesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { getIntParam, getParam, setParam, setParams } = useQueryParams();

  const page = getIntParam("page", 1);
  const limit = getIntParam("limit", 20);
  const search = getParam("search", "");

  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Role Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Edit Role Modal
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Delete & Status Dialogs
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);
  const [statusRole, setStatusRole] = useState<Role | null>(null);

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await rolesApi.findAll();
      setRoles(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load company roles.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await rolesApi.findAll();
        if (isMounted) setRoles(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load company roles.";
        if (isMounted) setError(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered Roles
  const filteredRoles = roles.filter(
    (r) =>
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
  );

  const paginatedRoles = filteredRoles.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(filteredRoles.length / limit) || 1;

  // Handle Add Role
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!addName.trim()) {
      setAddError("Role name is required.");
      return;
    }

    setIsAdding(true);
    try {
      await rolesApi.create({
        name: addName.trim(),
        description: addDescription.trim() || undefined,
      });
      toast.success("Role Created", `Created custom role '${addName.trim()}'.`);
      setIsAddOpen(false);
      setAddName("");
      setAddDescription("");
      fetchRoles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create role.";
      setAddError(msg);
    } finally {
      setIsAdding(false);
    }
  };

  // Handle Edit Role
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    setEditError(null);

    setIsEditing(true);
    try {
      await rolesApi.update(editingRole.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      toast.success("Role Updated", `Updated role '${editName.trim()}'.`);
      setEditingRole(null);
      fetchRoles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update role.";
      setEditError(msg);
    } finally {
      setIsEditing(false);
    }
  };

  // Handle Toggle Status
  const handleToggleStatus = async () => {
    if (!statusRole) return;
    const nextStatus =
      statusRole.status === RoleStatus.ACTIVE ? RoleStatus.INACTIVE : RoleStatus.ACTIVE;

    try {
      await rolesApi.updateStatus(statusRole.id, nextStatus);
      toast.success("Role Status Updated", `Role '${statusRole.name}' status set to ${nextStatus}.`);
      setStatusRole(null);
      fetchRoles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update role status.";
      toast.error("Action Rejected", msg);
    }
  };

  // Handle Delete Role
  const handleDeleteRole = async () => {
    if (!deleteRole) return;
    try {
      await rolesApi.remove(deleteRole.id);
      toast.success("Role Deleted", `Custom role '${deleteRole.name}' was removed.`);
      setDeleteRole(null);
      fetchRoles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete role.";
      toast.error("Deletion Rejected", msg);
    }
  };

  const columns: ColumnDef<Role>[] = [
    {
      header: "Role Name",
      cell: (row) => (
        <div>
          <div className="font-bold text-foreground flex items-center gap-1.5">
            {row.name}
            {row.is_system && (
              <Badge variant="primary" className="text-[10px] py-0 px-1.5">
                <Lock className="w-3 h-3 mr-1" /> System Role
              </Badge>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground">{row.description || "No description"}</div>
        </div>
      ),
    },
    {
      header: "Type",
      cell: (row) => (
        <Badge variant={row.is_system ? "primary" : "neutral"}>
          {row.is_system ? "System Role" : "Custom Role"}
        </Badge>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge variant={row.status === RoleStatus.ACTIVE ? "success" : "neutral"} showDot>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Permissions",
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {row.permissions ? `${row.permissions.length} Assigned` : "—"}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="primary"
            className="h-8 px-2.5 text-xs font-medium"
            leftIcon={<Shield className="w-3.5 h-3.5" />}
            rightIcon={<ArrowRight className="w-3 h-3" />}
            onClick={() => router.push(`/roles/${row.id}/permissions`)}
          >
            Permissions
          </Button>

          <Can permission={PermissionCode.ROLE_UPDATE}>
            {!row.is_system && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  setEditingRole(row);
                  setEditName(row.name);
                  setEditDescription(row.description || "");
                  setEditError(null);
                }}
              >
                Edit
              </Button>
            )}
          </Can>

          <Can permission={PermissionCode.ROLE_UPDATE}>
            {!row.is_system && (
              <Button
                size="sm"
                variant="ghost"
                className={`h-8 px-2.5 text-xs font-medium ${
                  row.status === RoleStatus.ACTIVE
                    ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                    : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                }`}
                leftIcon={<Ban className="w-3.5 h-3.5" />}
                onClick={() => setStatusRole(row)}
              >
                {row.status === RoleStatus.ACTIVE ? "Disable" : "Enable"}
              </Button>
            )}
          </Can>

          <Can permission={PermissionCode.ROLE_DELETE}>
            {!row.is_system && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => setDeleteRole(row)}
              />
            )}
          </Can>
        </div>
      ),
    },
  ];

  return (
    <PageContainer maxWidth="xl" className="py-6">
      <PageHeader
        title="Custom Roles & Permissions"
        description="Define RBAC access roles, inspect system defaults, and configure granular permission matrices."
        actions={
          <Can permission={PermissionCode.ROLE_CREATE}>
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setIsAddOpen(true);
                setAddError(null);
              }}
            >
              Create Custom Role
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
        data={paginatedRoles}
        isLoading={isLoading}
        error={error}
        emptyTitle="No roles found"
        emptyDescription="Create custom company roles to grant targeted administrative access."
        onRowClick={(r) => router.push(`/roles/${r.id}/permissions`)}
        pagination={{
          page,
          limit,
          total: filteredRoles.length,
          totalPages,
          onPageChange: (p) => setParam("page", p),
          onLimitChange: (l) => setParams({ limit: l, page: 1 }),
        }}
      />

      {/* Add Role Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Create Custom Role"
        description="Define a custom access role for your workforce managers."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {addError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <Input
            label="Role Name"
            required
            placeholder="e.g. HR Manager, Payroll Officer"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
          />

          <Textarea
            label="Description (Optional)"
            placeholder="Describe the scope of responsibilities..."
            rows={3}
            value={addDescription}
            onChange={(e) => setAddDescription(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddOpen(false)}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isAdding}>
              Create Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={!!editingRole}
        onClose={() => setEditingRole(null)}
        title="Edit Custom Role"
        description={`Update role definition for ${editingRole?.name}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <Input
            label="Role Name"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />

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
              onClick={() => setEditingRole(null)}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isEditing}>
              Save Role Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Toggle Status Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!statusRole}
        onClose={() => setStatusRole(null)}
        title={statusRole?.status === RoleStatus.ACTIVE ? "Disable Role?" : "Enable Role?"}
        description={`Changing the status of '${statusRole?.name}' will affect users assigned to this role.`}
        confirmText={statusRole?.status === RoleStatus.ACTIVE ? "Disable Role" : "Enable Role"}
        variant={statusRole?.status === RoleStatus.ACTIVE ? "warning" : "primary"}
        onConfirm={handleToggleStatus}
      />

      {/* Delete Role Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteRole}
        onClose={() => setDeleteRole(null)}
        title="Delete Custom Role?"
        description={`Warning: Deleting custom role '${deleteRole?.name}' may affect users assigned to it. System roles are permanently protected.`}
        confirmText="Delete Role"
        variant="danger"
        onConfirm={handleDeleteRole}
      />
    </PageContainer>
  );
}

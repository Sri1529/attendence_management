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
import { Modal } from "@/components/ui/modal";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Can } from "@/components/auth/can";
import { useToast } from "@/hooks/use-toast";
import { useQueryParams } from "@/hooks/use-query-params";
import { usersApi } from "@/lib/api/users";
import { rolesApi } from "@/lib/api/roles";
import { User, UserStatus } from "@/types/users";
import { Role } from "@/types/roles";
import { PermissionCode } from "@/lib/permissions/codes";
import { Plus, Edit2, ShieldAlert, AlertCircle, User as UserIcon } from "lucide-react";

export default function UsersPage() {
  const { toast } = useToast();
  const { getIntParam, getParam, setParam, setParams } = useQueryParams();

  const page = getIntParam("page", 1);
  const limit = getIntParam("limit", 20);
  const search = getParam("search", "");
  const statusFilter = getParam("status", "") as UserStatus | "";

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add User Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRoleId, setAddRoleId] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRoleId, setEditRoleId] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Deactivate Status Confirmation State
  const [statusUser, setStatusUser] = useState<User | null>(null);

  const fetchUsersAndRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [uList, rList] = await Promise.all([
        usersApi.findAll(),
        rolesApi.findAll().catch(() => []),
      ]);
      setUsers(uList);
      setRoles(rList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load company users.";
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
        const [uList, rList] = await Promise.all([
          usersApi.findAll(),
          rolesApi.findAll().catch(() => []),
        ]);
        if (isMounted) {
          setUsers(uList);
          setRoles(rList);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load company users.";
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

  // Filtered users for search & status
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedUsers = filteredUsers.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(filteredUsers.length / limit) || 1;

  // Handle Add User
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!addRoleId) {
      setAddError("Please select a role for the new user.");
      return;
    }

    setIsAdding(true);
    try {
      await usersApi.create({
        name: addName.trim(),
        email: addEmail.trim(),
        password: addPassword,
        roleId: addRoleId,
      });
      toast.success("User Created", `Added user ${addName.trim()} to your company.`);
      setIsAddOpen(false);
      setAddName("");
      setAddEmail("");
      setAddPassword("");
      setAddRoleId("");
      fetchUsersAndRoles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create user.";
      setAddError(msg);
    } finally {
      setIsAdding(false);
    }
  };

  // Handle Edit User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    setIsEditing(true);
    try {
      await usersApi.update(editingUser.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        password: editPassword.trim() || undefined,
        roleId: editRoleId || undefined,
      });
      toast.success("User Updated", `Updated user record for ${editName.trim()}.`);
      setEditingUser(null);
      fetchUsersAndRoles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update user.";
      setEditError(msg);
    } finally {
      setIsEditing(false);
    }
  };

  // Handle Toggle Status (Deactivate / Activate)
  const handleToggleStatus = async () => {
    if (!statusUser) return;
    const nextStatus =
      statusUser.status === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;

    try {
      await usersApi.updateStatus(statusUser.id, nextStatus);
      toast.success(
        "User Status Updated",
        `User ${statusUser.name} status updated to ${nextStatus}.`
      );
      setStatusUser(null);
      fetchUsersAndRoles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update status.";
      toast.error("Status Change Rejected", msg);
    }
  };

  const roleOptions = roles.map((r) => ({
    value: r.id,
    label: `${r.name}${r.is_system ? " (System Role)" : ""}`,
  }));

  const columns: ColumnDef<User>[] = [
    {
      header: "User Details",
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <UserIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{row.name}</div>
            <div className="text-[11px] text-muted-foreground">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Role",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Badge variant={row.role?.is_system ? "primary" : "neutral"}>
            {row.role?.name || "No Role"}
          </Badge>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge variant={row.status === UserStatus.ACTIVE ? "success" : "neutral"} showDot>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Last Login",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.last_login_at ? new Date(row.last_login_at).toLocaleString() : "Never logged in"}
        </span>
      ),
    },
    {
      header: "Created Date",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Can permission={PermissionCode.USER_UPDATE}>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => {
                setEditingUser(row);
                setEditName(row.name);
                setEditEmail(row.email);
                setEditPassword("");
                setEditRoleId(row.role_id);
                setEditError(null);
              }}
            >
              Edit
            </Button>
          </Can>

          <Can permission={PermissionCode.USER_DEACTIVATE}>
            <Button
              size="sm"
              variant="ghost"
              className={`h-8 px-2.5 text-xs font-medium ${
                row.status === UserStatus.ACTIVE
                  ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                  : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              }`}
              leftIcon={<ShieldAlert className="w-3.5 h-3.5" />}
              onClick={() => setStatusUser(row)}
            >
              {row.status === UserStatus.ACTIVE ? "Deactivate" : "Activate"}
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  return (
    <PageContainer maxWidth="xl" className="py-6">
      <PageHeader
        title="Users & Access Administration"
        description="Manage company user accounts, assign custom RBAC roles, and control active status."
        actions={
          <Can permission={PermissionCode.USER_CREATE}>
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setIsAddOpen(true);
                setAddError(null);
              }}
            >
              Add New User
            </Button>
          </Can>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => setParams({ search: val, page: 1 })}
        filters={[
          {
            key: "status",
            label: "Status",
            value: statusFilter,
            options: [
              { value: UserStatus.ACTIVE, label: "ACTIVE" },
              { value: UserStatus.INACTIVE, label: "INACTIVE" },
            ],
          },
        ]}
        onFilterChange={(key, val) => setParams({ [key]: val, page: 1 })}
        onClearAll={() => setParams({ search: "", status: "", page: 1 })}
      />

      <DataTable
        columns={columns}
        data={paginatedUsers}
        isLoading={isLoading}
        error={error}
        emptyTitle="No company users found"
        emptyDescription="Add users to grant them access to your company attendance and salary portal."
        pagination={{
          page,
          limit,
          total: filteredUsers.length,
          totalPages,
          onPageChange: (p) => setParam("page", p),
          onLimitChange: (l) => setParams({ limit: l, page: 1 }),
        }}
      />

      {/* Add User Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Company User"
        description="Create a new administrative or manager user account."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {addError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <Input
            label="Full Name"
            required
            placeholder="e.g. John Doe"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
          />

          <Input
            label="Email Address"
            required
            type="email"
            placeholder="e.g. john@company.com"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
          />

          <Input
            label="Password"
            required
            type="password"
            placeholder="Minimum 6 characters"
            value={addPassword}
            onChange={(e) => setAddPassword(e.target.value)}
          />

          <Select
            label="Assign Role"
            required
            value={addRoleId}
            onChange={(e) => setAddRoleId(e.target.value)}
            options={[
              { value: "", label: "Select a Role..." },
              ...roleOptions,
            ]}
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
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Edit Company User"
        description={`Update account details for ${editingUser?.name}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <Input
            label="Full Name"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />

          <Input
            label="Email Address"
            required
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
          />

          <Input
            label="New Password (Optional)"
            type="password"
            placeholder="Leave blank to keep existing password"
            value={editPassword}
            onChange={(e) => setEditPassword(e.target.value)}
          />

          <Select
            label="Role Assignment"
            required
            value={editRoleId}
            onChange={(e) => setEditRoleId(e.target.value)}
            options={roleOptions}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingUser(null)}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isEditing}>
              Save User Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Toggle Status Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!statusUser}
        onClose={() => setStatusUser(null)}
        title={
          statusUser?.status === UserStatus.ACTIVE
            ? "Deactivate User Account?"
            : "Reactivate User Account?"
        }
        description={
          statusUser?.status === UserStatus.ACTIVE
            ? `Warning: Deactivating ${statusUser?.name} will revoke their login access immediately. The backend protects the last active Company Owner.`
            : `Reactivating ${statusUser?.name} will restore their login access.`
        }
        confirmText={
          statusUser?.status === UserStatus.ACTIVE ? "Deactivate Account" : "Reactivate Account"
        }
        variant={statusUser?.status === UserStatus.ACTIVE ? "danger" : "primary"}
        onConfirm={handleToggleStatus}
      />
    </PageContainer>
  );
}

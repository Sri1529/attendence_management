"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Can } from "@/components/auth/can";
import { useToast } from "@/hooks/use-toast";
import { useQueryParams } from "@/hooks/use-query-params";
import { employeesApi } from "@/lib/api/employees";
import { departmentsApi } from "@/lib/api/departments";
import { designationsApi } from "@/lib/api/designations";
import {
  Employee,
  EmploymentStatus,
  Department,
  Designation,
  PaginatedResponse,
} from "@/types/organization";
import { PermissionCode } from "@/lib/permissions/codes";
import { Plus, Eye, Edit2, Mail, Calendar } from "lucide-react";

export default function EmployeesPage() {
  const { toast } = useToast();
  const { getIntParam, getParam, setParam, setParams } = useQueryParams();

  const page = getIntParam("page", 1);
  const limit = getIntParam("limit", 20);
  const search = getParam("search", "");
  const departmentId = getParam("departmentId", "");
  const designationId = getParam("designationId", "");
  const employmentStatus = getParam("employmentStatus", "") as EmploymentStatus | "";

  const [dataResponse, setDataResponse] = useState<PaginatedResponse<Employee> | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status Change Modal State
  const [statusEmployee, setStatusEmployee] = useState<Employee | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<EmploymentStatus>(EmploymentStatus.ACTIVE);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [terminateConfirmOpen, setTerminateConfirmOpen] = useState(false);

  // Load dropdown options for filters
  useEffect(() => {
    departmentsApi.list({ limit: 100 }).then((res) => setDepartments(res.data)).catch(() => null);
    designationsApi.list({ limit: 100 }).then((res) => setDesignations(res.data)).catch(() => null);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await employeesApi.list({
          page,
          limit,
          search,
          departmentId: departmentId || undefined,
          designationId: designationId || undefined,
          employmentStatus: employmentStatus || undefined,
        });
        if (isMounted) setDataResponse(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load employees";
        if (isMounted) setError(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [page, limit, search, departmentId, designationId, employmentStatus]);

  const fetchEmployees = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await employeesApi.list({
        page,
        limit,
        search,
        departmentId: departmentId || undefined,
        designationId: designationId || undefined,
        employmentStatus: employmentStatus || undefined,
      });
      setDataResponse(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load employees";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenStatusModal = (emp: Employee) => {
    setStatusEmployee(emp);
    setSelectedStatus(emp.employment_status);
  };

  const handleStatusSubmit = async () => {
    if (!statusEmployee) return;

    if (selectedStatus === EmploymentStatus.TERMINATED && !terminateConfirmOpen) {
      setTerminateConfirmOpen(true);
      return;
    }

    setIsStatusUpdating(true);
    try {
      await employeesApi.updateStatus(statusEmployee.id, selectedStatus);
      toast.success(
        "Status Updated",
        `Employee status changed to ${selectedStatus}.`
      );
      setStatusEmployee(null);
      setTerminateConfirmOpen(false);
      fetchEmployees();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update status";
      toast.error("Update Failed", msg);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const statusBadgeVariant = (status: EmploymentStatus) => {
    switch (status) {
      case EmploymentStatus.ACTIVE:
        return "success";
      case EmploymentStatus.ON_NOTICE:
        return "warning";
      case EmploymentStatus.TERMINATED:
        return "danger";
      case EmploymentStatus.INACTIVE:
        return "neutral";
      default:
        return "neutral";
    }
  };

  const columns: ColumnDef<Employee>[] = [
    {
      header: "Code",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-foreground">
          {row.employee_code}
        </span>
      ),
    },
    {
      header: "Employee Name",
      cell: (row) => (
        <div>
          <Link
            href={`/employees/${row.id}`}
            className="font-semibold text-foreground hover:text-primary transition-colors text-xs"
          >
            {row.first_name} {row.last_name}
          </Link>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Mail className="w-3 h-3" /> {row.email || "—"}
          </div>
        </div>
      ),
    },
    {
      header: "Department",
      cell: (row) => (
        <span className="text-xs text-foreground font-medium">
          {row.department?.name || "—"}
        </span>
      ),
    },
    {
      header: "Designation",
      cell: (row) => (
        <span className="text-xs text-foreground">
          {row.designation?.name || "—"}
        </span>
      ),
    },
    {
      header: "Joining Date",
      cell: (row) => (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {row.joining_date}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge variant={statusBadgeVariant(row.employment_status)} showDot>
          {row.employment_status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Link href={`/employees/${row.id}`}>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="View Workspace">
              <Eye className="w-3.5 h-3.5" />
            </Button>
          </Link>

          <Can permission={PermissionCode.EMPLOYEE_UPDATE}>
            <Link href={`/employees/${row.id}/edit`}>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit Employee">
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </Can>

          <Can permission={PermissionCode.EMPLOYEE_UPDATE}>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
              onClick={() => handleOpenStatusModal(row)}
            >
              Status
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  return (
    <PageContainer maxWidth="xl" className="py-6 space-y-6">
      <PageHeader
        title="Employees"
        description="Manage company workforce records, departments, designations, and employment statuses."
        actions={
          <Can permission={PermissionCode.EMPLOYEE_CREATE}>
            <Link href="/employees/new">
              <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                Add Employee
              </Button>
            </Link>
          </Can>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => setParams({ search: val, page: 1 })}
        filters={[
          {
            key: "departmentId",
            label: "Department",
            value: departmentId,
            options: departments.map((d) => ({ value: d.id, label: d.name })),
          },
          {
            key: "designationId",
            label: "Designation",
            value: designationId,
            options: designations.map((d) => ({ value: d.id, label: d.name })),
          },
          {
            key: "employmentStatus",
            label: "Status",
            value: employmentStatus,
            options: [
              { value: EmploymentStatus.ACTIVE, label: "Active" },
              { value: EmploymentStatus.ON_NOTICE, label: "On Notice" },
              { value: EmploymentStatus.INACTIVE, label: "Inactive" },
              { value: EmploymentStatus.TERMINATED, label: "Terminated" },
            ],
          },
        ]}
        onFilterChange={(key, val) => setParams({ [key]: val, page: 1 })}
        onClearAll={() =>
          setParams({
            search: "",
            departmentId: "",
            designationId: "",
            employmentStatus: "",
            page: 1,
          })
        }
      />

      <DataTable
        columns={columns}
        data={dataResponse?.data || []}
        isLoading={isLoading}
        error={error}
        emptyTitle="No employees found"
        emptyDescription="Add your company's first employee using the button above."
        pagination={{
          page,
          limit,
          total: dataResponse?.meta.total || 0,
          totalPages: dataResponse?.meta.totalPages || 1,
          onPageChange: (p) => setParam("page", p),
          onLimitChange: (l) => setParams({ limit: l, page: 1 }),
        }}
      />

      {/* Change Status Modal */}
      <Modal
        isOpen={!!statusEmployee}
        onClose={() => {
          setStatusEmployee(null);
          setTerminateConfirmOpen(false);
        }}
        title="Update Employment Status"
        description={`Modify status for ${statusEmployee?.first_name} ${statusEmployee?.last_name} (${statusEmployee?.employee_code})`}
      >
        <div className="space-y-4 text-xs">
          <Select
            label="Employment Status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as EmploymentStatus)}
            options={[
              { value: EmploymentStatus.ACTIVE, label: "Active" },
              { value: EmploymentStatus.ON_NOTICE, label: "On Notice" },
              { value: EmploymentStatus.INACTIVE, label: "Inactive" },
              { value: EmploymentStatus.TERMINATED, label: "Terminated" },
            ]}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => {
                setStatusEmployee(null);
                setTerminateConfirmOpen(false);
              }}
              disabled={isStatusUpdating}
            >
              Cancel
            </Button>
            <Button
              variant={selectedStatus === EmploymentStatus.TERMINATED ? "danger" : "primary"}
              isLoading={isStatusUpdating}
              onClick={handleStatusSubmit}
            >
              Save Status
            </Button>
          </div>
        </div>
      </Modal>

      {/* Terminate Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={terminateConfirmOpen}
        onClose={() => setTerminateConfirmOpen(false)}
        onConfirm={handleStatusSubmit}
        title="Confirm Termination"
        description={`Are you sure you want to terminate ${statusEmployee?.first_name} ${statusEmployee?.last_name}? This action will affect active payroll calculations.`}
        confirmText="Confirm Termination"
        variant="danger"
      />
    </PageContainer>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQueryParams } from "@/hooks/use-query-params";
import { employeesApi } from "@/lib/api/employees";
import { salaryApi } from "@/lib/api/salary";
import { formatCurrency } from "@/lib/utils/format-currency";
import { Employee, PaginatedResponse } from "@/types/organization";
import { SalaryHistory } from "@/types/salary";
import { ArrowRight, User } from "lucide-react";

import { Can } from "@/components/auth/can";
import { ErrorState } from "@/components/ui/error-state";
import { PermissionCode } from "@/lib/permissions/codes";

export default function SalaryDirectoryPage() {
  const router = useRouter();
  const { getIntParam, getParam, setParam, setParams } = useQueryParams();

  const page = getIntParam("page", 1);
  const limit = getIntParam("limit", 20);
  const search = getParam("search", "");

  const [dataResponse, setDataResponse] = useState<PaginatedResponse<Employee> | null>(null);
  const [salariesMap, setSalariesMap] = useState<Record<string, SalaryHistory | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await employeesApi.list({ page, limit, search });
        if (isMounted) {
          setDataResponse(res);

          const salEntries = await Promise.all(
            res.data.map(async (emp) => {
              try {
                const sal = await salaryApi.getCurrent(emp.id);
                return [emp.id, sal] as const;
              } catch {
                return [emp.id, null] as const;
              }
            })
          );
          if (isMounted) {
            setSalariesMap(Object.fromEntries(salEntries));
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load employee list.";
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
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-primary/10 text-primary">
            <User className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-semibold text-foreground">
              {row.first_name} {row.last_name}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {row.email ? row.email : `Status: ${row.employment_status.toLowerCase()}`}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Department",
      cell: (row) => <span className="text-foreground">{row.department?.name || "—"}</span>,
    },
    {
      header: "Designation",
      cell: (row) => <span className="text-foreground font-medium">{row.designation?.name || "—"}</span>,
    },
    {
      header: "Current Basic Salary",
      cell: (row) => {
        const sal = salariesMap[row.id];
        if (sal === undefined) {
          return <span className="text-xs text-muted-foreground italic">Loading...</span>;
        }
        if (!sal) {
          return <Badge variant="warning" className="text-[10px]">Not Configured</Badge>;
        }
        return (
          <div>
            <div className="font-mono text-xs font-bold text-foreground">
              {formatCurrency(sal.basic_salary)}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              Effective: {sal.effective_from}
            </div>
          </div>
        );
      },
    },
    {
      header: "Action",
      cell: (row) => (
        <Button
          size="sm"
          variant="primary"
          className="h-7 text-xs"
          onClick={() => router.push(`/employees/${row.id}?tab=salary`)}
        >
          Manage Salary <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      ),
    },
  ];

  return (
    <Can
      permission={PermissionCode.SALARY_VIEW}
      fallback={
        <PageContainer maxWidth="xl" className="py-12">
          <ErrorState
            title="Access Restricted"
            message="You do not have permission to access Salary Management."
          />
        </PageContainer>
      }
    >
      <PageContainer maxWidth="xl" className="py-6 space-y-6">
        <PageHeader
          title="Salary Management Directory"
          description="Select an employee to manage basic salary history, current salary, and salary adjustments."
          badge={
            <Badge variant="primary" showDot>
              Salary Directory
            </Badge>
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
          emptyTitle="No employees found"
          emptyDescription="Add employees to start managing salary records."
          onRowClick={(emp) => router.push(`/employees/${emp.id}?tab=salary`)}
          pagination={{
            page,
            limit,
            total: dataResponse?.meta.total || 0,
            totalPages: dataResponse?.meta.totalPages || 1,
            onPageChange: (p) => setParam("page", p),
            onLimitChange: (l) => setParams({ limit: l, page: 1 }),
          }}
        />
      </PageContainer>
    </Can>
  );
}

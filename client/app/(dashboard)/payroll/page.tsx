"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Can } from "@/components/auth/can";
import { ErrorState } from "@/components/ui/error-state";
import { useToast } from "@/hooks/use-toast";
import { useQueryParams } from "@/hooks/use-query-params";
import { formatCurrency } from "@/lib/utils/format-currency";
import { payrollApi } from "@/lib/api/payroll";
import { payslipsApi } from "@/lib/api/payslips";
import { employeesApi } from "@/lib/api/employees";
import { PayrollPeriod, PayrollPeriodStatus, PayrollRecord } from "@/types/payroll";
import { Payslip } from "@/types/payslip";
import { Employee, PaginatedResponse } from "@/types/organization";
import { PermissionCode } from "@/lib/permissions/codes";
import {
  Plus,
  ArrowRight,
  AlertCircle,
  Calculator,
  FileSpreadsheet,
  User,
  Download,
  Eye,
  CheckCircle2,
} from "lucide-react";

export default function PayrollPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { getIntParam, getParam, setParam, setParams } = useQueryParams();

  const initialTab = getParam("tab", "") === "payslips" ? "payslips" : "periods";
  const [activeTab, setActiveTab] = useState<"periods" | "payslips">(initialTab);

  const page = getIntParam("page", 1);
  const limit = getIntParam("limit", 20);
  const status = getParam("status", "") as PayrollPeriodStatus | "";
  const selectedPeriodId = getParam("periodId", "");
  const search = getParam("search", "");

  // Payroll Periods State
  const [periodsData, setPeriodsData] = useState<PaginatedResponse<PayrollPeriod> | null>(null);
  const [allPeriodsList, setAllPeriodsList] = useState<PayrollPeriod[]>([]);
  const [isPeriodsLoading, setIsPeriodsLoading] = useState(true);
  const [periodsError, setPeriodsError] = useState<string | null>(null);

  // Payslips Directory State
  const [employeesData, setEmployeesData] = useState<PaginatedResponse<Employee> | null>(null);
  const [isEmployeesLoading, setIsEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState<string | null>(null);


  const [periodRecordsMap, setPeriodRecordsMap] = useState<Record<string, PayrollRecord>>({});
  const [rowPayslipMap, setRowPayslipMap] = useState<Record<string, { record?: PayrollRecord; payslip?: Payslip | null }>>({});

  // New Period Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newYear, setNewYear] = useState(() => new Date().getFullYear());
  const [newMonth, setNewMonth] = useState(() => new Date().getMonth() + 1);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Issue Payslip Modal State
  const [issueTarget, setIssueTarget] = useState<{
    employee: Employee;
    record: PayrollRecord;
  } | null>(null);
  const [isIssuingPayslip, setIsIssuingPayslip] = useState(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  const getMonthName = useCallback((monthNum: number) => {
    const date = new Date(2000, monthNum - 1, 1);
    return date.toLocaleString("en-US", { month: "long" });
  }, []);

  const fetchPeriods = useCallback(async () => {
    setIsPeriodsLoading(true);
    setPeriodsError(null);
    try {
      const res = await payrollApi.listPeriods({
        page,
        limit,
        status: status || undefined,
      });
      setPeriodsData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load payroll periods.";
      setPeriodsError(msg);
    } finally {
      setIsPeriodsLoading(false);
    }
  }, [page, limit, status]);

  // Load Periods List for table & dropdown
  useEffect(() => {
    let isMounted = true;
    payrollApi.listPeriods({ limit: 100 }).then((res) => {
      if (isMounted) setAllPeriodsList(res.data);
    }).catch(() => null);

    if (activeTab === "periods") {
      payrollApi.listPeriods({
        page,
        limit,
        status: status || undefined,
      }).then((res) => {
        if (isMounted) {
          setPeriodsData(res);
          setPeriodsError(null);
        }
      }).catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load payroll periods.";
          setPeriodsError(msg);
        }
      }).finally(() => {
        if (isMounted) setIsPeriodsLoading(false);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [activeTab, page, limit, status]);

  // Fetch Employee Directory & Payslip Statuses for Payslips Tab
  useEffect(() => {
    if (activeTab !== "payslips") return;

    let isMounted = true;
    const loadPayslipsDirectory = async () => {
      setIsEmployeesLoading(true);
      setEmployeesError(null);
      try {
        const empRes = await employeesApi.list({ page, limit, search });
        if (!isMounted) return;
        setEmployeesData(empRes);

        if (selectedPeriodId) {
          // Fetch Period Summary & Records
          try {
            await payrollApi.getPeriod(selectedPeriodId);

            const recsRes = await payrollApi.listRecords(selectedPeriodId, { limit: 1000 });
            const recMap: Record<string, PayrollRecord> = {};
            for (const rec of recsRes.data) {
              recMap[rec.employee_id] = rec;
            }
            if (isMounted) setPeriodRecordsMap(recMap);

            // Fetch payslips for page employees
            const rowMap: Record<string, { record?: PayrollRecord; payslip?: Payslip | null }> = {};
            await Promise.all(
              empRes.data.map(async (emp) => {
                const rec = recMap[emp.id];
                if (rec) {
                  try {
                    const ps = await payslipsApi.getByPayrollRecord(rec.id);
                    rowMap[emp.id] = { record: rec, payslip: ps };
                  } catch {
                    rowMap[emp.id] = { record: rec, payslip: null };
                  }
                } else {
                  rowMap[emp.id] = { record: undefined, payslip: null };
                }
              })
            );
            if (isMounted) setRowPayslipMap(rowMap);
          } catch {
            // Ignore fetch error
          }
        } else {
          // All Periods selected: fetch latest payslip / payroll history on-demand for page employees
          setPeriodRecordsMap({});
          const rowMap: Record<string, { record?: PayrollRecord; payslip?: Payslip | null }> = {};
          await Promise.all(
            empRes.data.map(async (emp) => {
              try {
                const psRes = await payslipsApi.listByEmployee(emp.id, { limit: 1 });
                const latestPs = psRes.data[0] || null;
                rowMap[emp.id] = { record: undefined, payslip: latestPs };
              } catch {
                rowMap[emp.id] = { record: undefined, payslip: null };
              }
            })
          );
          if (isMounted) setRowPayslipMap(rowMap);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load employee list.";
        if (isMounted) setEmployeesError(msg);
      } finally {
        if (isMounted) setIsEmployeesLoading(false);
      }
    };

    loadPayslipsDirectory();
    return () => {
      isMounted = false;
    };
  }, [activeTab, page, limit, search, selectedPeriodId]);

  // Handle Create Period Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    setIsCreating(true);
    try {
      const created = await payrollApi.createPeriod({
        periodYear: Number(newYear),
        periodMonth: Number(newMonth),
      });
      toast.success("Payroll Period Created", `Created payroll period for ${getMonthName(created.period_month)} ${created.period_year}.`);
      setIsCreateOpen(false);
      fetchPeriods();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create payroll period.";
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Issue Payslip Submit
  const handleConfirmIssuePayslip = async () => {
    if (!issueTarget) return;

    setIsIssuingPayslip(true);
    try {
      const ps = await payslipsApi.createPayslip(issueTarget.record.id);
      toast.success("Payslip Issued", `Official payslip #${ps.payslip_number} generated successfully.`);
      setIssueTarget(null);

      // Refresh payslip data for target employee row
      setRowPayslipMap((prev) => ({
        ...prev,
        [issueTarget.employee.id]: {
          record: issueTarget.record,
          payslip: ps,
        },
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to issue payslip.";
      toast.error("Issuance Failed", msg);
    } finally {
      setIsIssuingPayslip(false);
    }
  };

  // Handle Download PDF
  const handleDownloadPdf = async (payslipId: string) => {
    setDownloadingPdfId(payslipId);
    try {
      const blob = await payslipsApi.downloadPdf(payslipId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payslip-${payslipId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF Downloaded", "Payslip PDF statement downloaded.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to download PDF.";
      toast.error("Download Failed", msg);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const statusBadgeVariant = (s: PayrollPeriodStatus) => {
    switch (s) {
      case PayrollPeriodStatus.PAID:
        return "success";
      case PayrollPeriodStatus.FINALIZED:
        return "primary";
      case PayrollPeriodStatus.DRAFT:
        return "warning";
      case PayrollPeriodStatus.CANCELLED:
        return "neutral";
      default:
        return "neutral";
    }
  };

  // Monthly Payroll Periods Columns
  const periodColumns: ColumnDef<PayrollPeriod>[] = [
    {
      header: "Payroll Period",
      cell: (row) => (
        <div>
          <div className="font-bold text-foreground">
            {getMonthName(row.period_month)} {row.period_year}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {row.start_date} to {row.end_date}
          </div>
        </div>
      ),
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
      header: "Created Date",
      cell: (row) => (
        <span className="text-muted-foreground text-xs font-mono">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Action",
      cell: (row) => (
        <Button
          size="sm"
          variant="primary"
          className="h-7 text-xs font-medium"
          onClick={() => router.push(`/payroll/${row.id}`)}
        >
          Open Payroll <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      ),
    },
  ];

  // Employee Payslips Directory Columns
  const employeePayslipColumns: ColumnDef<Employee>[] = [
    {
      header: "Employee",
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-full bg-primary/10 text-primary shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-semibold text-foreground text-xs">
              {row.first_name} {row.last_name}
            </div>
            <div className="text-[11px] text-muted-foreground">{row.email || "—"}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Employee Code",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-foreground">
          {row.employee_code}
        </span>
      ),
    },
    {
      header: "Payslip Status",
      cell: (row) => {
        const item = rowPayslipMap[row.id];
        if (isEmployeesLoading && !item) {
          return <span className="text-xs text-muted-foreground italic">...</span>;
        }

        if (selectedPeriodId) {
          if (item?.payslip) {
            return <Badge variant="success" showDot className="text-[10px]">Payslip Issued</Badge>;
          }
          if (item?.record) {
            return <Badge variant="warning" showDot className="text-[10px]">Payroll Calculated — Payslip Not Issued</Badge>;
          }
          return <Badge variant="neutral" className="text-[10px]">No Payroll</Badge>;
        }

        // All Periods Mode
        if (item?.payslip) {
          return (
            <Badge variant="success" showDot className="text-[10px]">
              Payslip Issued (#{item.payslip.payslip_number})
            </Badge>
          );
        }
        return <Badge variant="neutral" className="text-[10px]">No Issued Payslips</Badge>;
      },
    },
    {
      header: "Net Salary",
      cell: (row) => {
        const item = rowPayslipMap[row.id];
        if (item?.record) {
          return <span className="font-mono text-xs font-bold text-primary">{formatCurrency(item.record.net_salary)}</span>;
        }
        if (item?.payslip) {
          const netSalary = item.payslip.payroll_record?.net_salary;
          return <span className="font-mono text-xs font-bold text-primary">{netSalary ? formatCurrency(netSalary) : "—"}</span>;
        }
        return <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    {
      header: "Issued Date",
      cell: (row) => {
        const item = rowPayslipMap[row.id];
        if (item?.payslip) {
          return <span className="text-xs text-muted-foreground font-mono">{new Date(item.payslip.created_at).toLocaleDateString()}</span>;
        }
        return <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    {
      header: "Action",
      cell: (row) => {
        const item = rowPayslipMap[row.id];
        if (item?.payslip) {
          return (
            <div className="flex items-center gap-1.5">
              <Can permission={PermissionCode.PAYSLIP_VIEW}>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2"
                  onClick={() => router.push(`/payslips/${item.payslip!.id}`)}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> View
                </Button>
              </Can>
              <Can permission={PermissionCode.PAYSLIP_DOWNLOAD}>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs px-2"
                  isLoading={downloadingPdfId === item.payslip.id}
                  onClick={() => handleDownloadPdf(item.payslip!.id)}
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> PDF
                </Button>
              </Can>
            </div>
          );
        }

        if (item?.record) {
          return (
            <Can permission={PermissionCode.PAYSLIP_CREATE}>
              <Button
                size="sm"
                variant="primary"
                className="h-7 text-xs font-medium"
                onClick={() => setIssueTarget({ employee: row, record: item.record! })}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Issue Payslip
              </Button>
            </Can>
          );
        }

        return (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => router.push(`/employees/${row.id}?tab=payslips`)}
          >
            View Payslips <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        );
      },
    },
  ];

  // Derived Summary Counts for Selected Period
  const totalEmployeesInPeriod = Object.keys(periodRecordsMap).length;
  let issuedCount = 0;
  let pendingCount = 0;
  if (selectedPeriodId) {
    for (const empId of Object.keys(periodRecordsMap)) {
      const item = rowPayslipMap[empId];
      if (item?.payslip) issuedCount++;
      else pendingCount++;
    }
  }

  const selectedPeriodObj = allPeriodsList.find((p) => p.id === selectedPeriodId);

  return (
    <Can
      anyPermission={[PermissionCode.PAYROLL_VIEW, PermissionCode.PAYSLIP_VIEW]}
      fallback={
        <PageContainer maxWidth="xl" className="py-12">
          <ErrorState
            title="Access Restricted"
            message="You do not have permission to access Payroll & Payslips."
          />
        </PageContainer>
      }
    >
      <PageContainer maxWidth="xl" className="py-6 space-y-6">
        <PageHeader
          title="Payroll & Payslips Suite"
          description="Manage monthly payroll processing cycles, calculate employee payouts, and issue official payslip statements."
          badge={
            <Badge variant="primary" showDot>
              Payroll Workspace
            </Badge>
          }
          actions={
            activeTab === "periods" ? (
              <Can permission={PermissionCode.PAYROLL_GENERATE}>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsCreateOpen(true)}
                >
                  Create Payroll Period
                </Button>
              </Can>
            ) : undefined
          }
        />

        {/* Navigation Tabs */}
        <div className="border-b border-border flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab("periods");
              setParam("tab", "periods");
            }}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === "periods"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Monthly Payroll Processing</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("payslips");
              setParam("tab", "payslips");
            }}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === "payslips"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Employee Payslips Directory</span>
          </button>
        </div>

        {/* Tab 1: Monthly Payroll Processing */}
        {activeTab === "periods" && (
          <Can
            permission={PermissionCode.PAYROLL_VIEW}
            fallback={
              <ErrorState
                title="Access Restricted"
                message="You do not have permission to view monthly payroll processing."
              />
            }
          >
            <div className="space-y-4">
              <FilterBar
                filters={[
                  {
                    key: "status",
                    label: "Status",
                    value: status,
                    options: [
                      { label: "Draft", value: PayrollPeriodStatus.DRAFT },
                      { label: "Finalized", value: PayrollPeriodStatus.FINALIZED },
                      { label: "Paid", value: PayrollPeriodStatus.PAID },
                      { label: "Cancelled", value: PayrollPeriodStatus.CANCELLED },
                    ],
                  },
                ]}
                onFilterChange={(key, val) => setParams({ [key]: val, page: 1 })}
                onClearAll={() => setParams({ status: "", page: 1 })}
              />

              <DataTable
                columns={periodColumns}
                data={periodsData?.data || []}
                isLoading={isPeriodsLoading}
                error={periodsError}
                emptyTitle="No payroll periods found"
                emptyDescription="Create a new payroll period to calculate employee salaries."
                onRowClick={(period) => router.push(`/payroll/${period.id}`)}
                pagination={{
                  page,
                  limit,
                  total: periodsData?.meta.total || 0,
                  totalPages: periodsData?.meta.totalPages || 1,
                  onPageChange: (p) => setParam("page", p),
                  onLimitChange: (l) => setParams({ limit: l, page: 1 }),
                }}
              />
            </div>
          </Can>
        )}

        {/* Tab 2: Employee Payslips Directory */}
        {activeTab === "payslips" && (
          <Can
            permission={PermissionCode.PAYSLIP_VIEW}
            fallback={
              <ErrorState
                title="Access Restricted"
                message="You do not have permission to view payslips directory."
              />
            }
          >
            <div className="space-y-4">
              {/* Period Filter Header Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-foreground shrink-0">
                    Payroll Period:
                  </span>
                  <div className="w-64">
                    <Select
                      value={selectedPeriodId}
                      onChange={(e) => setParams({ periodId: e.target.value, page: 1 })}
                      options={[
                        { label: "All Periods", value: "" },
                        ...allPeriodsList.map((p) => ({
                          label: `${getMonthName(p.period_month)} ${p.period_year} (${p.status})`,
                          value: p.id,
                        })),
                      ]}
                    />
                  </div>
                </div>

                <div className="flex-1 max-w-sm">
                  <FilterBar
                    searchValue={search}
                    onSearchChange={(val) => setParams({ search: val, page: 1 })}
                    onClearAll={() => setParams({ search: "", page: 1 })}
                  />
                </div>
              </div>

              {/* Selected Period KPI Summary Card */}
              {selectedPeriodId && selectedPeriodObj && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in">
                  <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Workforce Employees
                    </span>
                    <div className="text-lg font-bold text-foreground">
                      {totalEmployeesInPeriod}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Payslips Issued
                    </span>
                    <div className="text-lg font-bold text-emerald-500">
                      {issuedCount}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Payslips Pending
                    </span>
                    <div className="text-lg font-bold text-amber-500">
                      {pendingCount}
                    </div>
                  </div>

                  </div>
              )}

              <DataTable
                columns={employeePayslipColumns}
                data={employeesData?.data || []}
                isLoading={isEmployeesLoading}
                error={employeesError}
                emptyTitle={
                  selectedPeriodId
                    ? `No payslips found for ${selectedPeriodObj ? `${getMonthName(selectedPeriodObj.period_month)} ${selectedPeriodObj.period_year}` : "this period"}`
                    : "No employee payslips found"
                }
                emptyDescription={
                  selectedPeriodId
                    ? "Generate and finalize payroll first, then issue payslips for eligible employees."
                    : "Add employees to start issuing official payslips."
                }
                onRowClick={(emp) => router.push(`/employees/${emp.id}?tab=payslips`)}
                pagination={{
                  page,
                  limit,
                  total: employeesData?.meta.total || 0,
                  totalPages: employeesData?.meta.totalPages || 1,
                  onPageChange: (p) => setParam("page", p),
                  onLimitChange: (l) => setParams({ limit: l, page: 1 }),
                }}
              />
            </div>
          </Can>
        )}

        {/* Create Payroll Period Modal */}
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create Payroll Period"
          description="Initialize a new monthly payroll period for salary calculation."
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {createError && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-md text-xs text-danger flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <Select
              label="Payroll Year"
              value={newYear.toString()}
              onChange={(e) => setNewYear(Number(e.target.value))}
              options={[
                { label: `${new Date().getFullYear() - 1}`, value: `${new Date().getFullYear() - 1}` },
                { label: `${new Date().getFullYear()}`, value: `${new Date().getFullYear()}` },
                { label: `${new Date().getFullYear() + 1}`, value: `${new Date().getFullYear() + 1}` },
              ]}
            />

            <Select
              label="Payroll Month"
              value={newMonth.toString()}
              onChange={(e) => setNewMonth(Number(e.target.value))}
              options={Array.from({ length: 12 }, (_, i) => ({
                label: getMonthName(i + 1),
                value: (i + 1).toString(),
              }))}
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
                Create Period
              </Button>
            </div>
          </form>
        </Modal>

        {/* Issue Official Payslip Confirmation Modal */}
        <Modal
          isOpen={!!issueTarget}
          onClose={() => setIssueTarget(null)}
          title="Issue Official Payslip"
          description="Generate and issue official payslip statement for this payroll record."
        >
          {issueTarget && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-secondary/40 border border-border space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-border">
                  <span className="text-muted-foreground font-medium">Target Employee:</span>
                  <span className="font-bold text-foreground">
                    {issueTarget.employee.first_name} {issueTarget.employee.last_name}{" "}
                    <span className="font-mono text-muted-foreground">({issueTarget.employee.employee_code})</span>
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2 border-b border-border">
                  <span className="text-muted-foreground font-medium">Payroll Period:</span>
                  <span className="font-bold text-foreground">
                    {selectedPeriodObj
                      ? `${getMonthName(selectedPeriodObj.period_month)} ${selectedPeriodObj.period_year}`
                      : "Selected Period"}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Calculated Net Payout:</span>
                  <span className="font-mono font-bold text-base text-primary">
                    {formatCurrency(issueTarget.record.net_salary)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Issuing a payslip creates a permanent official document record for this employee Payout.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIssueTarget(null)}
                  disabled={isIssuingPayslip}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  isLoading={isIssuingPayslip}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  onClick={handleConfirmIssuePayslip}
                >
                  Issue Payslip
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </PageContainer>
    </Can>
  );
}

"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Can } from "@/components/auth/can";
import { useToast } from "@/hooks/use-toast";
import { useQueryParams } from "@/hooks/use-query-params";
import { formatCurrency } from "@/lib/utils/format-currency";
import { payrollApi } from "@/lib/api/payroll";
import { employeesApi } from "@/lib/api/employees";
import { settingsApi } from "@/lib/api/settings";
import { attendanceApi } from "@/lib/api/attendance";
import { leaveRecordsApi } from "@/lib/api/leave-records";
import { PayrollPeriod, PayrollPeriodStatus, PayrollRecord } from "@/types/payroll";
import { Employee, PaginatedResponse } from "@/types/organization";
import { CompanySettings } from "@/types/settings";
import { LeaveStatus } from "@/types/leave";
import { PermissionCode } from "@/lib/permissions/codes";
import {
  ArrowLeft,
  Calculator,
  Lock,
  CheckCircle2,
  Ban,
  Users,
  CircleDollarSign,
  ArrowRight,
  User,
  AlertCircle,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

export default function PayrollPeriodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const periodId = resolvedParams.id;
  const router = useRouter();
  const { toast } = useToast();
  const { getIntParam, setParam, setParams } = useQueryParams();

  const page = getIntParam("page", 1);
  const limit = getIntParam("limit", 20);

  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [recordsResponse, setRecordsResponse] = useState<PaginatedResponse<PayrollRecord> | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<
    Record<
      string,
      {
        absentDays: number;
        halfDays: number;
        presentDays: number;
        leaveDays: number;
        paidLeaveDays: number;
        unpaidLeaveDays: number;
        unpaidLeaveTypeNames: string[];
        paidLeaveTypeNames: string[];
      }
    >
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog States
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [manualDeductions, setManualDeductions] = useState<Record<string, string>>({});
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  // Reopen for Correction Modal State
  const [isReopenOpen, setIsReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [isReopening, setIsReopening] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);

  const fetchPeriodDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const p = await payrollApi.getPeriod(periodId);
      setPeriod(p);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load payroll period.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [periodId]);

  const fetchRecords = useCallback(async () => {
    setIsRecordsLoading(true);
    try {
      const recs = await payrollApi.listRecords(periodId, { page, limit });
      setRecordsResponse(recs);
    } catch {
      // Silent error handling
    } finally {
      setIsRecordsLoading(false);
    }
  }, [periodId, page, limit]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const p = await payrollApi.getPeriod(periodId);
        if (isMounted) setPeriod(p);

        settingsApi.getAccount().then((acc) => {
          if (isMounted && acc.company) setCompany(acc.company as unknown as CompanySettings);
        }).catch(() => null);

        employeesApi.list({ limit: 100 }).then((res) => {
          if (isMounted) setEmployees(res.data);
        }).catch(() => null);

        Promise.allSettled([
          attendanceApi.list({ startDate: p.start_date, endDate: p.end_date, limit: 1000 }),
          leaveRecordsApi.list({ status: LeaveStatus.APPROVED, limit: 1000 }),
        ]).then(([attRes, leaveRes]) => {
          if (!isMounted) return;
          const stats: Record<
            string,
            {
              absentDays: number;
              halfDays: number;
              presentDays: number;
              leaveDays: number;
              paidLeaveDays: number;
              unpaidLeaveDays: number;
              unpaidLeaveTypeNames: string[];
              paidLeaveTypeNames: string[];
            }
          > = {};

          const attData = attRes.status === "fulfilled" ? attRes.value.data : [];
          for (const att of attData) {
            if (!stats[att.employee_id]) {
              stats[att.employee_id] = {
                absentDays: 0,
                halfDays: 0,
                presentDays: 0,
                leaveDays: 0,
                paidLeaveDays: 0,
                unpaidLeaveDays: 0,
                unpaidLeaveTypeNames: [],
                paidLeaveTypeNames: [],
              };
            }
            if (att.status === "ABSENT") stats[att.employee_id].absentDays++;
            else if (att.status === "HALF_DAY") stats[att.employee_id].halfDays++;
            else if (att.status === "PRESENT") stats[att.employee_id].presentDays++;
            else if (att.status === "LEAVE") stats[att.employee_id].leaveDays++;
          }

          const leaveData = leaveRes.status === "fulfilled" ? leaveRes.value.data : [];
          for (const lr of leaveData) {
            if (lr.start_date <= p.end_date && lr.end_date >= p.start_date) {
              if (!stats[lr.employee_id]) {
                stats[lr.employee_id] = {
                  absentDays: 0,
                  halfDays: 0,
                  presentDays: 0,
                  leaveDays: 0,
                  paidLeaveDays: 0,
                  unpaidLeaveDays: 0,
                  unpaidLeaveTypeNames: [],
                  paidLeaveTypeNames: [],
                };
              }

              const s = lr.start_date > p.start_date ? lr.start_date : p.start_date;
              const e = lr.end_date < p.end_date ? lr.end_date : p.end_date;
              const d1 = new Date(s);
              const d2 = new Date(e);
              const diffDays = Math.max(0, Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) + 1);

              const isPaid = lr.is_paid !== null && lr.is_paid !== undefined
                ? lr.is_paid
                : (lr.leave_type ? lr.leave_type.is_paid !== false : true);

              const typeName = lr.leave_type?.name || (isPaid ? "Paid Leave" : "Unpaid Leave");

              if (isPaid) {
                stats[lr.employee_id].paidLeaveDays += diffDays;
                if (!stats[lr.employee_id].paidLeaveTypeNames.includes(typeName)) {
                  stats[lr.employee_id].paidLeaveTypeNames.push(typeName);
                }
              } else {
                stats[lr.employee_id].unpaidLeaveDays += diffDays;
                if (!stats[lr.employee_id].unpaidLeaveTypeNames.includes(typeName)) {
                  stats[lr.employee_id].unpaidLeaveTypeNames.push(typeName);
                }
              }
            }
          }

          setAttendanceStats(stats);
        }).catch(() => null);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load payroll period.";
        if (isMounted) setError(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [periodId]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsRecordsLoading(true);
      try {
        const recs = await payrollApi.listRecords(periodId, { page, limit });
        if (isMounted) setRecordsResponse(recs);
      } catch {
        // Silent error handling
      } finally {
        if (isMounted) setIsRecordsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [periodId, page, limit]);

  // Handle Generate Payroll
  const handleGeneratePayroll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGenerateError(null);

    const manualInputs = Object.entries(manualDeductions)
      .filter(([, amt]) => amt.trim() !== "")
      .map(([empId, amt]) => ({
        employeeId: empId,
        amount: amt.trim(),
      }));

    setIsGenerating(true);
    try {
      await payrollApi.generatePayroll(periodId, {
        manualAbsenceDeductions: manualInputs.length > 0 ? manualInputs : undefined,
      });
      toast.success("Payroll Generated", "Workforce payroll calculated successfully.");
      setIsGenerateOpen(false);
      fetchPeriodDetails();
      fetchRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate payroll.";
      setGenerateError(msg);
      toast.error("Generation Failed", msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Finalize Payroll
  const handleFinalizePayroll = async () => {
    try {
      await payrollApi.finalizePayroll(periodId);
      toast.success("Payroll Finalized", "Payroll records locked and historical snapshot created.");
      setIsFinalizeOpen(false);
      fetchPeriodDetails();
      fetchRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to finalize payroll.";
      toast.error("Finalization Failed", msg);
    }
  };

  // Handle Mark Paid
  const handleMarkPaid = async () => {
    try {
      await payrollApi.markPaid(periodId);
      toast.success("Payroll Marked Paid", "Payroll period status updated to PAID.");
      setIsMarkPaidOpen(false);
      fetchPeriodDetails();
      fetchRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to mark payroll paid.";
      toast.error("Action Failed", msg);
    }
  };

  // Handle Cancel Period
  const handleCancelPeriod = async () => {
    try {
      await payrollApi.cancelPeriod(periodId);
      toast.success("Period Cancelled", "Payroll period status updated to CANCELLED.");
      setIsCancelOpen(false);
      fetchPeriodDetails();
      fetchRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel payroll period.";
      toast.error("Cancellation Failed", msg);
    }
  };

  // Handle Reopen Period For Correction
  const handleReopenPeriodForCorrection = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!reopenReason.trim()) {
      setReopenError("Reason for reopening is mandatory.");
      return;
    }
    setIsReopening(true);
    setReopenError(null);
    try {
      await payrollApi.reopenPeriodForCorrection(periodId, reopenReason.trim());
      toast.success(
        "Payroll Reopened",
        "Payroll period status updated to CORRECTION REQUIRED."
      );
      setIsReopenOpen(false);
      setReopenReason("");
      fetchPeriodDetails();
      fetchRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reopen payroll period.";
      setReopenError(msg);
      toast.error("Reopen Failed", msg);
    } finally {
      setIsReopening(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer maxWidth="xl" className="py-12 flex flex-col items-center justify-center">
        <Spinner size="lg" className="text-primary mb-3" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          Loading payroll period details...
        </p>
      </PageContainer>
    );
  }

  if (error || !period) {
    return (
      <PageContainer maxWidth="xl" className="py-6">
        <ErrorState
          title="Payroll Period Not Found"
          message={error || "The requested payroll period could not be found."}
          onRetry={() => router.push("/payroll")}
          retryText="Return to Payroll Periods"
        />
      </PageContainer>
    );
  }

  const getMonthName = (monthNum: number) => {
    const date = new Date(2000, monthNum - 1, 1);
    return date.toLocaleString("en-US", { month: "long" });
  };

  const statusBadgeVariant = (s: PayrollPeriodStatus) => {
    switch (s) {
      case PayrollPeriodStatus.PAID:
        return "success";
      case PayrollPeriodStatus.FINALIZED:
        return "primary";
      case PayrollPeriodStatus.DRAFT:
        return "warning";
      case PayrollPeriodStatus.CORRECTION_REQUIRED:
        return "warning";
      case PayrollPeriodStatus.CANCELLED:
        return "neutral";
      default:
        return "neutral";
    }
  };

  const records = recordsResponse?.data || [];
  const totalEmployees = recordsResponse?.meta.total || 0;

  const recordColumns: ColumnDef<PayrollRecord>[] = [
    {
      header: "Employee",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-primary/10 text-primary">
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
      header: "Basic Salary",
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {formatCurrency(row.basic_salary)}
        </span>
      ),
    },
    {
      header: "Days (P/A/L)",
      cell: (row) => (
        <span className="text-xs text-foreground font-medium">
          {row.present_days}P / {row.absent_days}A / {row.leave_days}L
        </span>
      ),
    },
    {
      header: "Gross Salary",
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {formatCurrency(row.gross_salary)}
        </span>
      ),
    },
    {
      header: "Deductions",
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-danger">
          -{formatCurrency(row.total_deductions)}
        </span>
      ),
    },
    {
      header: "Net Salary",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-primary">
          {formatCurrency(row.net_salary)}
        </span>
      ),
    },
    {
      header: "Action",
      cell: (row) => (
        <Button
          size="sm"
          variant="primary"
          className="h-7 text-[11px]"
          onClick={() => router.push(`/payroll/records/${row.id}`)}
        >
          Breakdown <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      ),
    },
  ];

  return (
    <PageContainer maxWidth="xl" className="py-6 space-y-6">
      <PageHeader
        title={`Payroll — ${getMonthName(period.period_month)} ${period.period_year}`}
        description={`Period dates: ${period.start_date} to ${period.end_date}`}
        badge={
          <Badge variant={statusBadgeVariant(period.status)} showDot>
            {period.status}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/payroll">
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back to Payroll
              </Button>
            </Link>

            {period.status === PayrollPeriodStatus.DRAFT && (
              <>
                <Can permission={PermissionCode.PAYROLL_GENERATE}>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Calculator className="w-4 h-4 text-primary" />}
                    onClick={() => setIsGenerateOpen(true)}
                  >
                    Generate Payroll
                  </Button>
                </Can>

                <Can permission={PermissionCode.PAYROLL_FINALIZE}>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Lock className="w-4 h-4" />}
                    onClick={() => setIsFinalizeOpen(true)}
                  >
                    Finalize Payroll
                  </Button>
                </Can>

                <Can permission={PermissionCode.PAYROLL_GENERATE}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger/10"
                    leftIcon={<Ban className="w-4 h-4" />}
                    onClick={() => setIsCancelOpen(true)}
                  >
                    Cancel
                  </Button>
                </Can>
              </>
            )}

            {period.status === PayrollPeriodStatus.FINALIZED && (
              <>
                <Can permission={PermissionCode.PAYROLL_REOPEN_FOR_CORRECTION}>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<RotateCcw className="w-4 h-4 text-amber-500" />}
                    onClick={() => {
                      setReopenError(null);
                      setReopenReason("");
                      setIsReopenOpen(true);
                    }}
                  >
                    Reopen for Correction
                  </Button>
                </Can>

                <Can permission={PermissionCode.PAYROLL_MARK_PAID}>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => setIsMarkPaidOpen(true)}
                  >
                    Mark Paid
                  </Button>
                </Can>
              </>
            )}

            {period.status === PayrollPeriodStatus.CORRECTION_REQUIRED && (
              <Can permission={PermissionCode.PAYROLL_GENERATE}>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Calculator className="w-4 h-4" />}
                  onClick={() => setIsGenerateOpen(true)}
                >
                  Generate Payroll
                </Button>
              </Can>
            )}
          </div>
        }
      />

      {/* Warning Banner for CORRECTION REQUIRED Payroll */}
      {period.status === PayrollPeriodStatus.CORRECTION_REQUIRED && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm">Correction Required</h4>
              <Badge variant="warning" className="text-[10px] uppercase font-bold tracking-wider">
                CORRECTION REQUIRED
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This payroll has been reopened for correction. Review the underlying payroll inputs (attendance, leaves, salary revisions) and regenerate the payroll before finalizing it again.
            </p>
          </div>
        </div>
      )}

      {/* Read-Only Banner for PAID Payroll */}
      {period.status === PayrollPeriodStatus.PAID && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 flex items-start gap-3 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm">Paid Payroll — Read Only</h4>
              <Badge variant="success" className="text-[10px] uppercase font-bold tracking-wider">
                ✓ PAID
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Payroll has been paid and is permanently locked. No further changes, recalculations, or corrections can be made to this payroll.
            </p>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Workforce Records
              </span>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-extrabold text-foreground mt-1">
              {totalEmployees}
            </div>
            <CardDescription>Processed employee payroll records</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Payroll Status
              </span>
              <CircleDollarSign className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-1">
              <Badge variant={statusBadgeVariant(period.status)} showDot className="text-sm px-3 py-1">
                {period.status}
              </Badge>
            </div>
            <CardDescription>
              {period.finalized_at
                ? `Finalized on ${new Date(period.finalized_at).toLocaleDateString()}`
                : "Awaiting finalization lock"}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Payment State
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-base font-extrabold text-foreground mt-1">
              {period.paid_at ? `Paid on ${new Date(period.paid_at).toLocaleDateString()}` : "Unpaid"}
            </div>
            <CardDescription>
              {period.status === PayrollPeriodStatus.PAID
                ? "Disbursements completed"
                : "Pending payment mark"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Payroll Records Section */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-foreground">Employee Payroll Records</h3>

        <FilterBar
          onClearAll={() => setParams({ page: 1 })}
        />

        <DataTable
          columns={recordColumns}
          data={records}
          isLoading={isRecordsLoading}
          emptyTitle="No payroll records found"
          emptyDescription="Click 'Generate Payroll' to process attendance, salary, and advances for this period."
          onRowClick={(rec) => router.push(`/payroll/records/${rec.id}`)}
          pagination={{
            page,
            limit,
            total: recordsResponse?.meta.total || 0,
            totalPages: recordsResponse?.meta.totalPages || 1,
            onPageChange: (p) => setParam("page", p),
            onLimitChange: (l) => setParams({ limit: l, page: 1 }),
          }}
        />
      </div>

      {/* Generate Payroll Modal */}
      <Modal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        title="Generate Payroll"
        description="Calculate payroll for active employees based on salary, attendance, leaves, and policy settings."
      >
        <form onSubmit={handleGeneratePayroll} className="space-y-4">
          {generateError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{generateError}</span>
            </div>
          )}

          <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Absence Deduction Policy Mode:</span>
              <Badge variant={company?.absence_deduction_mode === "MANUAL" ? "warning" : "primary"}>
                {company?.absence_deduction_mode === "MANUAL" ? "Manual Entry Mode" : "Automatic Formula Mode"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              {company?.absence_deduction_mode === "MANUAL"
                ? "Manual mode is active for your company. Please specify the absence deduction amount (₹ / $) for employees with absent days below."
                : "Automatic mode is active. Standard daily formulas will calculate absence deductions automatically. You may optionally enter custom overrides below."}
            </p>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            <h4 className="text-xs font-bold text-foreground">
              {company?.absence_deduction_mode === "MANUAL"
                ? "Enter Manual Absence Deductions (₹ / $)"
                : "Optional Manual Absence Deduction Overrides (₹ / $)"}
            </h4>

            {employees.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Loading active employees...</p>
            ) : (
              employees.map((emp) => {
                const stats = attendanceStats[emp.id];
                const draftRec = (recordsResponse?.data || []).find((r) => r.employee_id === emp.id);
                const absentCount = stats ? stats.absentDays : (draftRec ? draftRec.absent_days : 0);
                const halfCount = stats ? stats.halfDays : (draftRec ? draftRec.half_days : 0);
                const paidLeaveCount = stats ? stats.paidLeaveDays : (draftRec ? (draftRec.paid_leave_days || 0) : 0);
                const unpaidLeaveCount = stats ? stats.unpaidLeaveDays : (draftRec ? (draftRec.unpaid_leave_days || 0) : 0);
                const totalLeaveCount = stats ? (stats.paidLeaveDays + stats.unpaidLeaveDays) : (draftRec ? draftRec.leave_days : 0);

                const unpaidTypesStr = stats?.unpaidLeaveTypeNames?.length ? stats.unpaidLeaveTypeNames.join(", ") : "";

                return (
                  <div key={emp.id} className="p-3 rounded-lg bg-card border border-border space-y-2">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <span>{emp.first_name} {emp.last_name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">({emp.employee_code})</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={absentCount > 0 ? "danger" : "neutral"} className="text-[10px] px-2 py-0.5 font-medium">
                            {absentCount} Absent Day{absentCount === 1 ? "" : "s"}
                          </Badge>
                          {halfCount > 0 && (
                            <Badge variant="warning" className="text-[10px] px-2 py-0.5 font-medium">
                              {halfCount} Half Day{halfCount === 1 ? "" : "s"}
                            </Badge>
                          )}
                          {unpaidLeaveCount > 0 && (
                            <Badge variant="warning" className="text-[10px] px-2 py-0.5 font-medium">
                              {unpaidLeaveCount} Unpaid Leave (Loss of Pay)
                            </Badge>
                          )}
                          {paidLeaveCount > 0 && (
                            <Badge variant="primary" className="text-[10px] px-2 py-0.5 font-medium">
                              {paidLeaveCount} Paid Leave Day{paidLeaveCount === 1 ? "" : "s"}
                            </Badge>
                          )}
                          {unpaidLeaveCount === 0 && paidLeaveCount === 0 && totalLeaveCount > 0 && (
                            <Badge variant="primary" className="text-[10px] px-2 py-0.5 font-medium">
                              {totalLeaveCount} Leave Day{totalLeaveCount === 1 ? "" : "s"}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="w-36 shrink-0">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Deduction (e.g. 500)"
                          value={manualDeductions[emp.id] || ""}
                          onChange={(e) =>
                            setManualDeductions((prev) => ({
                              ...prev,
                              [emp.id]: e.target.value,
                            }))
                          }
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {unpaidLeaveCount > 0 && (
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 p-2 rounded bg-amber-500/10 border border-amber-500/20 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                        <span>
                          Includes {unpaidLeaveCount} unpaid leave day{unpaidLeaveCount === 1 ? "" : "s"}
                          {unpaidTypesStr ? ` (${unpaidTypesStr})` : ""}
                          {company?.absence_deduction_mode === "MANUAL"
                            ? " — Manual absence deduction applies."
                            : " — Automatically calculated as loss of pay."}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsGenerateOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isGenerating}>
              Calculate & Generate
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={isFinalizeOpen}
        onClose={() => setIsFinalizeOpen(false)}
        title="Finalize Payroll Period?"
        description="Finalizing locks all payroll records and creates the immutable historical financial snapshot. This action cannot be undone."
        confirmText="Finalize & Lock"
        variant="primary"
        onConfirm={handleFinalizePayroll}
      />

      <Modal
        isOpen={isMarkPaidOpen}
        onClose={() => setIsMarkPaidOpen(false)}
        title="Mark Payroll as Paid?"
        description="Review disbursement summary before completing payment for this period."
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-secondary/50 border border-border space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Payroll Period:</span>
              <span className="font-semibold text-foreground">
                {getMonthName(period.period_month)} {period.period_year}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Total Employees:</span>
              <span className="font-semibold text-foreground">{totalEmployees}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-2">
              <span className="text-muted-foreground font-medium">Total Net Payable:</span>
              <span className="font-bold font-mono text-primary text-sm">
                {formatCurrency(records.reduce((acc, r) => acc + Number(r.net_salary || 0), 0))}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">Permanent Read-Only Lock Warning</div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Once marked as paid, this payroll will become permanently read-only. You will not be able to edit, regenerate, cancel, or add corrections to it.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsMarkPaidOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              onClick={handleMarkPaid}
            >
              Mark as Paid
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmationDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        title="Cancel Payroll Period?"
        description="Are you sure you want to cancel this draft payroll period? All generated draft records will be discarded."
        confirmText="Cancel Period"
        variant="danger"
        onConfirm={handleCancelPeriod}
      />

      {/* Reopen for Correction Modal */}
      <Modal
        isOpen={isReopenOpen}
        onClose={() => setIsReopenOpen(false)}
        title="Reopen Payroll for Correction?"
        description="Reopening a finalized payroll enables recalculation using updated attendance, leave, or salary source data."
      >
        <form onSubmit={handleReopenPeriodForCorrection} className="space-y-4">
          {reopenError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{reopenError}</span>
            </div>
          )}

          <div className="p-3.5 rounded-lg bg-secondary/50 border border-border space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Payroll Period:</span>
              <span className="font-semibold text-foreground">
                {getMonthName(period.period_month)} {period.period_year}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Current Status:</span>
              <Badge variant="primary" className="text-[10px]">
                FINALIZED
              </Badge>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-2">
              <span className="text-muted-foreground font-medium">Current Net Payable:</span>
              <span className="font-bold font-mono text-primary text-sm">
                {formatCurrency(records.reduce((acc, r) => acc + Number(r.net_salary || 0), 0))}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              Reason for Reopening <span className="text-danger">*</span>
            </label>
            <textarea
              rows={3}
              className="w-full p-2.5 rounded-lg bg-card border border-border text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="Describe why this finalized payroll is being reopened for correction (e.g. Approved paid leave was incorrectly treated as absence)..."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              required
            />
          </div>

          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">Workflow Notice & Audit Trail</div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                This payroll has already been finalized. Reopening it will allow the payroll to be recalculated using the existing payroll workflow. The payroll has not yet been marked as paid.
              </p>
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                This action will be recorded in Audit Logs.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsReopenOpen(false)}
              disabled={isReopening}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isReopening}>
              Reopen for Correction
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}

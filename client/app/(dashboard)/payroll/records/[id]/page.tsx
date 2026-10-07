"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { Can } from "@/components/auth/can";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils/format-currency";
import { payrollApi } from "@/lib/api/payroll";
import { payslipsApi } from "@/lib/api/payslips";
import {
  PayrollRecord,
  PayrollRecordStatus,
  PayrollPeriodStatus,
  PayrollCorrection,
  PayrollCorrectionType,
  PayrollCorrectionStatus,
  PayrollRecordCorrectionsBreakdown,
} from "@/types/payroll";
import { Payslip } from "@/types/payslip";
import { PermissionCode } from "@/lib/permissions/codes";
import {
  ArrowLeft,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Plus,
  Lock,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  Banknote,
} from "lucide-react";

export default function PayrollRecordBreakdownPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const recordId = resolvedParams.id;
  const router = useRouter();
  const { toast } = useToast();

  const [record, setRecord] = useState<PayrollRecord | null>(null);
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [correctionsBreakdown, setCorrectionsBreakdown] = useState<PayrollRecordCorrectionsBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPayslip, setIsGeneratingPayslip] = useState(false);

  // Add Correction Modal State
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [corrType, setCorrType] = useState<PayrollCorrectionType>(PayrollCorrectionType.ABSENCE_DEDUCTION_REVERSAL);
  const [corrAmount, setCorrAmount] = useState("");
  const [corrReason, setCorrReason] = useState("");
  const [corrError, setCorrError] = useState<string | null>(null);
  const [isCorrSubmitting, setIsCorrSubmitting] = useState(false);

  // Reverse Correction Modal State
  const [reversingCorrection, setReversingCorrection] = useState<PayrollCorrection | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [reverseError, setReverseError] = useState<string | null>(null);
  const [isReverseSubmitting, setIsReverseSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const rec = await payrollApi.getRecord(recordId);
      setRecord(rec);

      payslipsApi
        .getByPayrollRecord(rec.id)
        .then((ps) => setPayslip(ps))
        .catch(() => setPayslip(null));

      payrollApi
        .getRecordCorrections(rec.id)
        .then((cb) => setCorrectionsBreakdown(cb))
        .catch(() => setCorrectionsBreakdown(null));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load payroll record breakdown.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    let isMounted = true;
    const fetchRecordData = async () => {
      try {
        const rec = await payrollApi.getRecord(recordId);
        if (!isMounted) return;
        setRecord(rec);

        payslipsApi
          .getByPayrollRecord(rec.id)
          .then((ps) => { if (isMounted) setPayslip(ps); })
          .catch(() => { if (isMounted) setPayslip(null); });

        payrollApi
          .getRecordCorrections(rec.id)
          .then((cb) => { if (isMounted) setCorrectionsBreakdown(cb); })
          .catch(() => { if (isMounted) setCorrectionsBreakdown(null); });
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to load payroll record breakdown.";
        setError(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRecordData();
    return () => { isMounted = false; };
  }, [recordId]);

  const handleCreateOrViewPayslip = async () => {
    if (payslip) {
      router.push(`/payslips/${payslip.id}`);
      return;
    }

    setIsGeneratingPayslip(true);
    try {
      const ps = await payslipsApi.createPayslip(recordId);
      toast.success("Payslip Generated", `Created payslip #${ps.payslip_number}`);
      setPayslip(ps);
      router.push(`/payslips/${ps.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate payslip.";
      toast.error("Payslip Generation Failed", msg);
    } finally {
      setIsGeneratingPayslip(false);
    }
  };

  const _handleOpenAddCorrection = () => {
    setCorrType(PayrollCorrectionType.ABSENCE_DEDUCTION_REVERSAL);
    setCorrAmount("");
    setCorrReason("");
    setCorrError(null);
    setIsCorrectionOpen(true);
  };

  const handleAddCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCorrError(null);

    const numAmount = Number(corrAmount);
    if (isNaN(numAmount) || numAmount === 0) {
      setCorrError("Correction amount must be a valid non-zero number.");
      return;
    }

    if (!corrReason.trim()) {
      setCorrError("Reason for correction is mandatory.");
      return;
    }

    setIsCorrSubmitting(true);
    try {
      await payrollApi.createRecordCorrection(recordId, {
        type: corrType,
        amount: corrAmount.trim(),
        reason: corrReason.trim(),
      });
      toast.success("Payroll Correction Applied", "Successfully recorded payroll adjustment.");
      setIsCorrectionOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to apply payroll correction.";
      setCorrError(msg);
    } finally {
      setIsCorrSubmitting(false);
    }
  };

  const handleOpenReverse = (corr: PayrollCorrection) => {
    setReversingCorrection(corr);
    setReverseReason("");
    setReverseError(null);
  };

  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingCorrection) return;

    setReverseError(null);
    if (!reverseReason.trim()) {
      setReverseError("Reason for reversal is mandatory.");
      return;
    }

    setIsReverseSubmitting(true);
    try {
      await payrollApi.reverseRecordCorrection(reversingCorrection.id, {
        reason: reverseReason.trim(),
      });
      toast.success("Correction Reversed", "Successfully reversed payroll correction.");
      setReversingCorrection(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reverse correction.";
      setReverseError(msg);
    } finally {
      setIsReverseSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer maxWidth="xl" className="py-12 flex flex-col items-center justify-center">
        <Spinner size="lg" className="text-primary mb-3" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          Loading payroll breakdown...
        </p>
      </PageContainer>
    );
  }

  if (error || !record) {
    return (
      <PageContainer maxWidth="xl" className="py-6">
        <ErrorState
          title="Record Not Found"
          message={error || "The requested payroll record could not be found."}
          onRetry={() => router.push("/payroll")}
          retryText="Return to Payroll"
        />
      </PageContainer>
    );
  }

  const statusBadgeVariant = (s: PayrollRecordStatus) => {
    switch (s) {
      case PayrollRecordStatus.PAID:
        return "success";
      case PayrollRecordStatus.FINALIZED:
        return "primary";
      case PayrollRecordStatus.DRAFT:
        return "warning";
      default:
        return "neutral";
    }
  };

  const isFinalizedOrPaid = record.status !== PayrollRecordStatus.DRAFT;
  const originalNetPay = correctionsBreakdown?.originalNetPay || record.net_salary;
  const totalAdjustments = correctionsBreakdown?.totalCorrectionsAmount || "0.00";
  const adjustedNetPay = correctionsBreakdown?.adjustedNetPay || record.net_salary;

  return (
    <PageContainer maxWidth="xl" className="py-6 space-y-6">
      <PageHeader
        title={`${record.employee?.first_name} ${record.employee?.last_name}`}
        description={`Employee Code: ${record.employee?.employee_code} | Record ID: ${record.id.substring(0, 8)}`}
        badge={
          <Badge variant={statusBadgeVariant(record.status)} showDot>
            {record.status}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            {record.payroll_period_id && (
              <Link href={`/payroll/${record.payroll_period_id}`}>
                <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  Back to Period
                </Button>
              </Link>
            )}

            <Can permission={PermissionCode.PAYSLIP_CREATE}>
              <Button
                variant="primary"
                size="sm"
                leftIcon={payslip ? <FileSpreadsheet className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                isLoading={isGeneratingPayslip}
                onClick={handleCreateOrViewPayslip}
              >
                {payslip ? "View Payslip" : "Generate Payslip"}
              </Button>
            </Can>
          </div>
        }
      />

      {/* Read-Only Banner for PAID Records */}
      {(record.status === PayrollRecordStatus.PAID || record.payroll_period?.status === PayrollPeriodStatus.PAID) && (
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
              Payment has been recorded for this payroll. The payroll record and its financial values cannot be changed.
            </p>
          </div>
        </div>
      )}

      {/* Snapshot Immutability Notice for Finalized (unpaid) Records */}
      {record.status === PayrollRecordStatus.FINALIZED && record.payroll_period?.status !== PayrollPeriodStatus.PAID && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Finalized Snapshot:</strong> Original payroll values cannot be directly edited. Reopen the payroll period for correction if a source-data correction is required.
            </span>
          </div>
          {record.payroll_period_id && (
            <Link href={`/payroll/${record.payroll_period_id}`}>
              <Button
                size="sm"
                variant="outline"
                className="text-xs px-3 border-amber-500/40 bg-amber-500/20 text-amber-900 dark:text-amber-100 hover:bg-amber-500/30 shrink-0"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Go to Payroll Period
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Net Salary Summary Banner */}
      <Card className="bg-primary/5 border-primary/30">
        <CardContent className="p-6 flex flex-wrap items-center justify-between gap-6">
          <div>
            <span className="text-xs uppercase text-muted-foreground font-bold tracking-wider block">
              Adjusted Net Payable Salary
            </span>
            <div className="text-4xl font-extrabold font-mono text-primary mt-1">
              {formatCurrency(adjustedNetPay)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Original Net: {formatCurrency(originalNetPay)} | Adjustments: {Number(totalAdjustments) >= 0 ? `+${formatCurrency(totalAdjustments)}` : formatCurrency(totalAdjustments)}
            </p>
          </div>

          <div className="flex items-center gap-6 border-l border-border pl-6 flex-wrap">
            <div>
              <span className="text-[11px] uppercase text-muted-foreground font-semibold block">
                Original Net Salary
              </span>
              <div className="text-lg font-bold font-mono text-foreground">
                {formatCurrency(originalNetPay)}
              </div>
            </div>

            <div>
              <span className="text-[11px] uppercase text-muted-foreground font-semibold block">
                Total Adjustments
              </span>
              <div className={`text-lg font-bold font-mono ${Number(totalAdjustments) >= 0 ? "text-emerald-500" : "text-danger"}`}>
                {Number(totalAdjustments) >= 0 ? `+${formatCurrency(totalAdjustments)}` : formatCurrency(totalAdjustments)}
              </div>
            </div>

            <div>
              <span className="text-[11px] uppercase text-muted-foreground font-semibold block">
                Gross Salary
              </span>
              <div className="text-lg font-bold font-mono text-foreground">
                {formatCurrency(record.gross_salary)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Information Section (Phase 13) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="w-4 h-4 text-emerald-500" /> Payment Information
          </CardTitle>
          <CardDescription>Individual disbursement tracking and record payment status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-secondary/40 border border-border space-y-1">
              <span className="text-muted-foreground uppercase text-[10px] font-bold block">Payment Status</span>
              <div className="flex items-center gap-2">
                <Badge variant={record.payment_status === "PAID" || record.status === PayrollRecordStatus.PAID ? "success" : "neutral"} showDot>
                  {record.payment_status === "PAID" || record.status === PayrollRecordStatus.PAID ? "PAID" : "UNPAID"}
                </Badge>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-secondary/40 border border-border space-y-1">
              <span className="text-muted-foreground uppercase text-[10px] font-bold block">Payment Date</span>
              <div className="font-semibold text-foreground font-mono">
                {record.payment_date || (record.paid_at ? new Date(record.paid_at).toLocaleDateString() : "—")}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-secondary/40 border border-border space-y-1">
              <span className="text-muted-foreground uppercase text-[10px] font-bold block">Payment Method</span>
              <div className="font-semibold text-foreground">
                {record.payment_method ? record.payment_method.replace(/_/g, " ") : "—"}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-secondary/40 border border-border space-y-1">
              <span className="text-muted-foreground uppercase text-[10px] font-bold block">Payment Reference</span>
              <div className="font-semibold text-foreground font-mono">
                {record.payment_reference || "—"}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-secondary/40 border border-border space-y-1">
              <span className="text-muted-foreground uppercase text-[10px] font-bold block">Paid By</span>
              <div className="font-semibold text-foreground">
                {record.paid_by_user ? `${record.paid_by_user.first_name} ${record.paid_by_user.last_name}` : record.paid_by ? "Admin" : "—"}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-secondary/40 border border-border space-y-1">
              <span className="text-muted-foreground uppercase text-[10px] font-bold block">Paid At Timestamp</span>
              <div className="font-semibold text-foreground font-mono">
                {record.paid_at ? new Date(record.paid_at).toLocaleString() : "—"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Corrections & Adjustments Section */}
      {isFinalizedOrPaid && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Corrections & Post-Finalization Adjustments
              </CardTitle>
              <CardDescription>Audit-tracked adjustments applied after payroll snapshot finalization</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!correctionsBreakdown || correctionsBreakdown.corrections.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground border border-dashed border-border rounded-xl text-xs">
                No post-finalization corrections or adjustments recorded for this payroll.
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-3 py-2">Correction Type</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Reason</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Performed By</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {correctionsBreakdown.corrections.map((c) => {
                      const isPositive = Number(c.amount) >= 0;
                      const formattedAmountStr = isPositive ? `+${formatCurrency(c.amount)}` : formatCurrency(c.amount);

                      return (
                        <tr key={c.id} className="hover:bg-secondary/30">
                          <td className="px-3 py-2 font-medium text-foreground">
                            {c.correction_type.replace(/_/g, " ")}
                          </td>
                          <td className={`px-3 py-2 font-mono font-bold ${isPositive ? "text-emerald-500" : "text-danger"}`}>
                            {formattedAmountStr}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground max-w-xs truncate">
                            {c.reason}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant={
                                c.status === PayrollCorrectionStatus.APPLIED
                                  ? "success"
                                  : c.status === PayrollCorrectionStatus.REVERSED
                                  ? "danger"
                                  : "warning"
                              }
                              showDot
                              className="text-[10px]"
                            >
                              {c.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {c.created_by_user
                              ? `${c.created_by_user.first_name} ${c.created_by_user.last_name}`
                              : "System"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground font-mono">
                            {new Date(c.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {c.status === PayrollCorrectionStatus.APPLIED &&
                              record.status === PayrollRecordStatus.FINALIZED &&
                              record.payroll_period?.status !== PayrollPeriodStatus.PAID && (
                              <Can permission={PermissionCode.PAYROLL_CORRECTION_REVERSE}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[11px] px-2 border-danger/30 text-danger hover:bg-danger/10"
                                  leftIcon={<RotateCcw className="w-3 h-3" />}
                                  onClick={() => handleOpenReverse(c)}
                                >
                                  Reverse
                                </Button>
                              </Can>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Attendance Summary */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Attendance Summary
            </CardTitle>
            <CardDescription>Monthly presence & absence log</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Working Days</span>
              <span className="font-bold text-foreground">{record.working_days} days</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-emerald-500 font-medium">Present Days</span>
              <span className="font-bold text-foreground">{record.present_days} days</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-danger font-medium">Absent Days</span>
              <span className="font-bold text-foreground">{record.absent_days} days</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-warning font-medium">Half Days</span>
              <span className="font-bold text-foreground">{record.half_days} days</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-emerald-600 font-medium">Paid Leave</span>
              <span className="font-bold text-foreground">{record.paid_leave_days ?? record.leave_days} days</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-warning font-medium">Unpaid Leave</span>
              <span className="font-bold text-foreground">{record.unpaid_leave_days ?? 0} days</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Holidays</span>
              <span className="font-bold text-foreground">{record.holiday_days} days</span>
            </div>
          </CardContent>
        </Card>

        {/* Earnings Breakdown */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Earnings Breakdown
            </CardTitle>
            <CardDescription>Basic salary + allowances & bonuses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Basic Salary</span>
              <span className="font-mono font-semibold text-foreground">
                {formatCurrency(record.basic_salary)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Overtime Pay</span>
              <span className="font-mono font-semibold text-foreground">
                +{formatCurrency(record.overtime_amount)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Bonus Amount</span>
              <span className="font-mono font-semibold text-foreground">
                +{formatCurrency(record.bonus_amount)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Sales Incentive</span>
              <span className="font-mono font-semibold text-foreground">
                +{formatCurrency(record.incentive_amount)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Other Earnings</span>
              <span className="font-mono font-semibold text-foreground">
                +{formatCurrency(record.other_earnings)}
              </span>
            </div>
            <div className="flex justify-between py-2 font-bold text-sm bg-secondary/50 px-2 rounded">
              <span className="text-foreground">Gross Salary</span>
              <span className="font-mono text-emerald-500">
                {formatCurrency(record.gross_salary)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Deductions Breakdown */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-danger" /> Deductions Breakdown
            </CardTitle>
            <CardDescription>Absence, unpaid leave & advance deductions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border">
              <div>
                <span className="text-muted-foreground block">Absence Deduction</span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {record.absence_deduction_mode === "MANUAL"
                    ? "Manual Absence Deduction"
                    : "Automatic Absence Deduction"}
                </span>
              </div>
              <span className="font-mono font-semibold text-danger">
                -{formatCurrency(record.absence_deduction)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Unpaid Leave Deduction</span>
              <span className="font-mono font-semibold text-danger">
                -{formatCurrency(record.unpaid_leave_deduction || "0.00")}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border font-medium">
              <span className="text-primary">Advance Deduction</span>
              <span className="font-mono font-bold text-primary">
                -{formatCurrency(record.advance_deduction)}
              </span>
            </div>
            {Number(record.loan_deduction || 0) > 0 && (
              <div className="flex justify-between py-1.5 border-b border-border font-medium">
                <span className="text-primary">Loan Repayment</span>
                <span className="font-mono font-bold text-primary">
                  -{formatCurrency(record.loan_deduction || "0.00")}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Other Deductions</span>
              <span className="font-mono font-semibold text-danger">
                -{formatCurrency(record.other_deductions)}
              </span>
            </div>
            <div className="flex justify-between py-2 font-bold text-sm bg-secondary/50 px-2 rounded">
              <span className="text-foreground">Total Deductions</span>
              <span className="font-mono text-danger">
                -{formatCurrency(record.total_deductions)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Correction Modal */}
      <Modal
        isOpen={isCorrectionOpen}
        onClose={() => setIsCorrectionOpen(false)}
        title="Add Payroll Correction / Adjustment"
        description={`Record a post-finalization adjustment for ${record.employee?.first_name} ${record.employee?.last_name}.`}
      >
        <form onSubmit={handleAddCorrectionSubmit} className="space-y-4 text-xs">
          {corrError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{corrError}</span>
            </div>
          )}

          <Select
            label="Correction Type"
            required
            value={corrType}
            onChange={(e) => setCorrType(e.target.value as PayrollCorrectionType)}
            options={[
              { value: PayrollCorrectionType.ABSENCE_DEDUCTION_REVERSAL, label: "ABSENCE DEDUCTION REVERSAL (Reimburse incorrect absence deduction)" },
              { value: PayrollCorrectionType.ABSENCE_DEDUCTION_ADJUSTMENT, label: "ABSENCE DEDUCTION ADJUSTMENT" },
              { value: PayrollCorrectionType.PAID_LEAVE_ADJUSTMENT, label: "PAID LEAVE ADJUSTMENT" },
              { value: PayrollCorrectionType.UNPAID_LEAVE_ADJUSTMENT, label: "UNPAID LEAVE ADJUSTMENT" },
              { value: PayrollCorrectionType.SALARY_ADJUSTMENT, label: "SALARY ADJUSTMENT" },
              { value: PayrollCorrectionType.ADVANCE_ADJUSTMENT, label: "ADVANCE ADJUSTMENT" },
              { value: PayrollCorrectionType.OTHER, label: "OTHER ADJUSTMENT" },
            ]}
          />

          <Input
            label="Adjustment Amount"
            placeholder="e.g. 1000.00 for addition or -500.00 for deduction"
            required
            value={corrAmount}
            onChange={(e) => setCorrAmount(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground -mt-2">
            Use positive values (e.g. <code>1000.00</code>) to increase payable salary, or negative values (e.g. <code>-500.00</code>) to decrease payable salary.
          </p>

          <Input
            label="Reason for Correction"
            placeholder="Detailed explanation of the adjustment reason..."
            required
            value={corrReason}
            onChange={(e) => setCorrReason(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCorrectionOpen(false)}
              disabled={isCorrSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isCorrSubmitting}>
              Apply Correction
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reverse Correction Modal */}
      <Modal
        isOpen={!!reversingCorrection}
        onClose={() => setReversingCorrection(null)}
        title="Reverse Payroll Correction"
        description="Create a compensating transaction to reverse an applied correction."
      >
        <form onSubmit={handleReverseSubmit} className="space-y-4 text-xs">
          {reverseError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{reverseError}</span>
            </div>
          )}

          {reversingCorrection && (
            <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-1">
              <div className="font-semibold text-foreground">
                Reversing: {reversingCorrection.correction_type.replace(/_/g, " ")}
              </div>
              <div className="text-muted-foreground">
                Original Amount: {formatCurrency(reversingCorrection.amount)} | Reversal Amount: {formatCurrency((-Number(reversingCorrection.amount)).toFixed(2))}
              </div>
            </div>
          )}

          <Input
            label="Reason for Reversal"
            placeholder="Reason why this correction is being reversed..."
            required
            value={reverseReason}
            onChange={(e) => setReverseReason(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setReversingCorrection(null)}
              disabled={isReverseSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={isReverseSubmitting}>
              Reverse Correction
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}

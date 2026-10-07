"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { Can } from "@/components/auth/can";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils/format-currency";
import { formatHumanDate } from "@/lib/utils/format-date";
import { loansApi } from "@/lib/api/loans";
import { EmployeeLoan, LoanRepayment, LoanStatus } from "@/types/loan";
import { PermissionCode } from "@/lib/permissions/codes";
import {
  ArrowLeft,
  Landmark,
  Ban,
} from "lucide-react";

export default function LoanDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const loanId = resolvedParams.id;
  const { toast } = useToast();

  const [loan, setLoan] = useState<EmployeeLoan | null>(null);
  const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancel Dialog
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelNotes] = useState("");

  const fetchLoanData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [loanData, repayData] = await Promise.all([
        loansApi.get(loanId),
        loansApi.getRepayments(loanId),
      ]);
      setLoan(loanData);
      setRepayments(repayData || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load loan details.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    fetchLoanData();
  }, [fetchLoanData]);

  const handleCancelLoan = async () => {
    if (!loan) return;
    setIsCancelling(true);
    try {
      await loansApi.cancel(loan.id, cancelNotes.trim() || undefined);
      toast.success("Loan Cancelled", `Loan ${loan.loan_number} has been cancelled.`);
      setIsCancelOpen(false);
      fetchLoanData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel loan.";
      toast.error("Error", msg);
    } finally {
      setIsCancelling(false);
    }
  };

  const statusBadgeVariant = (status: LoanStatus) => {
    switch (status) {
      case LoanStatus.ACTIVE:
        return "warning";
      case LoanStatus.COMPLETED:
        return "success";
      case LoanStatus.CANCELLED:
        return "neutral";
      default:
        return "neutral";
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center p-12">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  if (error || !loan) {
    return (
      <PageContainer>
        <ErrorState
          message={error || "Loan not found."}
          onRetry={fetchLoanData}
        />
      </PageContainer>
    );
  }

  const principal = parseFloat(loan.principal_amount);
  const outstanding = parseFloat(loan.outstanding_amount);
  const repaid = Math.max(0, principal - outstanding);

  const columns: ColumnDef<LoanRepayment>[] = [
    {
      header: "Repayment Date",
      cell: (row) => (
        <span className="font-medium text-foreground text-xs">
          {formatHumanDate(row.repayment_date)}
        </span>
      ),
    },
    {
      header: "Payroll Period",
      cell: (row) => {
        const period = row.payroll_record?.payroll_period;
        if (!period) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="font-mono text-xs text-foreground">
            {period.period_year}-{period.period_month.toString().padStart(2, "0")} ({formatHumanDate(period.start_date)} - {formatHumanDate(period.end_date)})
          </span>
        );
      },
    },
    {
      header: "Deduction Amount",
      cell: (row) => (
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(parseFloat(row.repayment_amount))}
        </span>
      ),
    },
    {
      header: "Previous Balance",
      cell: (row) => (
        <span className="text-muted-foreground font-mono text-xs">
          {formatCurrency(parseFloat(row.previous_outstanding_amount))}
        </span>
      ),
    },
    {
      header: "Remaining Balance",
      cell: (row) => (
        <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono text-xs">
          {formatCurrency(parseFloat(row.remaining_outstanding_amount))}
        </span>
      ),
    },
  ];

  return (
    <PageContainer>
      <div className="mb-4">
        <Link
          href="/loans"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Employee Loans</span>
        </Link>
      </div>

      <PageHeader
        title={`Loan ${loan.loan_number}`}
        description={`Employee: ${loan.employee?.first_name} ${loan.employee?.last_name} (${loan.employee?.employee_code})`}
        actions={
          loan.status === LoanStatus.ACTIVE && repayments.length === 0 ? (
            <Can permission={PermissionCode.LOAN_CANCEL}>
              <Button
                variant="danger"
                leftIcon={<Ban className="w-4 h-4" />}
                onClick={() => setIsCancelOpen(true)}
                isLoading={isCancelling}
              >
                Cancel Loan
              </Button>
            </Can>
          ) : undefined
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 border border-border bg-card">
          <div className="text-xs text-muted-foreground font-medium mb-1">
            Original Loan Amount
          </div>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(principal)}
          </div>
        </Card>

        <Card className="p-4 border border-border bg-card">
          <div className="text-xs text-muted-foreground font-medium mb-1">
            Total Repaid
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(repaid)}
          </div>
        </Card>

        <Card className="p-4 border border-border bg-card">
          <div className="text-xs text-muted-foreground font-medium mb-1">
            Outstanding Balance
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(outstanding)}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Loan Meta */}
        <Card className="lg:col-span-1 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Loan Information</span>
            <Badge variant={statusBadgeVariant(loan.status)}>
              {loan.status}
            </Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="text-muted-foreground font-medium">Employee</div>
              <div className="font-semibold text-foreground mt-0.5">
                {loan.employee?.first_name} {loan.employee?.last_name}
              </div>
              <div className="text-[11px] font-mono text-muted-foreground">
                {loan.employee?.employee_code}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground font-medium">Loan Issue Date</div>
              <div className="font-medium text-foreground mt-0.5">
                {formatHumanDate(loan.loan_date)}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground font-medium">Repayment Start Date</div>
              <div className="font-medium text-foreground mt-0.5">
                {loan.start_repayment_date ? formatHumanDate(loan.start_repayment_date) : "—"}
              </div>
            </div>

            {loan.reason && (
              <div>
                <div className="text-muted-foreground font-medium">Reason / Purpose</div>
                <div className="text-foreground mt-0.5 whitespace-pre-wrap">
                  {loan.reason}
                </div>
              </div>
            )}

            {loan.notes && (
              <div>
                <div className="text-muted-foreground font-medium">Internal Notes</div>
                <div className="text-foreground mt-0.5 whitespace-pre-wrap">
                  {loan.notes}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Repayment History */}
        <Card className="lg:col-span-2 p-5">
          <CardHeader className="px-0 pt-0 pb-4 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Landmark className="w-4 h-4 text-primary" />
              <span>Repayment History ({repayments.length})</span>
            </CardTitle>
          </CardHeader>
          <div className="pt-3">
            <DataTable
              columns={columns}
              data={repayments}
              emptyTitle="No repayments yet"
              emptyDescription="Repayments will be recorded here automatically when payroll is finalized."
            />
          </div>
        </Card>
      </div>

      <ConfirmationDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onConfirm={handleCancelLoan}
        title="Cancel Employee Loan"
        description={`Are you sure you want to cancel loan ${loan.loan_number}? This action cannot be undone.`}
        confirmText="Yes, Cancel Loan"
        variant="danger"
      />
    </PageContainer>
  );
}

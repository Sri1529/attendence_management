"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/ui/error-state";
import { Can } from "@/components/auth/can";
import { useToast } from "@/hooks/use-toast";
import { useQueryParams } from "@/hooks/use-query-params";
import { formatCurrency } from "@/lib/utils/format-currency";
import { formatHumanDate } from "@/lib/utils/format-date";
import { employeesApi } from "@/lib/api/employees";
import { loansApi } from "@/lib/api/loans";
import { Employee, EmploymentStatus, PaginatedResponse } from "@/types/organization";
import { EmployeeLoan, LoanStatus } from "@/types/loan";
import { PermissionCode } from "@/lib/permissions/codes";
import { Plus, Landmark, Eye, User } from "lucide-react";

export default function LoansPage() {
  const { toast } = useToast();
  const { getIntParam, getParam, setParam, setParams } = useQueryParams();

  const page = getIntParam("page", 1);
  const limit = getIntParam("limit", 20);
  const search = getParam("search", "");
  const statusParam = getParam("status", "ALL");

  const [dataResponse, setDataResponse] = useState<PaginatedResponse<EmployeeLoan> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active employees for dropdown
  const [activeEmployees, setActiveEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form Fields
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [loanDate, setLoanDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [startRepaymentDate, setStartRepaymentDate] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const fetchLoans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await loansApi.list({
        page,
        limit,
        search: search || undefined,
        status: statusParam !== "ALL" ? (statusParam as LoanStatus) : undefined,
      });
      setDataResponse(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch loans.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, statusParam]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const loadActiveEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const res = await employeesApi.list({
        limit: 100,
        employmentStatus: EmploymentStatus.ACTIVE,
      });
      setActiveEmployees(res.data || []);
    } catch {
      toast.error("Error", "Failed to load active employees.");
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const handleOpenCreateModal = () => {
    setSelectedEmployeeId("");
    setPrincipalAmount("");
    setLoanDate(new Date().toISOString().split("T")[0]);
    setStartRepaymentDate("");
    setReason("");
    setNotes("");
    setCreateError(null);
    setIsCreateOpen(true);
    loadActiveEmployees();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!selectedEmployeeId) {
      setCreateError("Please select an employee.");
      return;
    }
    const amt = parseFloat(principalAmount);
    if (isNaN(amt) || amt <= 0) {
      setCreateError("Please enter a valid positive loan amount.");
      return;
    }
    if (!loanDate) {
      setCreateError("Please select a loan date.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newLoan = await loansApi.create({
        employeeId: selectedEmployeeId,
        principalAmount: amt.toFixed(2),
        loanDate,
        startRepaymentDate: startRepaymentDate || undefined,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(
        "Loan Issued Successfully",
        `Loan ${newLoan.loan_number} of ${formatCurrency(amt)} has been recorded.`
      );
      setIsCreateOpen(false);
      fetchLoans();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to issue loan.";
      setCreateError(msg);
    } finally {
      setIsSubmitting(false);
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

  const columns: ColumnDef<EmployeeLoan>[] = [
    {
      header: "Loan No.",
      cell: (row) => (
        <Link
          href={`/loans/${row.id}`}
          className="font-mono text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>{row.loan_number}</span>
        </Link>
      ),
    },
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
      header: "Loan Amount",
      cell: (row) => (
        <span className="font-semibold text-foreground">
          {formatCurrency(parseFloat(row.principal_amount))}
        </span>
      ),
    },
    {
      header: "Outstanding",
      cell: (row) => (
        <span
          className={`font-semibold ${
            parseFloat(row.outstanding_amount) > 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {formatCurrency(parseFloat(row.outstanding_amount))}
        </span>
      ),
    },
    {
      header: "Loan Date",
      cell: (row) => (
        <span className="text-muted-foreground text-xs">
          {formatHumanDate(row.loan_date)}
        </span>
      ),
    },
    {
      header: "Repayment Start",
      cell: (row) => (
        <span className="text-muted-foreground text-xs">
          {row.start_repayment_date ? formatHumanDate(row.start_repayment_date) : "—"}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge variant={statusBadgeVariant(row.status)}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Link href={`/loans/${row.id}`}>
            <Button variant="ghost" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />}>
              Details
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Employee Loans"
        description="Issue employee loans and track monthly salary deductions."
        actions={
          <Can permission={PermissionCode.LOAN_CREATE}>
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreateModal}
            >
              Issue New Loan
            </Button>
          </Can>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => setParam("search", val)}
        onFilterChange={(key, val) => {
          if (key === "status") setParams({ status: val || "ALL", page: 1 });
        }}
        onClearAll={() => setParams({ search: "", status: "ALL", page: 1 })}
        filters={[
          {
            key: "status",
            label: "Status",
            value: statusParam === "ALL" ? "" : statusParam,
            options: [
              { label: "Active", value: LoanStatus.ACTIVE },
              { label: "Completed", value: LoanStatus.COMPLETED },
              { label: "Cancelled", value: LoanStatus.CANCELLED },
            ],
          },
        ]}
      />

      {error ? (
        <ErrorState message={error} onRetry={fetchLoans} />
      ) : (
        <DataTable
          columns={columns}
          data={dataResponse?.data || []}
          isLoading={isLoading}
          emptyTitle="No loans found"
          emptyDescription="No employee loan records matched your query."
          pagination={{
            page,
            limit,
            total: dataResponse?.meta?.total || 0,
            totalPages: dataResponse?.meta?.totalPages || 1,
            onPageChange: (p) => setParam("page", p),
          }}
        />
      )}

      {/* Create Loan Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Issue Employee Loan"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
          {createError && (
            <div className="p-3 text-xs bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg border border-red-500/20 font-medium">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Select Employee *
            </label>
            <Select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              disabled={isLoadingEmployees}
              options={[
                { value: "", label: "-- Select Active Employee --" },
                ...activeEmployees.map((emp) => ({
                  value: emp.id,
                  label: `${emp.first_name} ${emp.last_name} (${emp.employee_code})`,
                })),
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Loan Amount (₹) *"
              type="number"
              step="0.01"
              min="1"
              placeholder="e.g. 20000"
              required
              value={principalAmount}
              onChange={(e) => setPrincipalAmount(e.target.value)}
            />
            <Input
              label="Loan Issue Date *"
              type="date"
              required
              value={loanDate}
              onChange={(e) => setLoanDate(e.target.value)}
            />
          </div>

          <Input
            label="Repayment Start Date (Optional)"
            type="date"
            value={startRepaymentDate}
            onChange={(e) => setStartRepaymentDate(e.target.value)}
            helperText="Expected payroll deduction start date"
          />

          <Textarea
            label="Reason / Purpose"
            placeholder="e.g. Personal emergency, medical expenses..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />

          <Textarea
            label="Internal Notes"
            placeholder="Optional internal comments or authorization details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create & Issue Loan
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}

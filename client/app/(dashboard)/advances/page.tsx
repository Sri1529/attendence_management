"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Drawer } from "@/components/ui/drawer";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { Can } from "@/components/auth/can";
import { useToast } from "@/hooks/use-toast";
import { useQueryParams } from "@/hooks/use-query-params";
import { formatCurrency } from "@/lib/utils/format-currency";
import { employeesApi } from "@/lib/api/employees";
import { advancesApi } from "@/lib/api/advances";
import { Employee, PaginatedResponse } from "@/types/organization";
import { EmployeeAdvance, AdvanceStatus } from "@/types/advances";
import { PermissionCode } from "@/lib/permissions/codes";
import {
  ArrowRight,
  Plus,
  Ban,
  User,
  AlertCircle,
  ExternalLink,
  DollarSign,
  Calendar,
  FileText,
} from "lucide-react";

interface EmployeeAdvanceSummary {
  activeCount: number;
  totalCount: number;
  totalBalance: number;
  lastDate: string | null;
  advances: EmployeeAdvance[];
}

export default function AdvancesDirectoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { getIntParam, getParam, setParam, setParams } = useQueryParams();

  const page = getIntParam("page", 1);
  const limit = getIntParam("limit", 20);
  const search = getParam("search", "");

  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "NO_OUTSTANDING">("ALL");

  const [dataResponse, setDataResponse] = useState<PaginatedResponse<Employee> | null>(null);
  const [advancesSummaryMap, setAdvancesSummaryMap] = useState<Record<string, EmployeeAdvanceSummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSummariesLoading, setIsSummariesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drawer state
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerAdvances, setDrawerAdvances] = useState<EmployeeAdvance[]>([]);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Issue Advance Modal state
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isSubmittingAdvance, setIsSubmittingAdvance] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issueForm, setIssueForm] = useState({
    amount: "",
    advanceDate: new Date().toISOString().split("T")[0],
    reason: "",
    notes: "",
  });

  // Cancel Advance state
  const [cancelAdvance, setCancelAdvance] = useState<EmployeeAdvance | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Helper to compute advance summary for an employee
  const computeSummary = (advances: EmployeeAdvance[]): EmployeeAdvanceSummary => {
    const active = advances.filter((a) => a.status === AdvanceStatus.ACTIVE);
    const activeCount = active.length;
    const totalCount = advances.length;

    let totalBalance = 0;
    for (const a of active) {
      const balStr = a.outstandingBalance !== undefined ? a.outstandingBalance : a.amount;
      const bal = parseFloat(balStr);
      if (!isNaN(bal) && bal > 0) {
        totalBalance += bal;
      }
    }

    const lastDate = advances.length > 0 ? advances[0].advance_date : null;

    return {
      activeCount,
      totalCount,
      totalBalance,
      lastDate,
      advances,
    };
  };

  // Fetch employee advances callback
  const fetchEmployeeAdvances = useCallback(async (employeeId: string) => {
    try {
      const res = await advancesApi.getAdvances(employeeId);
      const summary = computeSummary(res);

      setAdvancesSummaryMap((prev) => ({
        ...prev,
        [employeeId]: summary,
      }));

      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load advances.";
      throw new Error(msg);
    }
  }, []);

  // Fetch directory employees & summary data
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await employeesApi.list({ page, limit, search });
        if (!isMounted) return;
        setDataResponse(res);

        // Fetch advances summaries for employees on the page
        setIsSummariesLoading(true);
        const summaries: Record<string, EmployeeAdvanceSummary> = {};
        await Promise.all(
          res.data.map(async (emp) => {
            try {
              const advs = await advancesApi.getAdvances(emp.id);
              summaries[emp.id] = computeSummary(advs);
            } catch {
              summaries[emp.id] = {
                activeCount: 0,
                totalCount: 0,
                totalBalance: 0,
                lastDate: null,
                advances: [],
              };
            }
          })
        );

        if (isMounted) {
          setAdvancesSummaryMap(summaries);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load employee list.";
        if (isMounted) setError(msg);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsSummariesLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [page, limit, search]);

  // Open Manage Drawer
  const handleOpenDrawer = async (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsDrawerOpen(true);
    setIsDrawerLoading(true);
    setDrawerError(null);

    try {
      const advs = await fetchEmployeeAdvances(emp.id);
      setDrawerAdvances(advs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load advances details.";
      setDrawerError(msg);
    } finally {
      setIsDrawerLoading(false);
    }
  };

  // Open Issue Advance Modal
  const handleOpenIssueModal = () => {
    setIssueForm({
      amount: "",
      advanceDate: new Date().toISOString().split("T")[0],
      reason: "",
      notes: "",
    });
    setIssueError(null);
    setIsIssueModalOpen(true);
  };

  // Submit Issue New Advance
  const handleIssueAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const amtNum = parseFloat(issueForm.amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setIssueError("Please enter a valid positive advance amount.");
      return;
    }

    if (!issueForm.advanceDate) {
      setIssueError("Please select an advance date.");
      return;
    }

    setIsSubmittingAdvance(true);
    setIssueError(null);

    try {
      await advancesApi.createAdvance(selectedEmployee.id, {
        amount: amtNum.toFixed(2),
        advanceDate: issueForm.advanceDate,
        reason: issueForm.reason.trim() || undefined,
        notes: issueForm.notes.trim() || undefined,
      });

      toast.success("Advance Issued", `Salary advance recorded for ${selectedEmployee.first_name}.`);
      setIsIssueModalOpen(false);

      // Refresh drawer advances & directory summary
      setIsDrawerLoading(true);
      const updatedAdvs = await fetchEmployeeAdvances(selectedEmployee.id);
      setDrawerAdvances(updatedAdvs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to issue advance.";
      setIssueError(msg);
      toast.error("Issue Failed", msg);
    } finally {
      setIsSubmittingAdvance(false);
      setIsDrawerLoading(false);
    }
  };

  // Submit Cancel Advance
  const handleConfirmCancel = async () => {
    if (!cancelAdvance || !selectedEmployee) return;

    setIsCancelling(true);
    try {
      await advancesApi.updateAdvanceStatus(cancelAdvance.id, AdvanceStatus.CANCELLED);
      toast.success("Advance Cancelled", `Advance ${cancelAdvance.advance_number} status updated to CANCELLED.`);
      setCancelAdvance(null);

      // Refresh drawer advances & directory summary
      setIsDrawerLoading(true);
      const updatedAdvs = await fetchEmployeeAdvances(selectedEmployee.id);
      setDrawerAdvances(updatedAdvs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel advance.";
      toast.error("Cancellation Failed", msg);
    } finally {
      setIsCancelling(false);
      setIsDrawerLoading(false);
    }
  };

  // Filter table data rows based on statusFilter
  const rawData = dataResponse?.data || [];
  const filteredData = rawData.filter((emp) => {
    const summary = advancesSummaryMap[emp.id];
    if (statusFilter === "ACTIVE") {
      return summary && summary.activeCount > 0;
    }
    if (statusFilter === "NO_OUTSTANDING") {
      return !summary || summary.activeCount === 0;
    }
    return true;
  });

  // Table Columns definition
  const columns: ColumnDef<Employee>[] = [
    {
      header: "Employee",
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-full bg-primary/10 text-primary shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground text-xs">
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
      header: "Employee Code",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-foreground">
          {row.employee_code}
        </span>
      ),
    },
    {
      header: "Department",
      cell: (row) => <span className="text-xs text-foreground">{row.department?.name || "—"}</span>,
    },
    {
      header: "Designation",
      cell: (row) => <span className="text-xs text-foreground font-medium">{row.designation?.name || "—"}</span>,
    },
    {
      header: "Active Advances",
      cell: (row) => {
        const summary = advancesSummaryMap[row.id];
        if (isSummariesLoading && !summary) {
          return <span className="text-xs text-muted-foreground italic">...</span>;
        }
        const activeCount = summary ? summary.activeCount : 0;
        return (
          <Badge variant={activeCount > 0 ? "primary" : "neutral"} className="text-xs font-semibold px-2 py-0.5">
            {activeCount}
          </Badge>
        );
      },
    },
    {
      header: "Outstanding Balance",
      cell: (row) => {
        const summary = advancesSummaryMap[row.id];
        if (isSummariesLoading && !summary) {
          return <span className="text-xs text-muted-foreground italic">...</span>;
        }
        const bal = summary ? summary.totalBalance : 0;
        return (
          <span className={`font-mono text-xs font-bold ${bal > 0 ? "text-danger" : "text-muted-foreground"}`}>
            {formatCurrency(bal.toFixed(2))}
          </span>
        );
      },
    },
    {
      header: "Last Advance",
      cell: (row) => {
        const summary = advancesSummaryMap[row.id];
        if (isSummariesLoading && !summary) {
          return <span className="text-xs text-muted-foreground italic">...</span>;
        }
        return (
          <span className="text-xs text-muted-foreground font-mono">
            {summary && summary.lastDate ? summary.lastDate : "—"}
          </span>
        );
      },
    },
    {
      header: "Action",
      cell: (row) => (
        <Button
          size="sm"
          variant="primary"
          className="h-7 text-xs font-medium"
          onClick={() => handleOpenDrawer(row)}
        >
          Manage <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      ),
    },
  ];

  // Selected employee summary in drawer
  const selectedSummary = selectedEmployee ? advancesSummaryMap[selectedEmployee.id] : null;

  return (
    <Can
      permission={PermissionCode.ADVANCE_VIEW}
      fallback={
        <PageContainer maxWidth="xl" className="py-12">
          <ErrorState
            title="Access Restricted"
            message="You do not have permission to access Salary Advances."
          />
        </PageContainer>
      }
    >
      <PageContainer maxWidth="xl" className="py-6 space-y-6">
        <PageHeader
          title="Salary Advances Directory"
          description="View employee active advance balances, quick-manage advances, and issue new salary advances."
          badge={
            <Badge variant="primary" showDot>
              Advances Directory
            </Badge>
          }
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex-1">
            <FilterBar
              searchValue={search}
              onSearchChange={(val) => setParams({ search: val, page: 1 })}
              onClearAll={() => {
                setParams({ search: "", page: 1 });
                setStatusFilter("ALL");
              }}
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto bg-card border border-border p-1 rounded-lg">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === "ALL"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              All Employees
            </button>
            <button
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === "ACTIVE"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              Has Active Advance
            </button>
            <button
              onClick={() => setStatusFilter("NO_OUTSTANDING")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === "NO_OUTSTANDING"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              No Outstanding
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={isLoading}
          error={error}
          emptyTitle="No employees found"
          emptyDescription="No employees match your search or advance filter criteria."
          onRowClick={(emp) => handleOpenDrawer(emp)}
          pagination={{
            page,
            limit,
            total: dataResponse?.meta.total || 0,
            totalPages: dataResponse?.meta.totalPages || 1,
            onPageChange: (p) => setParam("page", p),
            onLimitChange: (l) => setParams({ limit: l, page: 1 }),
          }}
        />

        {/* QUICK MANAGEMENT DRAWER */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          size="lg"
          title={
            selectedEmployee ? (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-foreground">
                      {selectedEmployee.first_name} {selectedEmployee.last_name}
                    </span>
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      ({selectedEmployee.employee_code})
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground font-medium mt-0.5">
                    {selectedEmployee.department?.name || "No Department"} • {selectedEmployee.designation?.name || "No Designation"}
                  </div>
                </div>
              </div>
            ) : (
              "Employee Salary Advances"
            )
          }
          description={
            selectedEmployee && (
              <button
                onClick={() => router.push(`/employees/${selectedEmployee.id}?tab=advances`)}
                className="inline-flex items-center text-xs font-semibold text-primary hover:underline mt-1"
              >
                View Full Employee Workspace <ExternalLink className="w-3 h-3 ml-1" />
              </button>
            )
          }
        >
          {selectedEmployee && (
            <div className="space-y-6">
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-secondary/40 border border-border space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Total Advances
                  </span>
                  <div className="text-base font-bold text-foreground">
                    {selectedSummary ? selectedSummary.totalCount : drawerAdvances.length}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-secondary/40 border border-border space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Active Advances
                  </span>
                  <div className="text-base font-bold text-primary">
                    {selectedSummary ? selectedSummary.activeCount : drawerAdvances.filter((a) => a.status === AdvanceStatus.ACTIVE).length}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-secondary/40 border border-border space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Outstanding Balance
                  </span>
                  <div className="text-base font-mono font-bold text-danger">
                    {formatCurrency((selectedSummary ? selectedSummary.totalBalance : 0).toFixed(2))}
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Advance History
                </h4>
                <Can permission={PermissionCode.ADVANCE_CREATE}>
                  <Button
                    size="sm"
                    variant="primary"
                    className="h-8 text-xs"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={handleOpenIssueModal}
                  >
                    Issue New Advance
                  </Button>
                </Can>
              </div>

              {/* Drawer Error State */}
              {drawerError && (
                <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{drawerError}</span>
                </div>
              )}

              {/* Advances List */}
              {isDrawerLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="md" />
                </div>
              ) : drawerAdvances.length === 0 ? (
                <div className="text-center py-12 bg-secondary/20 rounded-xl border border-dashed border-border p-6 space-y-3">
                  <DollarSign className="w-8 h-8 mx-auto text-muted-foreground/60" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">No advances found for this employee.</p>
                    <p className="text-[11px] text-muted-foreground">
                      Click &quot;Issue New Advance&quot; above to grant a salary advance.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {drawerAdvances.map((adv) => (
                    <div
                      key={adv.id}
                      className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-xs hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground">
                            {adv.advance_number}
                          </span>
                          <Badge
                            variant={
                              adv.status === AdvanceStatus.ACTIVE
                                ? "primary"
                                : adv.status === AdvanceStatus.SETTLED
                                ? "success"
                                : "neutral"
                            }
                            showDot
                            className="text-[10px]"
                          >
                            {adv.status}
                          </Badge>
                        </div>
                        <div className="font-mono text-xs font-bold text-foreground">
                          {formatCurrency(adv.amount)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/60">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                          <span>Date: <strong className="text-foreground font-mono">{adv.advance_date}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 justify-end">
                          <span>Outstanding: <strong className="text-foreground font-mono">{formatCurrency(adv.outstandingBalance || adv.amount)}</strong></span>
                        </div>
                      </div>

                      {adv.reason && (
                        <div className="text-[11px] text-muted-foreground flex items-start gap-1.5 pt-0.5">
                          <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/70" />
                          <span className="italic">&quot;{adv.reason}&quot;</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border/40">
                        <button
                          onClick={() => router.push(`/employees/${selectedEmployee.id}?tab=advances`)}
                          className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                        >
                          View Details & Repayments <ArrowRight className="w-3 h-3" />
                        </button>

                        <Can permission={PermissionCode.ADVANCE_UPDATE}>
                          {adv.status === AdvanceStatus.ACTIVE && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[11px] text-danger hover:bg-danger/10"
                              onClick={() => setCancelAdvance(adv)}
                            >
                              <Ban className="w-3 h-3 mr-1" /> Cancel Advance
                            </Button>
                          )}
                        </Can>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Drawer>

        {/* ISSUE NEW ADVANCE MODAL */}
        <Modal
          isOpen={isIssueModalOpen}
          onClose={() => setIsIssueModalOpen(false)}
          title="Issue Salary Advance"
          description="Grant a new salary advance for the selected employee."
        >
          <form onSubmit={handleIssueAdvanceSubmit} className="space-y-4">
            {issueError && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{issueError}</span>
              </div>
            )}

            {/* Selected Employee Summary Card */}
            {selectedEmployee && (
              <div className="p-3 rounded-lg bg-secondary/50 border border-border flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Target Employee
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                  {selectedEmployee.employee_code}
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Advance Amount (₹ / $) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="1"
                placeholder="e.g. 5000"
                value={issueForm.amount}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, amount: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Advance Date *
              </label>
              <Input
                type="date"
                value={issueForm.advanceDate}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, advanceDate: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Reason
              </label>
              <Input
                type="text"
                placeholder="e.g. Emergency medical expense"
                value={issueForm.reason}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, reason: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Internal Notes
              </label>
              <Textarea
                placeholder="Additional notes for payroll records"
                value={issueForm.notes}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsIssueModalOpen(false)}
                disabled={isSubmittingAdvance}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingAdvance}
              >
                Issue Advance
              </Button>
            </div>
          </form>
        </Modal>

        {/* CANCEL ADVANCE CONFIRMATION DIALOG */}
        <ConfirmationDialog
          isOpen={!!cancelAdvance}
          onClose={() => setCancelAdvance(null)}
          onConfirm={handleConfirmCancel}
          title="Cancel Salary Advance"
          description={
            cancelAdvance
              ? `Are you sure you want to cancel advance ${cancelAdvance.advance_number} of ${formatCurrency(cancelAdvance.amount)}? This action will mark the advance as CANCELLED.`
              : ""
          }
          confirmText="Yes, Cancel Advance"
          variant="danger"
        />
      </PageContainer>
    </Can>
  );
}

"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { Can } from "@/components/auth/can";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/permissions/rbac";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils/format-currency";
import { employeesApi } from "@/lib/api/employees";
import { attendanceApi } from "@/lib/api/attendance";
import { leaveRecordsApi } from "@/lib/api/leave-records";
import { salaryApi } from "@/lib/api/salary";
import { advancesApi } from "@/lib/api/advances";
import { loansApi } from "@/lib/api/loans";
import { payslipsApi } from "@/lib/api/payslips";

import { Employee, EmploymentStatus, PaginatedResponse } from "@/types/organization";
import { Attendance, AttendanceStatus } from "@/types/attendance";
import { LeaveRecord, LeaveStatus } from "@/types/leave";
import { SalaryHistory, SalaryAdjustment, AdjustmentType, AdjustmentStatus } from "@/types/salary";
import { EmployeeAdvance, AdvanceRepayment, AdvanceStatus } from "@/types/advances";
import { EmployeeLoan, LoanStatus } from "@/types/loan";
import { PayrollRecord } from "@/types/payroll";
import { Payslip } from "@/types/payslip";
import { PermissionCode } from "@/lib/permissions/codes";
import {
  ArrowLeft,
  Edit2,
  User,
  Mail,
  Phone,
  Calendar,
  Building2,
  Briefcase,
  CircleDollarSign,
  CalendarCheck2,
  CalendarDays,
  HandCoins,
  Landmark,
  FileSpreadsheet,
  Clock,
  Plus,
  Ban,
  AlertCircle,
  Receipt,
  History,
  Download,
  Eye,
  Wrench,
} from "lucide-react";

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const employeeId = resolvedParams.id;
  const router = useRouter();
  const { toast } = useToast();
  const { permissions: userPermissions } = useAuth();

  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "personal" | "attendance" | "leave" | "salary" | "advances" | "loans" | "payslips"
  >(() => {
    if (
      tabParam === "salary" ||
      tabParam === "advances" ||
      tabParam === "loans" ||
      tabParam === "leave" ||
      tabParam === "attendance" ||
      tabParam === "payslips"
    ) {
      return tabParam;
    }
    return "personal";
  });

  // Lazy Loaded Tab States
  const [attendanceData, setAttendanceData] = useState<PaginatedResponse<Attendance> | null>(null);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);

  const [leaveData, setLeaveData] = useState<PaginatedResponse<LeaveRecord> | null>(null);
  const [isLeaveLoading, setIsLeaveLoading] = useState(false);

  // Salary Tab State
  const [currentSalary, setCurrentSalary] = useState<SalaryHistory | null>(null);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistory[]>([]);
  const [salaryAdjustments, setSalaryAdjustments] = useState<SalaryAdjustment[]>([]);
  const [isSalaryLoading, setIsSalaryLoading] = useState(false);

  // Salary Modals
  const [isAddSalaryOpen, setIsAddSalaryOpen] = useState(false);
  const [newBasicSalary, setNewBasicSalary] = useState("");
  const [newEffectiveFrom, setNewEffectiveFrom] = useState(() => new Date().toISOString().split("T")[0]);
  const [newSalaryNotes, setNewSalaryNotes] = useState("");
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [isSalarySubmitting, setIsSalarySubmitting] = useState(false);

  const [editingSalaryHistory, setEditingSalaryHistory] = useState<SalaryHistory | null>(null);
  const [editSalaryNotes, setEditSalaryNotes] = useState("");

  const [correctingSalary, setCorrectingSalary] = useState<SalaryHistory | null>(null);
  const [correctBasicSalary, setCorrectBasicSalary] = useState("");
  const [correctEffectiveFrom, setCorrectEffectiveFrom] = useState("");
  const [correctNotes, setCorrectNotes] = useState("");
  const [correctError, setCorrectError] = useState<string | null>(null);
  const [isCorrectingSubmitting, setIsCorrectingSubmitting] = useState(false);
  const [isConfirmingCorrection, setIsConfirmingCorrection] = useState(false);

  const openCorrectionModal = (record: SalaryHistory) => {
    setCorrectingSalary(record);
    setCorrectBasicSalary(record.basic_salary);
    setCorrectEffectiveFrom(record.effective_from);
    setCorrectNotes(record.notes || "");
    setCorrectError(null);
    setIsConfirmingCorrection(false);
  };

  const handleCorrectSalary = async () => {
    if (!correctingSalary) return;
    setIsCorrectingSubmitting(true);
    setCorrectError(null);
    try {
      await salaryApi.correctHistory(correctingSalary.id, {
        basicSalary: correctBasicSalary,
        effectiveFrom: correctEffectiveFrom,
        notes: correctNotes,
      });
      toast.success("Salary Record Corrected", "The salary record has been corrected successfully.");
      setCorrectingSalary(null);
      setIsConfirmingCorrection(false);
      loadSalaryData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to correct salary record.";
      setCorrectError(msg);
      toast.error("Correction Failed", msg);
    } finally {
      setIsCorrectingSubmitting(false);
    }
  };

  const [isAddAdjustmentOpen, setIsAddAdjustmentOpen] = useState(false);
  const [adjType, setAdjType] = useState<AdjustmentType>(AdjustmentType.OVERTIME);
  const [adjAmount, setAdjAmount] = useState("");
  const [adjDate, setAdjDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [adjDescription, setAdjDescription] = useState("");
  const [adjError, setAdjError] = useState<string | null>(null);
  const [isAdjSubmitting, setIsAdjSubmitting] = useState(false);

  const [cancelAdjustment, setCancelAdjustment] = useState<SalaryAdjustment | null>(null);

  // Advances Tab State
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([]);
  const [isAdvancesLoading, setIsAdvancesLoading] = useState(false);

  // Loans Tab State
  const [loans, setLoans] = useState<EmployeeLoan[]>([]);
  const [isLoansLoading, setIsLoansLoading] = useState(false);

  // Advance Modals
  const [isIssueAdvanceOpen, setIsIssueAdvanceOpen] = useState(false);
  const [advAmount, setAdvAmount] = useState("");
  const [advDate, setAdvDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [advReason, setAdvReason] = useState("");
  const [advNotes, setAdvNotes] = useState("");
  const [advError, setAdvError] = useState<string | null>(null);
  const [isAdvSubmitting, setIsAdvSubmitting] = useState(false);

  const [cancelAdvance, setCancelAdvance] = useState<EmployeeAdvance | null>(null);

  // Payslips Tab State
  const [payslipsData, setPayslipsData] = useState<PaginatedResponse<Payslip> | null>(null);
  const [payrollHistoryData, setPayrollHistoryData] = useState<PaginatedResponse<PayrollRecord> | null>(null);
  const [isPayslipsLoading, setIsPayslipsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchEmployee = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const emp = await employeesApi.get(employeeId);
        if (isMounted) setEmployee(emp);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load employee workspace.";
        if (isMounted) setError(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchEmployee();
    return () => {
      isMounted = false;
    };
  }, [employeeId]);

  // Lazy Fetch Attendance
  useEffect(() => {
    if (
      activeTab === "attendance" &&
      hasPermission(userPermissions, PermissionCode.ATTENDANCE_VIEW) &&
      !attendanceData
    ) {
      let isMounted = true;
      const loadAttendance = async () => {
        setIsAttendanceLoading(true);
        try {
          const res = await attendanceApi.list({ employeeId, limit: 20 });
          if (isMounted) setAttendanceData(res);
        } catch {
          // Silent error handling for tab
        } finally {
          if (isMounted) setIsAttendanceLoading(false);
        }
      };

      loadAttendance();
      return () => {
        isMounted = false;
      };
    }
  }, [activeTab, attendanceData, employeeId, userPermissions]);

  // Lazy Fetch Leave Records
  useEffect(() => {
    if (
      activeTab === "leave" &&
      hasPermission(userPermissions, PermissionCode.LEAVE_VIEW) &&
      !leaveData
    ) {
      let isMounted = true;
      const loadLeave = async () => {
        setIsLeaveLoading(true);
        try {
          const res = await leaveRecordsApi.list({ employeeId, limit: 20 });
          if (isMounted) setLeaveData(res);
        } catch {
          // Silent error handling for tab
        } finally {
          if (isMounted) setIsLeaveLoading(false);
        }
      };

      loadLeave();
      return () => {
        isMounted = false;
      };
    }
  }, [activeTab, leaveData, employeeId, userPermissions]);

  // Salary Fetch Callback
  const loadSalaryData = async () => {
    setIsSalaryLoading(true);
    try {
      const [curr, hist, adj] = await Promise.all([
        salaryApi.getCurrent(employeeId).catch(() => null),
        salaryApi.getHistory(employeeId).catch(() => []),
        salaryApi.getAdjustments(employeeId).catch(() => []),
      ]);
      setCurrentSalary(curr);
      setSalaryHistory(hist);
      setSalaryAdjustments(adj);
    } finally {
      setIsSalaryLoading(false);
    }
  };

  useEffect(() => {
    if (
      activeTab === "salary" &&
      hasPermission(userPermissions, PermissionCode.SALARY_VIEW) &&
      salaryHistory.length === 0 &&
      !currentSalary
    ) {
      let isMounted = true;
      const load = async () => {
        setIsSalaryLoading(true);
        try {
          const [curr, hist, adj] = await Promise.all([
            salaryApi.getCurrent(employeeId).catch(() => null),
            salaryApi.getHistory(employeeId).catch(() => []),
            salaryApi.getAdjustments(employeeId).catch(() => []),
          ]);
          if (isMounted) {
            setCurrentSalary(curr);
            setSalaryHistory(hist);
            setSalaryAdjustments(adj);
          }
        } finally {
          if (isMounted) setIsSalaryLoading(false);
        }
      };
      load();
      return () => {
        isMounted = false;
      };
    }
  }, [activeTab, salaryHistory.length, currentSalary, employeeId, userPermissions]);

  // Advances Fetch Callback
  const loadAdvancesData = async () => {
    setIsAdvancesLoading(true);
    try {
      const res = await advancesApi.getAdvances(employeeId);
      setAdvances(res);
    } catch {
      // Silent error handling
    } finally {
      setIsAdvancesLoading(false);
    }
  };

  useEffect(() => {
    if (
      activeTab === "advances" &&
      hasPermission(userPermissions, PermissionCode.ADVANCE_VIEW) &&
      advances.length === 0
    ) {
      let isMounted = true;
      const load = async () => {
        setIsAdvancesLoading(true);
        try {
          const res = await advancesApi.getAdvances(employeeId);
          if (isMounted) setAdvances(res);
        } catch {
          // Silent error handling
        } finally {
          if (isMounted) setIsAdvancesLoading(false);
        }
      };
      load();
      return () => {
        isMounted = false;
      };
    }
  }, [activeTab, advances.length, employeeId, userPermissions]);

  useEffect(() => {
    if (
      activeTab === "loans" &&
      hasPermission(userPermissions, PermissionCode.LOAN_VIEW) &&
      loans.length === 0
    ) {
      let isMounted = true;
      const load = async () => {
        setIsLoansLoading(true);
        try {
          const res = await loansApi.getEmployeeLoans(employeeId);
          if (isMounted) setLoans(res || []);
        } catch {
          // Silent error handling
        } finally {
          if (isMounted) setIsLoansLoading(false);
        }
      };
      load();
      return () => {
        isMounted = false;
      };
    }
  }, [activeTab, loans.length, employeeId, userPermissions]);

  // Lazy Fetch Payslips & Payroll History
  const loadPayslipsData = async () => {
    setIsPayslipsLoading(true);
    try {
      const [psRes, phRes] = await Promise.all([
        payslipsApi.listByEmployee(employeeId, { limit: 20 }),
        payslipsApi.getPayrollHistory(employeeId, { limit: 20 }),
      ]);
      setPayslipsData(psRes);
      setPayrollHistoryData(phRes);
    } catch {
      // Silent error handling
    } finally {
      setIsPayslipsLoading(false);
    }
  };

  useEffect(() => {
    const canViewPayslips =
      hasPermission(userPermissions, PermissionCode.PAYSLIP_VIEW) ||
      hasPermission(userPermissions, PermissionCode.PAYROLL_VIEW);

    if (activeTab === "payslips" && canViewPayslips && !payslipsData) {
      let isMounted = true;
      const load = async () => {
        setIsPayslipsLoading(true);
        try {
          const [psRes, phRes] = await Promise.all([
            payslipsApi.listByEmployee(employeeId, { limit: 20 }),
            payslipsApi.getPayrollHistory(employeeId, { limit: 20 }),
          ]);
          if (isMounted) {
            setPayslipsData(psRes);
            setPayrollHistoryData(phRes);
          }
        } catch {
          // Silent error handling
        } finally {
          if (isMounted) setIsPayslipsLoading(false);
        }
      };
      load();
      return () => {
        isMounted = false;
      };
    }
  }, [activeTab, payslipsData, employeeId]);

  useEffect(() => {
    const canViewAttendance = hasPermission(userPermissions, PermissionCode.ATTENDANCE_VIEW);
    const canViewLeave = hasPermission(userPermissions, PermissionCode.LEAVE_VIEW);
    const canViewSalary = hasPermission(userPermissions, PermissionCode.SALARY_VIEW);
    const canViewAdvances = hasPermission(userPermissions, PermissionCode.ADVANCE_VIEW);
    const canViewPayslips =
      hasPermission(userPermissions, PermissionCode.PAYSLIP_VIEW) ||
      hasPermission(userPermissions, PermissionCode.PAYROLL_VIEW);

    const allowed =
      activeTab === "personal" ||
      (activeTab === "attendance" && canViewAttendance) ||
      (activeTab === "leave" && canViewLeave) ||
      (activeTab === "salary" && canViewSalary) ||
      (activeTab === "advances" && canViewAdvances) ||
      (activeTab === "payslips" && canViewPayslips);

    if (!allowed) {
      let isMounted = true;
      Promise.resolve().then(() => {
        if (isMounted) setActiveTab("personal");
      });
      return () => {
        isMounted = false;
      };
    }
  }, [activeTab, userPermissions]);

  // Handle Download Payslip PDF
  const handleDownloadPayslipPdf = async (ps: Payslip) => {
    try {
      const blob = await payslipsApi.downloadPdf(ps.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payslip-${ps.payslip_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF Downloaded", `Saved payslip #${ps.payslip_number}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to download PDF.";
      toast.error("Download Failed", msg);
    }
  };

  // Handle Add Salary Submit
  const handleAddSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalaryError(null);

    if (!newBasicSalary.trim() || isNaN(parseFloat(newBasicSalary)) || parseFloat(newBasicSalary) <= 0) {
      setSalaryError("Please enter a valid positive salary amount.");
      return;
    }

    if (!newEffectiveFrom) {
      setSalaryError("Effective date is required.");
      return;
    }

    setIsSalarySubmitting(true);
    try {
      await salaryApi.createSalary(employeeId, {
        basicSalary: newBasicSalary.trim(),
        effectiveFrom: newEffectiveFrom,
        notes: newSalaryNotes.trim() || undefined,
      });
      toast.success("Salary Updated", "New salary structure created successfully.");
      setIsAddSalaryOpen(false);
      setNewBasicSalary("");
      setNewSalaryNotes("");
      loadSalaryData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create salary record.";
      setSalaryError(msg);
    } finally {
      setIsSalarySubmitting(false);
    }
  };

  // Handle Edit Salary Notes Submit
  const handleEditSalaryNotesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSalaryHistory) return;

    try {
      await salaryApi.updateSalaryHistoryNotes(editingSalaryHistory.id, {
        notes: editSalaryNotes.trim() || undefined,
      });
      toast.success("Salary Notes Updated", "Notes were saved.");
      setEditingSalaryHistory(null);
      loadSalaryData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update salary notes.";
      toast.error("Update Failed", msg);
    }
  };

  // Handle Add Adjustment Submit
  const handleAddAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjError(null);

    if (!adjAmount.trim() || isNaN(parseFloat(adjAmount)) || parseFloat(adjAmount) <= 0) {
      setAdjError("Please enter a valid positive adjustment amount.");
      return;
    }

    if (!adjDate) {
      setAdjError("Adjustment date is required.");
      return;
    }

    setIsAdjSubmitting(true);
    try {
      await salaryApi.createAdjustment(employeeId, {
        adjustmentType: adjType,
        amount: adjAmount.trim(),
        adjustmentDate: adjDate,
        description: adjDescription.trim() || undefined,
      });
      toast.success("Adjustment Added", "Salary adjustment was recorded.");
      setIsAddAdjustmentOpen(false);
      setAdjAmount("");
      setAdjDescription("");
      loadSalaryData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add adjustment.";
      setAdjError(msg);
    } finally {
      setIsAdjSubmitting(false);
    }
  };

  // Handle Cancel Adjustment
  const handleCancelAdjustment = async () => {
    if (!cancelAdjustment) return;
    try {
      await salaryApi.updateAdjustmentStatus(cancelAdjustment.id, AdjustmentStatus.CANCELLED);
      toast.success("Adjustment Cancelled", "Adjustment status updated to CANCELLED.");
      setCancelAdjustment(null);
      loadSalaryData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel adjustment.";
      toast.error("Action Failed", msg);
    }
  };

  // Handle Issue Advance Submit
  const handleIssueAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdvError(null);

    if (!advAmount.trim() || isNaN(parseFloat(advAmount)) || parseFloat(advAmount) <= 0) {
      setAdvError("Please enter a valid positive advance amount.");
      return;
    }

    if (!advDate) {
      setAdvError("Advance date is required.");
      return;
    }

    setIsAdvSubmitting(true);
    try {
      await advancesApi.createAdvance(employeeId, {
        amount: advAmount.trim(),
        advanceDate: advDate,
        reason: advReason.trim() || undefined,
        notes: advNotes.trim() || undefined,
      });
      toast.success("Advance Issued", "Employee advance was recorded successfully.");
      setIsIssueAdvanceOpen(false);
      setAdvAmount("");
      setAdvReason("");
      setAdvNotes("");
      loadAdvancesData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to issue advance.";
      setAdvError(msg);
    } finally {
      setIsAdvSubmitting(false);
    }
  };

  // Handle Cancel Advance
  const handleCancelAdvanceSubmit = async () => {
    if (!cancelAdvance) return;
    try {
      await advancesApi.updateAdvanceStatus(cancelAdvance.id, AdvanceStatus.CANCELLED);
      toast.success("Advance Cancelled", "Advance status updated to CANCELLED.");
      setCancelAdvance(null);
      loadAdvancesData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel advance.";
      toast.error("Cancellation Failed", msg);
    }
  };

  if (isLoading) {
    return (
      <PageContainer maxWidth="xl" className="py-12 flex flex-col items-center justify-center">
        <Spinner size="lg" className="text-primary mb-3" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          Loading employee workspace...
        </p>
      </PageContainer>
    );
  }

  if (error || !employee) {
    return (
      <PageContainer maxWidth="xl" className="py-6">
        <ErrorState
          title="Employee Not Found"
          message={error || "The requested employee record could not be found."}
          onRetry={() => router.push("/employees")}
          retryText="Return to Employees List"
        />
      </PageContainer>
    );
  }

  const statusBadgeVariant = (status: EmploymentStatus) => {
    switch (status) {
      case EmploymentStatus.ACTIVE:
        return "success";
      case EmploymentStatus.INACTIVE:
        return "neutral";
      case EmploymentStatus.ON_NOTICE:
        return "warning";
      case EmploymentStatus.TERMINATED:
        return "danger";
      default:
        return "neutral";
    }
  };

  const attendanceBadgeVariant = (s: AttendanceStatus) => {
    switch (s) {
      case AttendanceStatus.PRESENT:
        return "success";
      case AttendanceStatus.ABSENT:
        return "danger";
      case AttendanceStatus.HALF_DAY:
        return "warning";
      case AttendanceStatus.LEAVE:
        return "primary";
      case AttendanceStatus.HOLIDAY:
        return "neutral";
      default:
        return "neutral";
    }
  };

  const leaveBadgeVariant = (s: LeaveStatus) => {
    switch (s) {
      case LeaveStatus.APPROVED:
        return "success";
      case LeaveStatus.PENDING:
        return "warning";
      case LeaveStatus.REJECTED:
        return "danger";
      case LeaveStatus.CANCELLED:
        return "neutral";
      default:
        return "neutral";
    }
  };

  const attendanceColumns: ColumnDef<Attendance>[] = [
    {
      header: "Date",
      cell: (row) => <span className="font-semibold text-foreground">{row.attendance_date}</span>,
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge variant={attendanceBadgeVariant(row.status)} showDot>
          {row.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      header: "Remarks",
      cell: (row) => <span className="text-muted-foreground">{row.remarks || "—"}</span>,
    },
  ];

  const leaveColumns: ColumnDef<LeaveRecord>[] = [
    {
      header: "Leave Type",
      cell: (row) => <span className="font-semibold text-foreground">{row.leave_type?.name || "Leave"}</span>,
    },
    {
      header: "Dates",
      cell: (row) => (
        <span className="text-foreground">
          {row.start_date} <span className="text-muted-foreground">to</span> {row.end_date}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge variant={leaveBadgeVariant(row.status)} showDot>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Remarks",
      cell: (row) => <span className="text-muted-foreground">{row.remarks || "—"}</span>,
    },
  ];

  const salaryHistoryColumns: ColumnDef<SalaryHistory>[] = [
    {
      header: "Basic Salary",
      cell: (row) => (
        <span className="font-semibold font-mono text-foreground text-xs">
          {formatCurrency(row.basic_salary)}
        </span>
      ),
    },
    {
      header: "Effective Period",
      cell: (row) => (
        <span className="text-xs text-foreground">
          {row.effective_from}{" "}
          <span className="text-muted-foreground">to</span>{" "}
          {row.effective_to ? row.effective_to : "Present (Active)"}
        </span>
      ),
    },
    {
      header: "Notes",
      cell: (row) => <span className="text-xs text-muted-foreground">{row.notes || "—"}</span>,
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
        <Can permission={PermissionCode.SALARY_UPDATE}>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              onClick={() => openCorrectionModal(row)}
            >
              <Wrench className="w-3 h-3 mr-1" /> Correct Entry
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px]"
              onClick={() => {
                setEditingSalaryHistory(row);
                setEditSalaryNotes(row.notes || "");
              }}
            >
              <Edit2 className="w-3 h-3 mr-1" /> Edit Notes
            </Button>
          </div>
        </Can>
      ),
    },
  ];

  const adjustmentColumns: ColumnDef<SalaryAdjustment>[] = [
    {
      header: "Type",
      cell: (row) => (
        <Badge
          variant={
            row.adjustment_type === AdjustmentType.OTHER_DEDUCTION ? "danger" : "success"
          }
        >
          {row.adjustment_type.replace("_", " ")}
        </Badge>
      ),
    },
    {
      header: "Amount",
      cell: (row) => (
        <span
          className={`font-mono font-semibold text-xs ${
            row.adjustment_type === AdjustmentType.OTHER_DEDUCTION
              ? "text-danger"
              : "text-emerald-500"
          }`}
        >
          {row.adjustment_type === AdjustmentType.OTHER_DEDUCTION ? "-" : "+"}
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      header: "Date",
      cell: (row) => <span className="text-xs text-foreground">{row.adjustment_date}</span>,
    },
    {
      header: "Description",
      cell: (row) => <span className="text-xs text-muted-foreground">{row.description || "—"}</span>,
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge variant={row.status === AdjustmentStatus.ACTIVE ? "success" : "neutral"}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <Can permission={PermissionCode.SALARY_UPDATE}>
          {row.status === AdjustmentStatus.ACTIVE && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px] text-danger hover:bg-danger/10"
              onClick={() => setCancelAdjustment(row)}
            >
              <Ban className="w-3 h-3 mr-1" /> Cancel
            </Button>
          )}
        </Can>
      ),
    },
  ];

  const advanceColumns: ColumnDef<EmployeeAdvance>[] = [
    {
      header: "Advance No.",
      cell: (row) => (
        <span className="font-mono font-bold text-xs text-foreground">
          {row.advance_number}
        </span>
      ),
    },
    {
      header: "Date",
      cell: (row) => <span className="text-xs text-foreground">{row.advance_date}</span>,
    },
    {
      header: "Amount",
      cell: (row) => (
        <span className="font-mono font-semibold text-xs text-foreground">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      header: "Reason",
      cell: (row) => (
        <span className="text-xs text-muted-foreground truncate block max-w-[200px]">
          {row.reason || "—"}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge
          variant={
            row.status === AdvanceStatus.ACTIVE
              ? "primary"
              : row.status === AdvanceStatus.SETTLED
              ? "success"
              : "neutral"
          }
          showDot
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Can permission={PermissionCode.ADVANCE_UPDATE}>
            {row.status === AdvanceStatus.ACTIVE && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px] text-danger hover:bg-danger/10"
                onClick={() => setCancelAdvance(row)}
              >
                <Ban className="w-3 h-3 mr-1" /> Cancel
              </Button>
            )}
          </Can>
        </div>
      ),
    },
  ];

  const loanColumns: ColumnDef<EmployeeLoan>[] = [
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
        <span className="text-muted-foreground text-xs">{row.loan_date}</span>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge
          variant={
            row.status === LoanStatus.ACTIVE
              ? "warning"
              : row.status === LoanStatus.COMPLETED
              ? "success"
              : "neutral"
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <Link href={`/loans/${row.id}`}>
          <Button variant="ghost" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />}>
            Details
          </Button>
        </Link>
      ),
    },
  ];

  const payslipColumns: ColumnDef<Payslip>[] = [
    {
      header: "Payslip No.",
      cell: (row) => (
        <span className="font-mono font-bold text-xs text-foreground">
          {row.payslip_number}
        </span>
      ),
    },
    {
      header: "Issued Date",
      cell: (row) => (
        <span className="text-xs text-foreground">
          {new Date(row.issued_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Net Salary",
      cell: (row) => (
        <span className="font-mono font-bold text-xs text-primary">
          {formatCurrency(row.payroll_record?.net_salary)}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px]"
            onClick={() => router.push(`/payslips/${row.id}`)}
          >
            <Eye className="w-3 h-3 mr-1" /> View
          </Button>

          <Can permission={PermissionCode.PAYSLIP_DOWNLOAD}>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={() => handleDownloadPayslipPdf(row)}
            >
              <Download className="w-3 h-3 mr-1" /> PDF
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  const payrollHistoryColumns: ColumnDef<PayrollRecord>[] = [
    {
      header: "Calculation Date",
      cell: (row) => (
        <span className="text-xs text-foreground font-semibold">
          {new Date(row.calculated_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Basic Salary",
      cell: (row) => (
        <span className="font-mono text-xs text-foreground">
          {formatCurrency(row.basic_salary)}
        </span>
      ),
    },
    {
      header: "Working Days",
      cell: (row) => <span className="text-xs text-foreground">{row.working_days} days</span>,
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
        <span className="font-mono text-xs text-danger font-semibold">
          -{formatCurrency(row.total_deductions)}
        </span>
      ),
    },
    {
      header: "Net Payout",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-primary">
          {formatCurrency(row.net_salary)}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge variant={row.status === "PAID" ? "success" : "primary"} showDot>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px]"
          onClick={async () => {
            try {
              let ps = await payslipsApi.getByPayrollRecord(row.id).catch(() => null);
              if (!ps) {
                ps = await payslipsApi.createPayslip(row.id);
                toast.success("Payslip Generated", `Created payslip #${ps.payslip_number}`);
                await loadPayslipsData();
              }
              router.push(`/payslips/${ps.id}`);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Failed to open payslip.";
              toast.error("Payslip Error", msg);
            }
          }}
        >
          <FileSpreadsheet className="w-3 h-3 mr-1" /> View / Issue Payslip
        </Button>
      ),
    },
  ];

  const allTabs = [
    { id: "personal", label: "Personal Information", icon: <User className="w-4 h-4" /> },
    {
      id: "attendance",
      label: "Attendance",
      icon: <CalendarCheck2 className="w-4 h-4" />,
      permission: PermissionCode.ATTENDANCE_VIEW,
    },
    {
      id: "leave",
      label: "Leave Records",
      icon: <CalendarDays className="w-4 h-4" />,
      permission: PermissionCode.LEAVE_VIEW,
    },
    {
      id: "salary",
      label: "Salary History",
      icon: <CircleDollarSign className="w-4 h-4" />,
      permission: PermissionCode.SALARY_VIEW,
    },
    {
      id: "advances",
      label: "Salary Advances",
      icon: <HandCoins className="w-4 h-4" />,
      permission: PermissionCode.ADVANCE_VIEW,
    },
    {
      id: "loans",
      label: "Employee Loans",
      icon: <Landmark className="w-4 h-4" />,
      permission: PermissionCode.LOAN_VIEW,
    },
    {
      id: "payslips",
      label: "Payslips & Payroll History",
      icon: <FileSpreadsheet className="w-4 h-4" />,
      permission: PermissionCode.PAYSLIP_VIEW,
      alternativePermission: PermissionCode.PAYROLL_VIEW,
    },
  ];

  const tabs = allTabs.filter((tab) => {
    if (!tab.permission) return true;
    const hasMain = hasPermission(userPermissions, tab.permission);
    const hasAlt = tab.alternativePermission
      ? hasPermission(userPermissions, tab.alternativePermission)
      : false;
    return hasMain || hasAlt;
  });

  return (
    <PageContainer maxWidth="xl" className="py-6 space-y-6">
      {/* Workspace Header */}
      <PageHeader
        title={`${employee.first_name} ${employee.last_name}`}
        description={`Employee Code: ${employee.employee_code}`}
        badge={
          <Badge variant={statusBadgeVariant(employee.employment_status)} showDot>
            {employee.employment_status.replace("_", " ")}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/employees">
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back to List
              </Button>
            </Link>
            <Can permission={PermissionCode.EMPLOYEE_UPDATE}>
              <Link href={`/employees/${employee.id}/edit`}>
                <Button variant="primary" size="sm" leftIcon={<Edit2 className="w-4 h-4" />}>
                  Edit Record
                </Button>
              </Link>
            </Can>
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div className="border-b border-border flex items-center gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Personal Info Tab */}
      {activeTab === "personal" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Basic Information
              </CardTitle>
              <CardDescription>Employee personal and contact identification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border">
                <span className="text-muted-foreground">Employee Code</span>
                <span className="font-mono font-bold text-foreground">{employee.employee_code}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border">
                <span className="text-muted-foreground">First Name</span>
                <span className="font-semibold text-foreground">{employee.first_name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border">
                <span className="text-muted-foreground">Last Name</span>
                <span className="font-semibold text-foreground">{employee.last_name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Email
                </span>
                <span className="font-medium text-foreground">{employee.email || "—"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Phone
                </span>
                <span className="font-medium text-foreground">{employee.phone || "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> Organization Context
              </CardTitle>
              <CardDescription>Department, designation, and employment details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-primary" /> Department
                </span>
                <span className="font-semibold text-foreground">
                  {employee.department?.name || "—"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-primary" /> Designation
                </span>
                <span className="font-semibold text-foreground">
                  {employee.designation?.name || "—"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Joining Date
                </span>
                <span className="font-semibold text-foreground">
                  {new Date(employee.joining_date).toLocaleDateString()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border">
                <span className="text-muted-foreground">Employment Status</span>
                <div>
                  <Badge variant={statusBadgeVariant(employee.employment_status)} showDot>
                    {employee.employment_status.replace("_", " ")}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Record Created
                </span>
                <span className="text-muted-foreground">
                  {new Date(employee.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === "attendance" && (
        <Can
          permission={PermissionCode.ATTENDANCE_VIEW}
          fallback={
            <ErrorState
              title="Access Restricted"
              message="You do not have permission to view attendance records."
            />
          }
        >
          <DataTable
            columns={attendanceColumns}
            data={attendanceData?.data || []}
            isLoading={isAttendanceLoading}
            emptyTitle="No attendance records"
            emptyDescription={`No attendance records found for ${employee.first_name} ${employee.last_name}.`}
          />
        </Can>
      )}

      {/* Leave Records Tab */}
      {activeTab === "leave" && (
        <Can
          permission={PermissionCode.LEAVE_VIEW}
          fallback={
            <ErrorState
              title="Access Restricted"
              message="You do not have permission to view leave records."
            />
          }
        >
          <DataTable
            columns={leaveColumns}
            data={leaveData?.data || []}
            isLoading={isLeaveLoading}
            emptyTitle="No leave records"
            emptyDescription={`No leave requests found for ${employee.first_name} ${employee.last_name}.`}
          />
        </Can>
      )}

      {/* Salary History & Adjustments Workspace Tab */}
      {activeTab === "salary" && (
        <Can
          permission={PermissionCode.SALARY_VIEW}
          fallback={
            <ErrorState
              title="Access Restricted"
              message="You do not have permission to view salary information."
            />
          }
        >
          <div className="space-y-6">
            {/* Current Salary Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CircleDollarSign className="w-5 h-5 text-primary" /> Active Basic Salary
                  </CardTitle>
                  <CardDescription>Current base compensation structure</CardDescription>
                </div>
                <Can permission={PermissionCode.SALARY_CREATE}>
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsAddSalaryOpen(true)}
                  >
                    Change Salary Structure
                  </Button>
                </Can>
              </CardHeader>
              <CardContent>
                {isSalaryLoading ? (
                  <div className="py-4 text-xs text-muted-foreground">Loading salary details...</div>
                ) : currentSalary ? (
                  <div className="flex flex-wrap items-baseline gap-6">
                    <div>
                      <span className="text-xs uppercase text-muted-foreground font-semibold">
                        Basic Salary
                      </span>
                      <div className="text-3xl font-extrabold font-mono text-primary mt-0.5">
                        {formatCurrency(currentSalary.basic_salary)}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs uppercase text-muted-foreground font-semibold">
                        Effective From
                      </span>
                      <div className="text-sm font-semibold text-foreground mt-0.5">
                        {currentSalary.effective_from}
                      </div>
                    </div>
                    {currentSalary.notes && (
                      <div>
                        <span className="text-xs uppercase text-muted-foreground font-semibold">
                          Notes
                        </span>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {currentSalary.notes}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground py-2">
                    No active salary structure found for this employee.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Salary History Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground">Salary Structure History</h3>
              <DataTable
                columns={salaryHistoryColumns}
                data={salaryHistory}
                isLoading={isSalaryLoading}
                emptyTitle="No salary history"
                emptyDescription="No previous salary revisions recorded."
              />
            </div>

            {/* Salary Adjustments Section */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Salary Adjustments</h3>
                  <p className="text-xs text-muted-foreground">
                    Overtime, bonuses, incentives, and deductions recorded for payroll
                  </p>
                </div>
                <Can permission={PermissionCode.SALARY_CREATE}>
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsAddAdjustmentOpen(true)}
                  >
                    Add Adjustment
                  </Button>
                </Can>
              </div>

              <DataTable
                columns={adjustmentColumns}
                data={salaryAdjustments}
                isLoading={isSalaryLoading}
                emptyTitle="No salary adjustments"
                emptyDescription="No overtime, bonuses, or deductions recorded."
              />
            </div>
          </div>
        </Can>
      )}

      {/* Advances Workspace Tab */}
      {activeTab === "advances" && (
        <Can
          permission={PermissionCode.ADVANCE_VIEW}
          fallback={
            <ErrorState
              title="Access Restricted"
              message="You do not have permission to view salary advances."
            />
          }
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Employee Salary Advances</h3>
                <p className="text-xs text-muted-foreground">
                  Issue salary advances and view advance history
                </p>
              </div>
              <Can permission={PermissionCode.ADVANCE_CREATE}>
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsIssueAdvanceOpen(true)}
                >
                  Issue New Advance
                </Button>
              </Can>
            </div>

            <DataTable
              columns={advanceColumns}
              data={advances}
              isLoading={isAdvancesLoading}
              emptyTitle="No salary advances found"
              emptyDescription="No advances issued for this employee."
            />
          </div>
        </Can>
      )}

      {/* Employee Loans Tab */}
      {activeTab === "loans" && (
        <Can
          permission={PermissionCode.LOAN_VIEW}
          fallback={
            <ErrorState
              title="Access Restricted"
              message="You do not have permission to view employee loans."
            />
          }
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Employee Loans</h3>
                <p className="text-xs text-muted-foreground">
                  View loan history and outstanding balances for this employee
                </p>
              </div>
              <Can permission={PermissionCode.LOAN_CREATE}>
                <Link href="/loans">
                  <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                    Issue New Loan
                  </Button>
                </Link>
              </Can>
            </div>

            <DataTable
              columns={loanColumns}
              data={loans}
              isLoading={isLoansLoading}
              emptyTitle="No loans found"
              emptyDescription="No loans issued for this employee."
            />
          </div>
        </Can>
      )}

      {/* Payslips & Payroll History Tab */}
      {activeTab === "payslips" && (
        <Can
          anyPermission={[PermissionCode.PAYSLIP_VIEW, PermissionCode.PAYROLL_VIEW]}
          fallback={
            <ErrorState
              title="Access Restricted"
              message="You do not have permission to view payslips or payroll history."
            />
          }
        >
          <div className="space-y-6">
            {/* Issued Payslips Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Issued Payslips</h3>
                  <p className="text-xs text-muted-foreground">
                    Official payslip statements generated for payroll periods
                  </p>
                </div>
              </div>

              <DataTable
                columns={payslipColumns}
                data={payslipsData?.data || []}
                isLoading={isPayslipsLoading}
                emptyTitle="No payslips issued"
                emptyDescription="No official payslips have been generated for this employee yet."
              />
            </div>

            {/* Payroll History Section */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Payroll Calculation History</h3>
                  <p className="text-xs text-muted-foreground">
                    Historical payroll calculation snapshots
                  </p>
                </div>
              </div>

              <DataTable
                columns={payrollHistoryColumns}
                data={payrollHistoryData?.data || []}
                isLoading={isPayslipsLoading}
                emptyTitle="No payroll history found"
                emptyDescription="No previous payroll calculations recorded."
              />
            </div>
          </div>
        </Can>
      )}

      {/* Add Salary Modal */}
      <Modal
        isOpen={isAddSalaryOpen}
        onClose={() => setIsAddSalaryOpen(false)}
        title="Add Salary Structure"
        description={`Set a new basic salary for ${employee.first_name} ${employee.last_name}.`}
      >
        <form onSubmit={handleAddSalarySubmit} className="space-y-4">
          {salaryError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{salaryError}</span>
            </div>
          )}

          <Input
            label="Basic Salary (₹)"
            required
            type="number"
            step="0.01"
            placeholder="e.g. 50000.00"
            value={newBasicSalary}
            onChange={(e) => setNewBasicSalary(e.target.value)}
          />

          <Input
            label="Effective From"
            type="date"
            required
            value={newEffectiveFrom}
            onChange={(e) => setNewEffectiveFrom(e.target.value)}
          />

          <Textarea
            label="Notes (Optional)"
            placeholder="Reason for salary revision..."
            rows={2}
            value={newSalaryNotes}
            onChange={(e) => setNewSalaryNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddSalaryOpen(false)}
              disabled={isSalarySubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSalarySubmitting}>
              Save Salary Structure
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Salary Notes Modal */}
      <Modal
        isOpen={!!editingSalaryHistory}
        onClose={() => setEditingSalaryHistory(null)}
        title="Edit Salary Notes"
        description="Update administrative notes for this salary history record."
      >
        <form onSubmit={handleEditSalaryNotesSubmit} className="space-y-4">
          <Textarea
            label="Notes"
            rows={3}
            value={editSalaryNotes}
            onChange={(e) => setEditSalaryNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setEditingSalaryHistory(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Notes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Correct Salary Record Modal */}
      <Modal
        isOpen={!!correctingSalary}
        onClose={() => {
          setCorrectingSalary(null);
          setIsConfirmingCorrection(false);
        }}
        title="Correct Salary Record"
        description="Use this only to correct an accidental data-entry mistake. Salary corrections are recorded in the audit log."
      >
        {correctingSalary && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setIsConfirmingCorrection(true);
            }}
            className="space-y-4"
          >
            {correctError && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-md text-xs text-danger flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{correctError}</span>
              </div>
            )}

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs space-y-1">
              <div className="font-semibold text-amber-700 dark:text-amber-400">Current Record Values:</div>
              <div className="text-muted-foreground">
                Basic Salary: <span className="font-mono text-foreground font-medium">{formatCurrency(correctingSalary.basic_salary)}</span>
              </div>
              <div className="text-muted-foreground">
                Effective From: <span className="text-foreground font-medium">{correctingSalary.effective_from}</span>
              </div>
            </div>

            <Input
              label="Basic Salary (₹)"
              required
              type="number"
              step="0.01"
              value={correctBasicSalary}
              onChange={(e) => setCorrectBasicSalary(e.target.value)}
            />

            <Input
              label="Effective From"
              type="date"
              required
              value={correctEffectiveFrom}
              onChange={(e) => setCorrectEffectiveFrom(e.target.value)}
            />

            <Textarea
              label="Notes (Optional)"
              placeholder="Correction reason or remarks..."
              rows={2}
              value={correctNotes}
              onChange={(e) => setCorrectNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCorrectingSalary(null)}
                disabled={isCorrectingSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isCorrectingSubmitting}>
                Review Correction
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirmation Dialog for Correction */}
      <ConfirmationDialog
        isOpen={isConfirmingCorrection}
        onClose={() => setIsConfirmingCorrection(false)}
        onConfirm={handleCorrectSalary}
        title="Are you sure you want to correct this salary record?"
        description="This changes salary history and will be recorded in the audit log. Finalized/paid payroll-linked salary records cannot be corrected."
        confirmText="Confirm Correction"
        variant="danger"
      />

      {/* Add Adjustment Modal */}
      <Modal
        isOpen={isAddAdjustmentOpen}
        onClose={() => setIsAddAdjustmentOpen(false)}
        title="Add Salary Adjustment"
        description="Record overtime, bonus, incentive, or deduction for this employee."
      >
        <form onSubmit={handleAddAdjustmentSubmit} className="space-y-4">
          {adjError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{adjError}</span>
            </div>
          )}

          <Select
            label="Adjustment Type"
            required
            value={adjType}
            onChange={(e) => setAdjType(e.target.value as AdjustmentType)}
            options={[
              { value: AdjustmentType.OVERTIME, label: "OVERTIME — Overtime pay" },
              { value: AdjustmentType.BONUS, label: "BONUS — Performance bonus" },
              { value: AdjustmentType.INCENTIVE, label: "INCENTIVE — Sales incentive" },
              { value: AdjustmentType.OTHER_EARNING, label: "OTHER EARNING — Additional allowance" },
              { value: AdjustmentType.OTHER_DEDUCTION, label: "OTHER DEDUCTION — Salary deduction" },
            ]}
          />

          <Input
            label="Amount (₹)"
            required
            type="number"
            step="0.01"
            placeholder="e.g. 2500.00"
            value={adjAmount}
            onChange={(e) => setAdjAmount(e.target.value)}
          />

          <Input
            label="Adjustment Date"
            type="date"
            required
            value={adjDate}
            onChange={(e) => setAdjDate(e.target.value)}
          />

          <Textarea
            label="Description (Optional)"
            placeholder="Details or calculations..."
            rows={2}
            value={adjDescription}
            onChange={(e) => setAdjDescription(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddAdjustmentOpen(false)}
              disabled={isAdjSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isAdjSubmitting}>
              Save Adjustment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Adjustment Confirmation */}
      <ConfirmationDialog
        isOpen={!!cancelAdjustment}
        onClose={() => setCancelAdjustment(null)}
        title="Cancel Salary Adjustment?"
        description={`Are you sure you want to cancel this ${cancelAdjustment?.adjustment_type} adjustment of ${formatCurrency(cancelAdjustment?.amount)}?`}
        confirmText="Cancel Adjustment"
        variant="danger"
        onConfirm={handleCancelAdjustment}
      />

      {/* Issue Advance Modal */}
      <Modal
        isOpen={isIssueAdvanceOpen}
        onClose={() => setIsIssueAdvanceOpen(false)}
        title="Issue Salary Advance"
        description={`Issue a new salary advance to ${employee.first_name} ${employee.last_name}.`}
      >
        <form onSubmit={handleIssueAdvanceSubmit} className="space-y-4">
          {advError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{advError}</span>
            </div>
          )}

          <Input
            label="Advance Amount (₹)"
            required
            type="number"
            step="0.01"
            placeholder="e.g. 15000.00"
            value={advAmount}
            onChange={(e) => setAdvAmount(e.target.value)}
          />

          <Input
            label="Advance Date"
            type="date"
            required
            value={advDate}
            onChange={(e) => setAdvDate(e.target.value)}
          />

          <Input
            label="Reason (Optional)"
            placeholder="e.g. Medical emergency, Personal"
            value={advReason}
            onChange={(e) => setAdvReason(e.target.value)}
          />

          <Textarea
            label="Notes (Optional)"
            rows={2}
            value={advNotes}
            onChange={(e) => setAdvNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsIssueAdvanceOpen(false)}
              disabled={isAdvSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isAdvSubmitting}>
              Issue Advance
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Advance Confirmation */}
      <ConfirmationDialog
        isOpen={!!cancelAdvance}
        onClose={() => setCancelAdvance(null)}
        title="Cancel Advance?"
        description={`Are you sure you want to cancel advance ${cancelAdvance?.advance_number}?`}
        confirmText="Cancel Advance"
        variant="danger"
        onConfirm={handleCancelAdvanceSubmit}
      />
    </PageContainer>
  );
}

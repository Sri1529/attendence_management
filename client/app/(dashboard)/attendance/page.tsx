"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Tooltip } from "@/components/ui/tooltip";
import { Can } from "@/components/auth/can";
import { useToast } from "@/hooks/use-toast";
import { useQueryParams } from "@/hooks/use-query-params";
import { attendanceApi } from "@/lib/api/attendance";
import { employeesApi } from "@/lib/api/employees";
import { leaveRecordsApi } from "@/lib/api/leave-records";
import { Attendance, AttendanceStatus } from "@/types/attendance";
import { Employee, EmploymentStatus, PaginatedResponse } from "@/types/organization";
import { LeaveRecord, LeaveStatus } from "@/types/leave";
import { PermissionCode } from "@/lib/permissions/codes";
import {
  Plus,
  Users,
  Edit2,
  AlertCircle,
  CheckCircle2,
  User,
  Lock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Grid,
  List as ListIcon,
  Eye,
} from "lucide-react";

export default function AttendancePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { getIntParam, getParam, setParam, setParams } = useQueryParams();

  // View Mode: "monthly" | "list"
  const viewMode = (getParam("view", "monthly") === "list" ? "list" : "monthly") as "monthly" | "list";

  // Date Navigation derived from URL parameters
  const currentDate = new Date();
  const selectedYear = getIntParam("year", currentDate.getFullYear());
  const selectedMonth = getIntParam("month", currentDate.getMonth() + 1);

  // List View Query State
  const page = getIntParam("page", 1);
  const limit = getIntParam("limit", 20);
  const search = getParam("search", "");
  const employeeIdFilter = getParam("employeeId", "");
  const statusFilter = getParam("status", "") as AttendanceStatus | "";
  const startDateFilter = getParam("startDate", "");
  const endDateFilter = getParam("endDate", "");

  // Base Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dataResponse, setDataResponse] = useState<PaginatedResponse<Attendance> | null>(null);
  const [isListLoading, setIsListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Monthly Grid Data State
  const [monthlyAttendance, setMonthlyAttendance] = useState<Attendance[]>([]);
  const [monthlyApprovedLeaves, setMonthlyApprovedLeaves] = useState<LeaveRecord[]>([]);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(true);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);

  // Single Attendance Modal State
  const [isSingleOpen, setIsSingleOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [singleEmpId, setSingleEmpId] = useState("");
  const [singleDate, setSingleDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [singleStatus, setSingleStatus] = useState<AttendanceStatus>(AttendanceStatus.PRESENT);
  const [singleRemarks, setSingleRemarks] = useState("");
  const [singleError, setSingleError] = useState<string | null>(null);
  const [isSingleSubmitting, setIsSingleSubmitting] = useState(false);

  // Cell Details Modal State
  const [selectedCell, setSelectedCell] = useState<{
    employee: Employee;
    dateStr: string;
    attendance?: Attendance | null;
    leaveRecord?: LeaveRecord | null;
  } | null>(null);

  // Bulk Attendance Modal State
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [bulkRows, setBulkRows] = useState<
    Array<{
      employee: Employee;
      status: AttendanceStatus;
      remarks: string;
      isLocked: boolean;
      leaveTypeName?: string;
      skip: boolean;
    }>
  >([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // Helper: Month details
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const monthFormattedStr = useMemo(() => {
    return String(selectedMonth).padStart(2, "0");
  }, [selectedMonth]);

  const monthNameStr = useMemo(() => {
    const d = new Date(selectedYear, selectedMonth - 1, 1);
    return d.toLocaleString("en-US", { month: "long" });
  }, [selectedYear, selectedMonth]);

  // Load Active Employees list
  useEffect(() => {
    let isMounted = true;
    employeesApi.list({ limit: 100, employmentStatus: EmploymentStatus.ACTIVE }).then((res) => {
      if (isMounted) setEmployees(res.data || []);
    }).catch(() => null);

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Monthly Grid Data
  const fetchMonthlyData = useCallback(async () => {
    setIsMonthlyLoading(true);
    setMonthlyError(null);
    const start = `${selectedYear}-${monthFormattedStr}-01`;
    const end = `${selectedYear}-${monthFormattedStr}-${String(daysInMonth).padStart(2, "0")}`;

    try {
      const [attRes, leavesRes] = await Promise.all([
        attendanceApi.list({ startDate: start, endDate: end, limit: 1000 }),
        leaveRecordsApi.list({ status: LeaveStatus.APPROVED, limit: 1000 }),
      ]);
      setMonthlyAttendance(attRes.data || []);
      setMonthlyApprovedLeaves(leavesRes.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load monthly attendance.";
      setMonthlyError(msg);
    } finally {
      setIsMonthlyLoading(false);
    }
  }, [selectedYear, monthFormattedStr, daysInMonth]);

  useEffect(() => {
    let isMounted = true;
    if (viewMode === "monthly") {
      const start = `${selectedYear}-${monthFormattedStr}-01`;
      const end = `${selectedYear}-${monthFormattedStr}-${String(daysInMonth).padStart(2, "0")}`;

      Promise.all([
        attendanceApi.list({ startDate: start, endDate: end, limit: 1000 }),
        leaveRecordsApi.list({ status: LeaveStatus.APPROVED, limit: 1000 }),
      ])
        .then(([attRes, leavesRes]) => {
          if (isMounted) {
            setMonthlyAttendance(attRes.data || []);
            setMonthlyApprovedLeaves(leavesRes.data || []);
            setMonthlyError(null);
          }
        })
        .catch((err: unknown) => {
          if (isMounted) {
            const msg = err instanceof Error ? err.message : "Failed to load monthly attendance.";
            setMonthlyError(msg);
          }
        })
        .finally(() => {
          if (isMounted) setIsMonthlyLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [viewMode, selectedYear, monthFormattedStr, daysInMonth]);

  // Fetch List View Data
  const fetchListData = useCallback(async () => {
    setIsListLoading(true);
    setListError(null);
    try {
      const res = await attendanceApi.list({
        page,
        limit,
        search,
        employeeId: employeeIdFilter || undefined,
        status: statusFilter || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
      });
      setDataResponse(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load attendance list.";
      setListError(msg);
    } finally {
      setIsListLoading(false);
    }
  }, [page, limit, search, employeeIdFilter, statusFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    let isMounted = true;
    if (viewMode === "list") {
      attendanceApi.list({
        page,
        limit,
        search,
        employeeId: employeeIdFilter || undefined,
        status: statusFilter || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
      })
        .then((res) => {
          if (isMounted) {
            setDataResponse(res);
            setListError(null);
          }
        })
        .catch((err: unknown) => {
          if (isMounted) {
            const msg = err instanceof Error ? err.message : "Failed to load attendance list.";
            setListError(msg);
          }
        })
        .finally(() => {
          if (isMounted) setIsListLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [viewMode, page, limit, search, employeeIdFilter, statusFilter, startDateFilter, endDateFilter]);

  // Month Navigation Handlers
  const handlePrevMonth = () => {
    let newM = selectedMonth - 1;
    let newY = selectedYear;
    if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    setParams({ year: newY, month: newM });
  };

  const handleNextMonth = () => {
    let newM = selectedMonth + 1;
    let newY = selectedYear;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    }
    setParams({ year: newY, month: newM });
  };

  const handleToday = () => {
    const now = new Date();
    setParams({ year: now.getFullYear(), month: now.getMonth() + 1 });
  };

  // Maps for Grid Lookup
  const attendanceMap = useMemo(() => {
    const map: Record<string, Attendance> = {};
    for (const att of monthlyAttendance) {
      map[`${att.employee_id}_${att.attendance_date}`] = att;
    }
    return map;
  }, [monthlyAttendance]);

  const leaveMap = useMemo(() => {
    const map: Record<string, LeaveRecord> = {};
    for (const lr of monthlyApprovedLeaves) {
      const cur = new Date(lr.start_date);
      const end = new Date(lr.end_date);
      while (cur <= end) {
        const dateStr = cur.toISOString().split("T")[0];
        map[`${lr.employee_id}_${dateStr}`] = lr;
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [monthlyApprovedLeaves]);

  // Filter Employees for Monthly Grid View
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (employeeIdFilter && emp.id !== employeeIdFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
        const code = (emp.employee_code || "").toLowerCase();
        if (!fullName.includes(q) && !code.includes(q)) return false;
      }
      return true;
    });
  }, [employees, employeeIdFilter, search]);

  // Summary Metrics for Monthly View
  const monthlySummary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let halfDay = 0;
    let holiday = 0;

    for (const emp of filteredEmployees) {
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${selectedYear}-${monthFormattedStr}-${String(d).padStart(2, "0")}`;
        const att = attendanceMap[`${emp.id}_${dateStr}`];
        const lr = leaveMap[`${emp.id}_${dateStr}`];
        const isLeaveLinked = !!lr || !!att?.leave_record_id || att?.status === AttendanceStatus.LEAVE;

        if (isLeaveLinked) {
          leave++;
        } else if (att) {
          switch (att.status) {
            case AttendanceStatus.PRESENT:
              present++;
              break;
            case AttendanceStatus.ABSENT:
              absent++;
              break;
            case AttendanceStatus.HALF_DAY:
              halfDay++;
              break;
            case AttendanceStatus.HOLIDAY:
              holiday++;
              break;
          }
        }
      }
    }

    return { present, absent, leave, halfDay, holiday };
  }, [filteredEmployees, daysInMonth, selectedYear, monthFormattedStr, attendanceMap, leaveMap]);

  // Single Entry Handlers
  const handleOpenSingleCreate = () => {
    setEditingAttendance(null);
    setSingleEmpId("");
    setSingleDate(new Date().toISOString().split("T")[0]);
    setSingleStatus(AttendanceStatus.PRESENT);
    setSingleRemarks("");
    setSingleError(null);
    setIsSingleOpen(true);
  };

  const handleOpenSingleEdit = (att: Attendance) => {
    setEditingAttendance(att);
    setSingleEmpId(att.employee_id);
    setSingleDate(att.attendance_date);
    setSingleStatus(att.status);
    setSingleRemarks(att.remarks || "");
    setSingleError(null);
    setIsSingleOpen(true);
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleError(null);

    if (!editingAttendance && !singleEmpId) {
      setSingleError("Employee is required.");
      return;
    }
    if (!singleDate) {
      setSingleError("Attendance date is required.");
      return;
    }

    setIsSingleSubmitting(true);
    try {
      if (editingAttendance) {
        await attendanceApi.update(editingAttendance.id, {
          attendanceDate: singleDate,
          status: singleStatus,
          remarks: singleRemarks.trim() || undefined,
        });
        toast.success("Attendance Updated", "Successfully updated attendance record.");
      } else {
        await attendanceApi.create({
          employeeId: singleEmpId,
          attendanceDate: singleDate,
          status: singleStatus,
          remarks: singleRemarks.trim() || undefined,
        });
        toast.success("Attendance Recorded", "Successfully recorded daily attendance.");
      }
      setIsSingleOpen(false);
      if (viewMode === "monthly") fetchMonthlyData();
      else fetchListData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save attendance record.";
      setSingleError(msg);
    } finally {
      setIsSingleSubmitting(false);
    }
  };

  // Bulk Entry Handlers
  const loadBulkData = useCallback(async (targetDate: string) => {
    setIsBulkLoading(true);
    setBulkError(null);
    try {
      const [activeEmpsRes, approvedLeavesRes, existingAttRes] = await Promise.all([
        employeesApi.list({ limit: 100, employmentStatus: EmploymentStatus.ACTIVE }),
        leaveRecordsApi.list({ status: LeaveStatus.APPROVED, limit: 100 }),
        attendanceApi.list({ startDate: targetDate, endDate: targetDate, limit: 100 }),
      ]);

      const activeEmps = activeEmpsRes.data || [];
      const approvedLeaves = approvedLeavesRes.data || [];
      const existingAtts = existingAttRes.data || [];

      const rows = activeEmps.map((emp) => {
        const matchingLeave = approvedLeaves.find(
          (lr) =>
            lr.employee_id === emp.id &&
            targetDate >= lr.start_date &&
            targetDate <= lr.end_date
        );

        const matchingAtt = existingAtts.find((att) => att.employee_id === emp.id);
        const isLinkedToLeave =
          !!matchingLeave ||
          !!matchingAtt?.leave_record_id ||
          matchingAtt?.leave_record?.status === "APPROVED";

        if (isLinkedToLeave) {
          const leaveTypeName = matchingLeave?.leave_type?.name || "Approved Leave";
          return {
            employee: emp,
            status: AttendanceStatus.LEAVE,
            remarks: matchingAtt?.remarks || "Approved Leave",
            isLocked: true,
            leaveTypeName,
            skip: false,
          };
        }

        return {
          employee: emp,
          status: matchingAtt?.status || AttendanceStatus.PRESENT,
          remarks: matchingAtt?.remarks || "",
          isLocked: false,
          skip: false,
        };
      });

      setBulkRows(rows);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load bulk attendance data.";
      setBulkError(msg);
    } finally {
      setIsBulkLoading(false);
    }
  }, []);

  const handleOpenBulk = async () => {
    setIsBulkOpen(true);
    await loadBulkData(bulkDate);
  };

  const handleBulkDateChange = async (newDate: string) => {
    setBulkDate(newDate);
    if (isBulkOpen) {
      await loadBulkData(newDate);
    }
  };

  const handleBulkRowStatusChange = (index: number, newStatus: AttendanceStatus) => {
    setBulkRows((prev) => {
      if (prev[index]?.isLocked) return prev;
      const updated = [...prev];
      updated[index] = { ...updated[index], status: newStatus };
      return updated;
    });
  };

  const handleBulkRowRemarksChange = (index: number, newRemarks: string) => {
    setBulkRows((prev) => {
      if (prev[index]?.isLocked) return prev;
      const updated = [...prev];
      updated[index] = { ...updated[index], remarks: newRemarks };
      return updated;
    });
  };

  const handleBulkRowSkipChange = (index: number, skip: boolean) => {
    setBulkRows((prev) => {
      if (prev[index]?.isLocked) return prev;
      const updated = [...prev];
      updated[index] = { ...updated[index], skip };
      return updated;
    });
  };

  const handleMarkAllPresent = () => {
    setBulkRows((prev) =>
      prev.map((row) => (row.isLocked ? row : { ...row, status: AttendanceStatus.PRESENT }))
    );
  };

  const editableBulkCount = useMemo(() => {
    return bulkRows.filter((r) => !r.isLocked && !r.skip).length;
  }, [bulkRows]);

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError(null);

    if (!bulkDate) {
      setBulkError("Attendance date is required.");
      return;
    }

    const editableRows = bulkRows.filter((r) => !r.isLocked && !r.skip);
    if (editableRows.length === 0) {
      return;
    }

    setIsBulkSubmitting(true);
    try {
      const res = await attendanceApi.bulkCreate({
        attendanceDate: bulkDate,
        records: editableRows.map((r) => ({
          employeeId: r.employee.id,
          status: r.status,
          remarks: r.remarks.trim() || undefined,
        })),
      });
      toast.success(
        "Bulk Attendance Saved",
        `Recorded attendance for ${res.count} employees on ${bulkDate}.`
      );
      setIsBulkOpen(false);
      if (viewMode === "monthly") fetchMonthlyData();
      else fetchListData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save bulk attendance.";
      setBulkError(msg);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const statusBadgeVariant = (s: AttendanceStatus) => {
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

  // List View Columns
  const columns: ColumnDef<Attendance>[] = [
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
      header: "Department",
      cell: (row) => (
        <span className="text-foreground">
          {row.employee?.department?.name || "—"}
        </span>
      ),
    },
    {
      header: "Date",
      cell: (row) => (
        <span className="font-medium text-foreground">
          {row.attendance_date}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge variant={statusBadgeVariant(row.status)} showDot>
          {row.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      header: "Remarks",
      cell: (row) => (
        <span className="text-muted-foreground truncate max-w-xs block">
          {row.remarks || "—"}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <Can permission={PermissionCode.ATTENDANCE_UPDATE}>
          {row.leave_record_id ||
          row.leave_record ||
          (row.status === AttendanceStatus.LEAVE &&
            row.remarks?.toLowerCase().includes("approved leave")) ? (
            <Tooltip content="Linked to approved leave. Modify the Leave Record to change this attendance.">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs font-medium border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                leftIcon={<Lock className="w-3.5 h-3.5 text-amber-500" />}
                onClick={() =>
                  router.push(
                    `/leave?search=${encodeURIComponent(row.employee?.first_name || "")}`
                  )
                }
              >
                View Leave
              </Button>
            </Tooltip>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => handleOpenSingleEdit(row)}
            >
              Edit
            </Button>
          )}
        </Can>
      ),
    },
  ];

  return (
    <PageContainer maxWidth="xl" className="py-6 space-y-6">
      {/* Header Section */}
      <PageHeader
        title="Attendance Workspace"
        description="Review monthly employee presence grid, leave synchronization, and daily attendance logs."
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Toggle */}
            <div className="inline-flex items-center p-1 rounded-lg bg-secondary/80 border border-border">
              <button
                type="button"
                onClick={() => setParam("view", "monthly")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "monthly"
                    ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                Monthly Grid
              </button>
              <button
                type="button"
                onClick={() => setParam("view", "list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ListIcon className="w-3.5 h-3.5" />
                List View
              </button>
            </div>

            <Can permission={PermissionCode.ATTENDANCE_CREATE}>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  leftIcon={<Users className="w-4 h-4" />}
                  onClick={handleOpenBulk}
                >
                  Bulk Attendance
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenSingleCreate}
                >
                  Single Entry
                </Button>
              </div>
            </Can>
          </div>
        }
      />

      {/* Filter & Controls Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Month Selector Controls */}
          {viewMode === "monthly" && (
            <div className="flex items-center gap-2 bg-secondary/50 p-1.5 rounded-xl border border-border">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handlePrevMonth}
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-1.5 px-3 text-sm font-bold text-foreground">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{monthNameStr} {selectedYear}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleNextMonth}
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs ml-2 px-2.5"
                onClick={handleToday}
              >
                Today
              </Button>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-3 flex-1 justify-end flex-wrap">
            <FilterBar
              searchValue={search}
              onSearchChange={(val) => setParams({ search: val, page: 1 })}
              filters={[
                {
                  key: "employeeId",
                  label: "Employee",
                  value: employeeIdFilter,
                  options: employees.map((e) => ({
                    value: e.id,
                    label: `${e.first_name} ${e.last_name} (${e.employee_code})`,
                  })),
                },
                {
                  key: "status",
                  label: "Status",
                  value: statusFilter,
                  options: [
                    { value: AttendanceStatus.PRESENT, label: "PRESENT" },
                    { value: AttendanceStatus.ABSENT, label: "ABSENT" },
                    { value: AttendanceStatus.HALF_DAY, label: "HALF DAY" },
                    { value: AttendanceStatus.LEAVE, label: "LEAVE" },
                    { value: AttendanceStatus.HOLIDAY, label: "HOLIDAY" },
                  ],
                },
              ]}
              onFilterChange={(key, val) => setParams({ [key]: val, page: 1 })}
              onClearAll={() =>
                setParams({ search: "", employeeId: "", status: "", startDate: "", endDate: "", page: 1 })
              }
            />

            {viewMode === "list" && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  placeholder="From Date"
                  value={startDateFilter}
                  onChange={(e) => setParams({ startDate: e.target.value, page: 1 })}
                  className="w-36 h-8 py-1 text-xs"
                />
                <Input
                  type="date"
                  placeholder="To Date"
                  value={endDateFilter}
                  onChange={(e) => setParams({ endDate: e.target.value, page: 1 })}
                  className="w-36 h-8 py-1 text-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* Monthly Summary Cards (Monthly View) */}
        {viewMode === "monthly" && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-border">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              <span className="text-[10px] font-bold uppercase tracking-wider block">Present</span>
              <span className="text-xl font-bold font-mono">{monthlySummary.present}</span>
            </div>
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300">
              <span className="text-[10px] font-bold uppercase tracking-wider block">Absent</span>
              <span className="text-xl font-bold font-mono">{monthlySummary.absent}</span>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <span className="text-[10px] font-bold uppercase tracking-wider block">Leave</span>
              <span className="text-xl font-bold font-mono">{monthlySummary.leave}</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
              <span className="text-[10px] font-bold uppercase tracking-wider block">Half Day</span>
              <span className="text-xl font-bold font-mono">{monthlySummary.halfDay}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-700 dark:text-slate-300">
              <span className="text-[10px] font-bold uppercase tracking-wider block">Holidays</span>
              <span className="text-xl font-bold font-mono">{monthlySummary.holiday}</span>
            </div>
          </div>
        )}
      </div>

      {/* VIEW MODE 1: MONTHLY ATTENDANCE GRID */}
      {viewMode === "monthly" && (
        <div className="space-y-3">
          {/* Status Legend */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 flex-wrap gap-2">
            <div className="flex items-center gap-4 flex-wrap font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>P = Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span>A = Absent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                <span>L = Approved Leave</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>HD = Half Day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <span>H = Holiday</span>
              </div>
            </div>
            <div className="text-[11px] italic">
              Click any cell to inspect or manage daily attendance details.
            </div>
          </div>

          {/* Monthly Matrix Grid */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                <thead className="bg-muted/80 sticky top-0 z-20 backdrop-blur border-b border-border">
                  <tr>
                    <th className="px-3 py-3 font-semibold text-foreground sticky left-0 z-30 bg-muted/95 min-w-[200px] border-r border-border shadow-sm">
                      Employee
                    </th>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                      const dateObj = new Date(selectedYear, selectedMonth - 1, d);
                      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                      const dayName = dateObj.toLocaleString("en-US", { weekday: "short" });

                      return (
                        <th
                          key={d}
                          className={`px-1.5 py-2 text-center border-r border-border/50 min-w-[38px] ${
                            isWeekend ? "bg-muted/50 text-muted-foreground font-normal" : "text-foreground"
                          }`}
                        >
                          <div className="font-bold text-xs">{d}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{dayName[0]}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isMonthlyLoading ? (
                    <tr>
                      <td colSpan={daysInMonth + 1} className="p-12 text-center text-muted-foreground">
                        Loading monthly attendance grid for {monthNameStr} {selectedYear}...
                      </td>
                    </tr>
                  ) : monthlyError ? (
                    <tr>
                      <td colSpan={daysInMonth + 1} className="p-8 text-center text-danger">
                        {monthlyError}
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={daysInMonth + 1} className="p-12 text-center text-muted-foreground">
                        No active employees found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-secondary/30 transition-colors">
                        {/* Sticky Employee Cell */}
                        <td className="px-3 py-2 font-medium sticky left-0 z-10 bg-card border-r border-border min-w-[200px] shadow-sm">
                          <div className="font-semibold text-foreground truncate max-w-[180px]">
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            {emp.employee_code}
                          </div>
                        </td>

                        {/* Attendance Matrix Day Cells */}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                          const dateStr = `${selectedYear}-${monthFormattedStr}-${String(d).padStart(2, "0")}`;
                          const att = attendanceMap[`${emp.id}_${dateStr}`];
                          const lr = leaveMap[`${emp.id}_${dateStr}`];
                          const isLeaveLinked = !!lr || !!att?.leave_record_id || att?.status === AttendanceStatus.LEAVE;

                          let badgeSymbol = "—";
                          let badgeClass = "text-muted-foreground/40 font-mono";

                          if (isLeaveLinked) {
                            badgeSymbol = "L";
                            badgeClass = "bg-primary/20 text-primary font-bold border-primary/30";
                          } else if (att) {
                            switch (att.status) {
                              case AttendanceStatus.PRESENT:
                                badgeSymbol = "P";
                                badgeClass = "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold border-emerald-500/30";
                                break;
                              case AttendanceStatus.ABSENT:
                                badgeSymbol = "A";
                                badgeClass = "bg-red-500/20 text-red-700 dark:text-red-400 font-bold border-red-500/30";
                                break;
                              case AttendanceStatus.HALF_DAY:
                                badgeSymbol = "HD";
                                badgeClass = "bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold border-amber-500/30";
                                break;
                              case AttendanceStatus.HOLIDAY:
                                badgeSymbol = "H";
                                badgeClass = "bg-slate-500/20 text-slate-700 dark:text-slate-400 font-bold border-slate-500/30";
                                break;
                            }
                          }

                          return (
                            <td
                              key={d}
                              onClick={() =>
                                setSelectedCell({
                                  employee: emp,
                                  dateStr,
                                  attendance: att || null,
                                  leaveRecord: lr || null,
                                })
                              }
                              className="px-1 py-2 text-center border-r border-border/40 cursor-pointer hover:bg-primary/10 transition-colors"
                            >
                              <div className="flex items-center justify-center">
                                <span
                                  className={`inline-flex items-center justify-center w-7 h-6 rounded text-[11px] border ${badgeClass}`}
                                >
                                  {isLeaveLinked && <Lock className="w-2.5 h-2.5 mr-0.5" />}
                                  {badgeSymbol}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: CHRONOLOGICAL LIST TABLE */}
      {viewMode === "list" && (
        <DataTable
          columns={columns}
          data={dataResponse?.data || []}
          isLoading={isListLoading}
          error={listError}
          emptyTitle="No attendance records found"
          emptyDescription="Use Bulk Attendance or Single Entry to record daily workforce presence."
          pagination={{
            page,
            limit,
            total: dataResponse?.meta.total || 0,
            totalPages: dataResponse?.meta.totalPages || 1,
            onPageChange: (p) => setParam("page", p),
            onLimitChange: (l) => setParams({ limit: l, page: 1 }),
          }}
        />
      )}

      {/* Cell Details Inspection Modal */}
      <Modal
        isOpen={!!selectedCell}
        onClose={() => setSelectedCell(null)}
        title="Attendance Details"
        description="Daily operational attendance log and leave synchronization breakdown."
      >
        {selectedCell && (
          <div className="space-y-4 text-xs">
            {/* Employee Info Header */}
            <div className="p-3.5 rounded-xl bg-secondary/50 border border-border flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-foreground">
                  {selectedCell.employee.first_name} {selectedCell.employee.last_name}
                </div>
                <div className="text-muted-foreground font-mono">
                  {selectedCell.employee.employee_code} • {selectedCell.employee.department?.name || "No Department"}
                </div>
              </div>
              <Badge variant="primary" className="text-xs font-mono">
                {selectedCell.dateStr}
              </Badge>
            </div>

            {/* Attendance Status */}
            <div className="p-3 rounded-lg border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Recorded Status</span>
                <Badge
                  variant={
                    selectedCell.leaveRecord || selectedCell.attendance?.status === AttendanceStatus.LEAVE
                      ? "primary"
                      : selectedCell.attendance
                      ? statusBadgeVariant(selectedCell.attendance.status)
                      : "neutral"
                  }
                  showDot
                >
                  {selectedCell.leaveRecord || selectedCell.attendance?.status === AttendanceStatus.LEAVE
                    ? "LEAVE (Approved)"
                    : selectedCell.attendance
                    ? selectedCell.attendance.status.replace("_", " ")
                    : "NOT RECORDED"}
                </Badge>
              </div>

              {selectedCell.attendance?.remarks && (
                <div className="pt-2 border-t border-border/60 text-muted-foreground">
                  <span className="font-semibold text-foreground">Remarks: </span>
                  {selectedCell.attendance.remarks}
                </div>
              )}
            </div>

            {/* Approved Leave Synchronization Detail */}
            {(selectedCell.leaveRecord ||
              selectedCell.attendance?.leave_record ||
              selectedCell.attendance?.leave_record_id) && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
                  <Lock className="w-4 h-4" />
                  <span>Auto-synchronized from approved leave</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-500/20 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block">Leave Type</span>
                    <span className="font-semibold text-foreground">
                      {selectedCell.leaveRecord?.leave_type?.name ||
                        selectedCell.attendance?.leave_record?.leave_type?.name ||
                        "Approved Leave"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Salary Treatment</span>
                    <span className="font-semibold text-foreground">
                      {selectedCell.leaveRecord?.is_paid !== false ? "Paid Leave" : "Unpaid Leave"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block">Leave Period</span>
                    <span className="font-mono text-foreground">
                      {selectedCell.leaveRecord?.start_date} to {selectedCell.leaveRecord?.end_date}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-amber-700 dark:text-amber-400 italic pt-1 border-t border-amber-500/20">
                  Linked to an approved leave. Modify the leave record instead to change attendance status.
                </p>

                <div className="pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs border-amber-500/40 bg-amber-500/20 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30"
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setSelectedCell(null);
                      router.push(
                        `/leave?search=${encodeURIComponent(selectedCell.employee.first_name || "")}`
                      );
                    }}
                  >
                    View Leave Record
                  </Button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="ghost" onClick={() => setSelectedCell(null)}>
                Close
              </Button>

              {!selectedCell.leaveRecord &&
                !selectedCell.attendance?.leave_record_id &&
                selectedCell.attendance && (
                  <Can permission={PermissionCode.ATTENDANCE_UPDATE}>
                    <Button
                      variant="primary"
                      leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      onClick={() => {
                        const attToEdit = selectedCell.attendance!;
                        setSelectedCell(null);
                        handleOpenSingleEdit(attToEdit);
                      }}
                    >
                      Edit Attendance
                    </Button>
                  </Can>
                )}
            </div>
          </div>
        )}
      </Modal>

      {/* Single Attendance Modal */}
      <Modal
        isOpen={isSingleOpen}
        onClose={() => setIsSingleOpen(false)}
        title={editingAttendance ? "Edit Attendance Record" : "Record Attendance"}
        description={editingAttendance ? "Update existing attendance status." : "Record daily attendance for a single employee."}
      >
        <form onSubmit={handleSingleSubmit} className="space-y-4">
          {singleError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{singleError}</span>
            </div>
          )}

          {!editingAttendance && (
            <Select
              label="Employee"
              required
              placeholder="Select Employee"
              value={singleEmpId}
              onChange={(e) => setSingleEmpId(e.target.value)}
              options={employees.map((e) => ({
                value: e.id,
                label: `${e.first_name} ${e.last_name} (${e.employee_code})`,
              }))}
            />
          )}

          <Input
            label="Attendance Date"
            type="date"
            required
            value={singleDate}
            onChange={(e) => setSingleDate(e.target.value)}
          />

          <Select
            label="Attendance Status"
            required
            value={singleStatus}
            onChange={(e) => setSingleStatus(e.target.value as AttendanceStatus)}
            options={[
              { value: AttendanceStatus.PRESENT, label: "PRESENT — Present at work" },
              { value: AttendanceStatus.ABSENT, label: "ABSENT — Unexcused absence" },
              { value: AttendanceStatus.HALF_DAY, label: "HALF DAY — Half day present" },
              { value: AttendanceStatus.LEAVE, label: "LEAVE — On approved leave" },
              { value: AttendanceStatus.HOLIDAY, label: "HOLIDAY — Company holiday" },
            ]}
          />

          <Input
            label="Remarks (Optional)"
            placeholder="Reason or notes..."
            value={singleRemarks}
            onChange={(e) => setSingleRemarks(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsSingleOpen(false)}
              disabled={isSingleSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSingleSubmitting}>
              Save Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Attendance Modal */}
      <Modal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title="Bulk Daily Attendance Entry"
        description="Rapidly mark daily attendance for all active workforce employees."
        size="lg"
      >
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          {bulkError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{bulkError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="w-48">
              <Input
                label="Attendance Date"
                type="date"
                required
                value={bulkDate}
                onChange={(e) => handleBulkDateChange(e.target.value)}
                className="py-1 text-xs"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              onClick={handleMarkAllPresent}
              disabled={isBulkLoading || bulkRows.length === 0}
            >
              Mark All Present
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold sticky top-0 bg-card z-10">
                <tr>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2 w-44">Attendance Status</th>
                  <th className="px-3 py-2">Remarks</th>
                  <th className="px-3 py-2 text-center w-16">Skip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isBulkLoading ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      Loading active employees...
                    </td>
                  </tr>
                ) : bulkRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      No active employees found in your company.
                    </td>
                  </tr>
                ) : (
                  bulkRows.map((row, idx) => (
                    <tr
                      key={row.employee.id}
                      className={
                        row.isLocked
                          ? "bg-amber-500/5 dark:bg-amber-950/20 border-l-2 border-l-amber-500"
                          : row.skip
                          ? "opacity-60 hover:bg-secondary/30"
                          : "hover:bg-secondary/30"
                      }
                    >
                      <td className="px-3 py-2">
                        <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                          <span>
                            {row.employee.first_name} {row.employee.last_name}
                          </span>
                          {row.isLocked && (
                            <Badge
                              variant="warning"
                              className="text-[10px] py-0 px-1.5 flex items-center gap-1 font-normal"
                            >
                              <Lock className="w-3 h-3 text-amber-500" />
                              Approved Leave {row.leaveTypeName ? `(${row.leaveTypeName})` : ""}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground">
                          {row.employee.employee_code}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {row.isLocked ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold">
                            <Lock className="w-3.5 h-3.5" />
                            <span>LEAVE</span>
                          </div>
                        ) : (
                          <Select
                            value={row.status}
                            onChange={(e) =>
                              handleBulkRowStatusChange(idx, e.target.value as AttendanceStatus)
                            }
                            options={[
                              { value: AttendanceStatus.PRESENT, label: "PRESENT" },
                              { value: AttendanceStatus.ABSENT, label: "ABSENT" },
                              { value: AttendanceStatus.HALF_DAY, label: "HALF DAY" },
                              { value: AttendanceStatus.LEAVE, label: "LEAVE" },
                              { value: AttendanceStatus.HOLIDAY, label: "HOLIDAY" },
                            ]}
                            className="py-1 text-xs"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          placeholder="Remarks..."
                          value={row.remarks}
                          onChange={(e) => handleBulkRowRemarksChange(idx, e.target.value)}
                          disabled={row.isLocked}
                          className={`w-full rounded border border-input bg-card px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary ${
                            row.isLocked ? "opacity-60 bg-muted cursor-not-allowed" : ""
                          }`}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Skip ${row.employee.first_name} ${row.employee.last_name}`}
                          checked={row.skip}
                          disabled={row.isLocked}
                          onChange={(e) => handleBulkRowSkipChange(idx, e.target.checked)}
                          className="w-4 h-4 rounded border-input accent-primary cursor-pointer align-middle disabled:cursor-not-allowed"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsBulkOpen(false)}
              disabled={isBulkSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isBulkSubmitting}
              disabled={isBulkLoading || editableBulkCount === 0}
            >
              {editableBulkCount > 0
                ? `Save Bulk Attendance (${editableBulkCount})`
                : "No employees to save"}
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}

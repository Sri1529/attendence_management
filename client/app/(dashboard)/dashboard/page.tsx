"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";
import { useAuth } from "@/hooks/use-auth";
import { employeesApi } from "@/lib/api/employees";
import { attendanceApi } from "@/lib/api/attendance";
import { leaveRecordsApi } from "@/lib/api/leave-records";
import { subscriptionApi } from "@/lib/api/subscription";
import { PermissionCode } from "@/lib/permissions/codes";
import { EmploymentStatus } from "@/types/organization";
import { AttendanceStatus } from "@/types/attendance";
import { LeaveStatus } from "@/types/leave";
import { Subscription } from "@/types/subscription";
import {
  Building2,
  ShieldCheck,
  User,
  Users,
  CalendarCheck2,
  CalendarDays,
  ArrowRight,
  UserPlus,
  UserCheck,
  UserX,
  ShieldAlert,
  CreditCard,
  History,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  const [totalEmployees, setTotalEmployees] = useState<number | null>(null);
  const [activeEmployees, setActiveEmployees] = useState<number | null>(null);
  const [presentToday, setPresentToday] = useState<number | null>(null);
  const [absentToday, setAbsentToday] = useState<number | null>(null);
  const [pendingLeaves, setPendingLeaves] = useState<number | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  const companyName = user?.company?.name || "Your Company";
  const roleName = user?.role?.name || "Company Owner";
  const userName = user?.name || "User";
  const todayDate = new Date().toISOString().split("T")[0];

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardMetrics = async () => {
      setIsLoadingMetrics(true);
      try {
        const [empRes, attRes, absentRes, leaveRes, subRes] = await Promise.allSettled([
          employeesApi.list({ limit: 1 }),
          attendanceApi.list({ startDate: todayDate, endDate: todayDate, status: AttendanceStatus.PRESENT, limit: 1 }),
          attendanceApi.list({ startDate: todayDate, endDate: todayDate, status: AttendanceStatus.ABSENT, limit: 1 }),
          leaveRecordsApi.list({ status: LeaveStatus.PENDING, limit: 1 }),
          subscriptionApi.getCurrent(),
        ]);

        if (isMounted && empRes.status === "fulfilled") {
          setTotalEmployees(empRes.value.meta.total);
          employeesApi
            .list({ limit: 1, employmentStatus: EmploymentStatus.ACTIVE })
            .then((res) => {
              if (isMounted) setActiveEmployees(res.meta.total);
            })
            .catch(() => null);
        }

        if (isMounted && attRes.status === "fulfilled") {
          setPresentToday(attRes.value.meta.total);
        }

        if (isMounted && absentRes.status === "fulfilled") {
          setAbsentToday(absentRes.value.meta.total);
        }

        if (isMounted && leaveRes.status === "fulfilled") {
          setPendingLeaves(leaveRes.value.meta.total);
        }

        if (isMounted && subRes.status === "fulfilled") {
          setSubscription(subRes.value);
        }
      } finally {
        if (isMounted) setIsLoadingMetrics(false);
      }
    };

    fetchDashboardMetrics();

    return () => {
      isMounted = false;
    };
  }, [todayDate]);

  return (
    <PageContainer maxWidth="xl" className="py-6 space-y-6">
      <PageHeader
        title={`Welcome back, ${userName}`}
        description={`Manage ${companyName}'s workforce, track attendance, review leave requests, and monitor company settings.`}
        badge={
          <Badge variant="success" showDot>
            Active Workspace
          </Badge>
        }
        actions={
          <Can permission={PermissionCode.EMPLOYEE_CREATE}>
            <Link href="/employees/new">
              <Button variant="primary" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
                Add Employee
              </Button>
            </Link>
          </Can>
        }
      />

      {/* Operational Metrics KPIs */}
      <Section title="Overview Metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card hoverable>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Total Workforce
                </span>
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-extrabold text-foreground mt-1">
                {isLoadingMetrics ? "..." : totalEmployees ?? "—"}
              </div>
              <CardDescription>
                {activeEmployees !== null ? `${activeEmployees} Active Employees` : "Registered company employees"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link href="/employees" className="text-xs text-primary font-medium hover:underline flex items-center gap-1 mt-2">
                Manage Employees <ArrowRight className="w-3 h-3" />
              </Link>
            </CardContent>
          </Card>

          <Card hoverable>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Present Today
                </span>
                <CalendarCheck2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-extrabold text-foreground mt-1">
                {isLoadingMetrics ? "..." : presentToday ?? "—"}
              </div>
              <CardDescription>Marked present on {todayDate}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link href="/attendance" className="text-xs text-primary font-medium hover:underline flex items-center gap-1 mt-2">
                Attendance Desk <ArrowRight className="w-3 h-3" />
              </Link>
            </CardContent>
          </Card>

          <Card hoverable>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Absent Today
                </span>
                <UserX className="w-4 h-4 text-danger" />
              </div>
              <div className="text-2xl font-extrabold text-foreground mt-1">
                {isLoadingMetrics ? "..." : absentToday ?? "—"}
              </div>
              <CardDescription>Marked absent on {todayDate}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link href="/attendance" className="text-xs text-primary font-medium hover:underline flex items-center gap-1 mt-2">
                Attendance Desk <ArrowRight className="w-3 h-3" />
              </Link>
            </CardContent>
          </Card>

          <Card hoverable>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Pending Leaves
                </span>
                <CalendarDays className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-extrabold text-foreground mt-1">
                {isLoadingMetrics ? "..." : pendingLeaves ?? "—"}
              </div>
              <CardDescription>Awaiting approval requests</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link href="/leave" className="text-xs text-primary font-medium hover:underline flex items-center gap-1 mt-2">
                Leave Approvals <ArrowRight className="w-3 h-3" />
              </Link>
            </CardContent>
          </Card>

          <Card hoverable>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Current Plan
                </span>
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              <div className="mt-1">
                <Badge variant={subscription?.status === "ACTIVE" ? "success" : "primary"} showDot>
                  {subscription?.status || "TRIAL"}
                </Badge>
              </div>
              <CardDescription>
                {subscription?.plan?.name || "14-Day Free Trial"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Can permission={PermissionCode.SUBSCRIPTION_VIEW}>
                <Link href="/subscription" className="text-xs text-primary font-medium hover:underline flex items-center gap-1 mt-2">
                  Billing Desk <ArrowRight className="w-3 h-3" />
                </Link>
              </Can>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Authenticated Tenant Profile */}
      <Section title="Account Overview">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Company Account
                </span>
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-base mt-1">{companyName}</CardTitle>
              <CardDescription>
                Organization: Active Workspace
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Role Assignment
                </span>
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-base mt-1">{roleName}</CardTitle>
              <CardDescription>
                Access Level: Administrative Access
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  User Account
                </span>
                <User className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-base mt-1 truncate">{user?.email}</CardTitle>
              <CardDescription>Account Status: Active User</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Section>

      {/* Administration Quick Launch */}
      <Section
        title="Administration & Controls"
        description="Quick access to manage company users, custom roles, audit logs, and billing options."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card hoverable>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <Can permission={PermissionCode.USER_VIEW}>
                  <Link href="/users">
                    <Button
                      variant="outline"
                      size="sm"
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      className="h-7 text-xs shrink-0 whitespace-nowrap"
                    >
                      Users
                    </Button>
                  </Link>
                </Can>
              </div>
              <CardTitle className="text-base mt-3">Users & Access</CardTitle>
              <CardDescription className="text-xs">
                Create user accounts, assign custom roles, and manage active account statuses.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card hoverable>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <Can permission={PermissionCode.ROLE_VIEW}>
                  <Link href="/roles">
                    <Button
                      variant="outline"
                      size="sm"
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      className="h-7 text-xs shrink-0 whitespace-nowrap"
                    >
                      Roles
                    </Button>
                  </Link>
                </Can>
              </div>
              <CardTitle className="text-base mt-3">Custom Roles</CardTitle>
              <CardDescription className="text-xs">
                Create custom company roles, configure granular module permissions, and protect system roles.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card hoverable>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <Can permission={PermissionCode.AUDIT_LOG_VIEW}>
                  <Link href="/audit-logs">
                    <Button
                      variant="outline"
                      size="sm"
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      className="h-7 text-xs shrink-0 whitespace-nowrap"
                    >
                      Audit Logs
                    </Button>
                  </Link>
                </Can>
              </div>
              <CardTitle className="text-base mt-3">Audit Logs</CardTitle>
              <CardDescription className="text-xs">
                View security audit logs, track user administrative actions, and review system events.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card hoverable>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <Can permission={PermissionCode.SUBSCRIPTION_VIEW}>
                  <Link href="/subscription">
                    <Button
                      variant="outline"
                      size="sm"
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      className="h-7 text-xs shrink-0 whitespace-nowrap"
                    >
                      Subscription
                    </Button>
                  </Link>
                </Can>
              </div>
              <CardTitle className="text-base mt-3">Billing & Payments</CardTitle>
              <CardDescription className="text-xs">
                Manage company subscription, upgrade plans, and view transaction receipts.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Section>
    </PageContainer>
  );
}

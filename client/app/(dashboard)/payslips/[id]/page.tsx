/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { Can } from "@/components/auth/can";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils/format-currency";
import { formatHumanDate, formatPeriodMonthYear } from "@/lib/utils/format-date";
import { payslipsApi } from "@/lib/api/payslips";
import { api } from "@/lib/api/client";
import { Payslip } from "@/types/payslip";
import { ArrowvexLogo } from "@/components/ui/arrowvex-logo";
import { PermissionCode } from "@/lib/permissions/codes";
import {
  ArrowLeft,
  Download,
  Printer,
  User,
  Calendar,
} from "lucide-react";

interface CompanyProfile {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  currency?: string;
}

export default function PayslipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const payslipId = resolvedParams.id;
  const router = useRouter();
  const { toast } = useToast();

  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const ps = await payslipsApi.get(payslipId);
        if (!isMounted) return;
        setPayslip(ps);

        if (ps.company?.name) {
          setCompanyInfo(ps.company);
        } else {
          try {
            const comp = await api.get<CompanyProfile>("/companies/my-company");
            if (isMounted) setCompanyInfo(comp);
          } catch {
            // fallback
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load payslip.";
        if (isMounted) setError(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [payslipId]);

  const handleDownloadPdf = async () => {
    if (!payslip) return;
    setIsDownloadingPdf(true);
    try {
      const blob = await payslipsApi.downloadPdf(payslip.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const compName = companyInfo?.name || payslip.company?.name || "Company";
      const empName = `${payslip.employee?.first_name || ""}-${payslip.employee?.last_name || ""}`.trim();
      const periodName = formatPeriodMonthYear(
        payslip.payroll_record?.payroll_period?.period_year,
        payslip.payroll_record?.payroll_period?.period_month
      );

      const safeComp = compName.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-");
      const safeEmp = empName.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-");
      const safePeriod = periodName.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-");

      a.download = `${safeComp}-Payslip-${safeEmp || payslip.employee?.employee_code || "Employee"}-${safePeriod}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF Downloaded", `Saved payslip #${payslip.payslip_number}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to download PDF.";
      toast.error("Download Failed", msg);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <PageContainer maxWidth="xl" className="py-12 flex flex-col items-center justify-center">
        <Spinner size="lg" className="text-primary mb-3" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          Loading official payslip document...
        </p>
      </PageContainer>
    );
  }

  if (error || !payslip) {
    return (
      <PageContainer maxWidth="xl" className="py-6">
        <ErrorState
          title="Payslip Not Found"
          message={error || "The requested payslip could not be found."}
          onRetry={() => router.push("/payroll")}
          retryText="Return to Payroll"
        />
      </PageContainer>
    );
  }

  const rec = payslip.payroll_record;
  const emp = payslip.employee;
  const comp = companyInfo || payslip.company;
  const companyName = comp?.name || "Company";
  const currencyCode = comp?.currency || "INR";

  const periodMonthYear = formatPeriodMonthYear(
    rec?.payroll_period?.period_year,
    rec?.payroll_period?.period_month,
    rec?.payroll_period?.start_date
  );

  return (
    <PageContainer maxWidth="xl" className="py-6 space-y-6 print:py-0 print:m-0 print:space-y-0 print:max-w-none">
      {/* Global CSS for Single Page Print Formatting */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            background: white !important;
            color: black !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Screen Action Bar (Hidden during printing) */}
      <div className="print:hidden">
        <PageHeader
          title={`${companyName} — Payslip #${payslip.payslip_number}`}
          description={`Issued for ${emp?.first_name} ${emp?.last_name} on ${formatHumanDate(payslip.issued_at)}`}
          badge={
            <Badge variant="success" showDot className="whitespace-nowrap">
              Official Document
            </Badge>
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => router.back()}
              >
                Back
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={handlePrint}
              >
                Print Payslip
              </Button>
              <Can permission={PermissionCode.PAYSLIP_DOWNLOAD}>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Download className="w-4 h-4" />}
                  isLoading={isDownloadingPdf}
                  onClick={handleDownloadPdf}
                >
                  Download PDF
                </Button>
              </Can>
            </div>
          }
        />
      </div>

      {/* Clean Professional Single-Page Payslip Document Card */}
      <Card className="max-w-4xl mx-auto shadow-lg border border-border p-8 bg-card text-foreground print:shadow-none print:border-none print:p-2 print:m-0 print:w-full print:max-w-none">
        {/* Top Header: Registered Company Name & Title */}
        <div className="flex flex-col items-center text-center pb-5 print:pb-2 border-b border-border">
          <div className="flex flex-col items-center justify-center gap-1 mb-1">
            <ArrowvexLogo size="lg" />
          </div>
          <h2 className="text-xs print:text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
            PAYSLIP
          </h2>
          {(comp?.address || comp?.phone || comp?.email) && (
            <p className="text-xs print:text-[10px] text-muted-foreground mt-0.5 max-w-lg">
              {[comp?.address, comp?.phone, comp?.email].filter(Boolean).join(" • ")}
            </p>
          )}
        </div>

        {/* Metadata Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-3 print:py-1.5 border-b border-border text-xs print:text-[11px]">
          <div className="space-y-0.5">
            <div>
              <span className="font-bold text-muted-foreground">Company Name: </span>
              <span className="font-bold text-foreground">{companyName}</span>
            </div>
            <div>
              <span className="font-bold text-muted-foreground">Payroll Period: </span>
              <span className="font-semibold text-foreground">
                {periodMonthYear}
                {rec?.payroll_period && (
                  <span className="text-muted-foreground font-normal ml-1">
                    ({formatHumanDate(rec.payroll_period.start_date)} – {formatHumanDate(rec.payroll_period.end_date)})
                  </span>
                )}
              </span>
            </div>
            <div>
              <span className="font-bold text-muted-foreground">Payslip No.: </span>
              <span className="font-mono font-bold text-foreground">{payslip.payslip_number}</span>
            </div>
          </div>

          <div className="text-right space-y-0.5">
            <div>
              <span className="font-bold text-muted-foreground">Issue Date: </span>
              <span className="font-semibold text-foreground">{formatHumanDate(payslip.issued_at)}</span>
            </div>
          </div>
        </div>

        {/* Employee Details Section */}
        <div className="py-4 print:py-1.5 border-b border-border text-xs print:text-[11px]">
          <h3 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider mb-2 print:mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-primary print:hidden" /> Employee Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-8 gap-y-1 print:gap-x-6 print:gap-y-0.5">
            <div className="flex justify-between py-0.5">
              <span className="text-muted-foreground">Employee Name</span>
              <span className="font-semibold text-foreground">{emp?.first_name} {emp?.last_name}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-muted-foreground">Employee Code</span>
              <span className="font-mono font-bold text-foreground">{emp?.employee_code}</span>
            </div>
            {emp?.department?.name && (
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground">Department</span>
                <span className="font-medium text-foreground">{emp.department.name}</span>
              </div>
            )}
            {emp?.designation?.name && (
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground">Designation</span>
                <span className="font-medium text-foreground">{emp.designation.name}</span>
              </div>
            )}
            {emp?.joining_date && (
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground">Joining Date</span>
                <span className="font-medium text-foreground">{formatHumanDate(emp.joining_date)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Summary Section */}
        {rec && (
          <div className="py-4 print:py-1.5 border-b border-border">
            <h3 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider mb-2 print:mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary print:hidden" /> Attendance Summary
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-7 print:grid-cols-7 gap-2 print:gap-1 text-center text-xs print:text-[10px] p-3 print:p-1.5 rounded-xl print:rounded-lg bg-secondary/40 border border-border/50">
              <div>
                <div className="text-muted-foreground text-[10px] print:text-[9px]">Working</div>
                <div className="font-bold text-foreground mt-0.5">{rec.working_days}</div>
              </div>
              <div>
                <div className="text-emerald-600 dark:text-emerald-400 text-[10px] print:text-[9px]">Present</div>
                <div className="font-bold text-foreground mt-0.5">{rec.present_days}</div>
              </div>
              <div>
                <div className="text-danger text-[10px] print:text-[9px]">Absent</div>
                <div className="font-bold text-foreground mt-0.5">{rec.absent_days}</div>
              </div>
              <div>
                <div className="text-warning text-[10px] print:text-[9px]">Half Days</div>
                <div className="font-bold text-foreground mt-0.5">{rec.half_days}</div>
              </div>
              <div>
                <div className="text-emerald-600 dark:text-emerald-400 text-[10px] print:text-[9px]">Paid Leave</div>
                <div className="font-bold text-foreground mt-0.5">{rec.paid_leave_days ?? rec.leave_days ?? 0}</div>
              </div>
              <div>
                <div className="text-amber-600 dark:text-amber-400 text-[10px] print:text-[9px]">Unpaid Leave</div>
                <div className="font-bold text-foreground mt-0.5">{rec.unpaid_leave_days ?? 0}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-[10px] print:text-[9px]">Holidays</div>
                <div className="font-bold text-foreground mt-0.5">{rec.holiday_days}</div>
              </div>
            </div>
          </div>
        )}

        {/* Financial Breakdown Table (Earnings vs Deductions) */}
        {rec && (
          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-8 print:gap-4 py-5 print:py-2 border-b border-border text-xs print:text-[11px]">
            {/* Earnings */}
            <div>
              <h3 className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[11px] print:text-[10px] tracking-wider mb-2 print:mb-1">
                Earnings
              </h3>
              <div className="space-y-1.5 print:space-y-0.5">
                <div className="flex justify-between py-1 print:py-0.5 border-b border-border/60">
                  <span className="text-muted-foreground">Basic Salary</span>
                  <span className="font-mono font-semibold text-foreground">{formatCurrency(rec.basic_salary, currencyCode)}</span>
                </div>
                <div className="flex justify-between py-1 print:py-0.5 border-b border-border/60">
                  <span className="text-muted-foreground">Overtime</span>
                  <span className="font-mono font-semibold text-foreground">{formatCurrency(rec.overtime_amount, currencyCode)}</span>
                </div>
                <div className="flex justify-between py-1 print:py-0.5 border-b border-border/60">
                  <span className="text-muted-foreground">Bonus</span>
                  <span className="font-mono font-semibold text-foreground">{formatCurrency(rec.bonus_amount, currencyCode)}</span>
                </div>
                <div className="flex justify-between py-1 print:py-0.5 border-b border-border/60">
                  <span className="text-muted-foreground">Incentive</span>
                  <span className="font-mono font-semibold text-foreground">{formatCurrency(rec.incentive_amount, currencyCode)}</span>
                </div>
                <div className="flex justify-between py-1 print:py-0.5 border-b border-border/60">
                  <span className="text-muted-foreground">Other Earnings</span>
                  <span className="font-mono font-semibold text-foreground">{formatCurrency(rec.other_earnings, currencyCode)}</span>
                </div>
                <div className="flex justify-between py-1.5 print:py-1 font-bold text-sm print:text-xs pt-1.5">
                  <span className="text-foreground">Gross Earnings</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(rec.gross_salary, currencyCode)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h3 className="font-bold text-danger uppercase text-[11px] print:text-[10px] tracking-wider mb-2 print:mb-1">
                Deductions
              </h3>
              <div className="space-y-1.5 print:space-y-0.5">
                <div className="flex justify-between py-1 print:py-0.5 border-b border-border/60">
                  <span className="text-muted-foreground">Absence Deduction</span>
                  <span className="font-mono font-semibold text-foreground">{formatCurrency(rec.absence_deduction, currencyCode)}</span>
                </div>
                <div className="flex justify-between py-1 print:py-0.5 border-b border-border/60">
                  <span className="text-muted-foreground">Unpaid Leave Deduction</span>
                  <span className="font-mono font-semibold text-foreground">{formatCurrency(rec.unpaid_leave_deduction || "0.00", currencyCode)}</span>
                </div>
                <div className="flex justify-between py-1 print:py-0.5 border-b border-border/60">
                  <span className="text-muted-foreground">Advance Deduction</span>
                  <span className="font-mono font-semibold text-foreground">{formatCurrency(rec.advance_deduction, currencyCode)}</span>
                </div>
                {Number(rec.loan_deduction || 0) > 0 && (
                  <div className="flex justify-between py-1 print:py-0.5 border-b border-border/60">
                    <span className="text-muted-foreground font-semibold text-primary">Loan Repayment</span>
                    <span className="font-mono font-semibold text-foreground">{formatCurrency(rec.loan_deduction || "0.00", currencyCode)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 print:py-0.5 border-b border-border/60">
                  <span className="text-muted-foreground">Other Deductions</span>
                  <span className="font-mono font-semibold text-foreground">{formatCurrency(rec.other_deductions, currencyCode)}</span>
                </div>
                <div className="flex justify-between py-1.5 print:py-1 font-bold text-sm print:text-xs pt-1.5">
                  <span className="text-foreground">Total Deductions</span>
                  <span className="font-mono text-danger">{formatCurrency(rec.total_deductions, currencyCode)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Net Salary Payable Prominent Highlight */}
        {rec && (
          <div className="my-4 print:my-2 p-4 print:p-2.5 rounded-xl bg-secondary/50 border border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <div>
              <div className="text-xs print:text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                NET SALARY PAYABLE
              </div>
              <div className="text-3xl print:text-xl font-extrabold font-mono text-primary mt-0.5">
                {formatCurrency(rec.net_salary, currencyCode)}
              </div>
            </div>
          </div>
        )}

        {/* Professional Footer */}
        <div className="pt-4 print:pt-1.5 text-center space-y-0.5">
          <p className="text-[11px] print:text-[9px] text-muted-foreground">
            This payslip is computer-generated and does not require a signature.
          </p>
          <p className="text-xs print:text-[10px] font-bold text-foreground">
            {companyName}
          </p>
        </div>
      </Card>
    </PageContainer>
  );
}

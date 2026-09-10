"use client";

import React, { useState, useEffect } from "react";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { Can } from "@/components/auth/can";
import { useToast } from "@/hooks/use-toast";
import { settingsApi } from "@/lib/api/settings";
import { UserProfile } from "@/lib/api/auth";
import { PermissionCode } from "@/lib/permissions/codes";
import { Building2, ShieldCheck, Lock, Edit3, Globe, Phone, Mail, MapPin } from "lucide-react";

export default function CompanySettingsPage() {
  const { toast } = useToast();
  const [account, setAccount] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formTimezone, setFormTimezone] = useState("");
  const [formCurrency, setFormCurrency] = useState("");
  const [formAbsenceDeductionMode, setFormAbsenceDeductionMode] = useState<"AUTOMATIC" | "MANUAL">("AUTOMATIC");

  const reloadAccount = async () => {
    try {
      const acc = await settingsApi.getAccount();
      setAccount(acc);
      if (acc.company) {
        setFormName(acc.company.name || "");
        setFormEmail(acc.company.email || "");
        setFormPhone(acc.company.phone || "");
        setFormAddress(acc.company.address || "");
        setFormTimezone(acc.company.timezone || "UTC");
        setFormCurrency(acc.company.currency || "USD");
        const mode = (acc.company as unknown as Record<string, unknown>).absence_deduction_mode === "MANUAL" ? "MANUAL" : "AUTOMATIC";
        setFormAbsenceDeductionMode(mode);
      }
    } catch {
      // Silent reload error
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const acc = await settingsApi.getAccount();
        if (isMounted) {
          setAccount(acc);
          if (acc.company) {
            setFormName(acc.company.name || "");
            setFormEmail(acc.company.email || "");
            setFormPhone(acc.company.phone || "");
            setFormAddress(acc.company.address || "");
            setFormTimezone(acc.company.timezone || "UTC");
            setFormCurrency(acc.company.currency || "USD");
            const mode = (acc.company as unknown as Record<string, unknown>).absence_deduction_mode === "MANUAL" ? "MANUAL" : "AUTOMATIC";
            setFormAbsenceDeductionMode(mode);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load company account details.";
        if (isMounted) setError(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!formName.trim()) {
      setEditError("Company Name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await settingsApi.updateCompany({
        name: formName.trim(),
        email: formEmail.trim() || undefined,
        phone: formPhone.trim() || undefined,
        address: formAddress.trim() || undefined,
        timezone: formTimezone.trim() || undefined,
        currency: formCurrency.trim() || undefined,
        absence_deduction_mode: formAbsenceDeductionMode,
      });

      toast.success("Company Profile Updated", "Successfully saved company profile and settings.");
      setIsEditOpen(false);
      await reloadAccount();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update company settings.";
      setEditError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer maxWidth="xl" className="py-12 flex flex-col items-center justify-center">
        <Spinner size="lg" className="text-primary mb-3" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          Loading company profile & settings...
        </p>
      </PageContainer>
    );
  }

  if (error || !account) {
    return (
      <PageContainer maxWidth="xl" className="py-6">
        <ErrorState
          title="Settings Unavailable"
          message={error || "Could not retrieve company profile information."}
          onRetry={() => window.location.reload()}
        />
      </PageContainer>
    );
  }

  const comp = account.company;

  return (
    <Can
      permission={PermissionCode.COMPANY_SETTINGS_VIEW}
      fallback={
        <PageContainer maxWidth="xl" className="py-12">
          <ErrorState
            title="Access Restricted"
            message="You do not have permission to view company settings."
          />
        </PageContainer>
      }
    >
      <PageContainer maxWidth="xl" className="py-6 space-y-6">
        <PageHeader
          title="Company Profile & Settings"
          description="View and update your organization profile, contact info, and administrative settings."
          badge={
            <Badge variant="success" showDot>
              Active Organization
            </Badge>
          }
          actions={
            <Can permission={PermissionCode.COMPANY_SETTINGS_UPDATE}>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Edit3 className="w-4 h-4" />}
                onClick={() => {
                  if (comp) {
                    setFormName(comp.name || "");
                    setFormEmail(comp.email || "");
                    setFormPhone(comp.phone || "");
                    setFormAddress(comp.address || "");
                    setFormTimezone(comp.timezone || "UTC");
                    setFormCurrency(comp.currency || "USD");
                  }
                  setIsEditOpen(true);
                }}
              >
                Edit Company Settings
              </Button>
            </Can>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Organization Identity Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> Company Identity & Contact
              </CardTitle>
              <CardDescription>Organization profile and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Company Name
                </span>
                <span className="font-bold text-foreground">{comp?.name || "ARROWVEX"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Official Email
                </span>
                <span className="font-medium text-foreground">{comp?.email || "—"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Contact Phone
                </span>
                <span className="font-medium text-foreground">{comp?.phone || "—"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Headquarters Address
                </span>
                <span className="font-medium text-foreground">{comp?.address || "—"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Timezone / Currency
                </span>
                <span className="font-mono text-foreground">
                  {comp?.timezone || "UTC"} ({comp?.currency || "USD"})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Account Status</span>
                <div>
                  <Badge variant="success" showDot>
                    {comp?.status || "ACTIVE"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security & Data Protection Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Security & Data Protection
              </CardTitle>
              <CardDescription>Enterprise data privacy and access security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-foreground space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-primary">
                  <Lock className="w-4 h-4" /> Data Privacy & Protection
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  All organizational records, workforce data, attendance logs, and financial payroll calculations are securely encrypted and private to your organization.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border">
                <span className="text-muted-foreground">Primary Owner Role</span>
                <span className="font-semibold text-foreground">{account.role?.name || "Company Owner"}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Account Protection</span>
                <span className="font-semibold text-foreground">Encrypted Session Active</span>
              </div>
            </CardContent>
          </Card>

          {/* Payroll Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Payroll Policy Configuration
              </CardTitle>
              <CardDescription>Absence deduction mode & calculation policy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border items-center">
                <span className="text-muted-foreground">Absence Deduction Mode</span>
                <div>
                  <Badge variant={(comp as unknown as Record<string, unknown>)?.absence_deduction_mode === "MANUAL" ? "warning" : "primary"}>
                    {(comp as unknown as Record<string, unknown>)?.absence_deduction_mode === "MANUAL" ? "Manual Deduction" : "Automatic Formula"}
                  </Badge>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {(comp as unknown as Record<string, unknown>)?.absence_deduction_mode === "MANUAL"
                  ? "Manual mode requires explicit deduction amounts for absent days during payroll generation."
                  : "Automatic mode calculates absence deductions using standard formula: (Basic Salary / Working Days) × Absent Days."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Edit Company Modal */}
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Edit Company Profile & Settings"
          description="Update organization identity, contact info, timezone, currency, and payroll policy."
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editError && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger font-medium">
                {editError}
              </div>
            )}

            <Input
              label="Company Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Acme Corporation"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Official Email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="contact@company.com"
              />
              <Input
                label="Contact Phone"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <Textarea
              label="Physical Address"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              placeholder="123 Corporate Blvd, Suite 100, San Francisco, CA"
              rows={2}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Timezone"
                value={formTimezone}
                onChange={(e) => setFormTimezone(e.target.value)}
                placeholder="UTC, Asia/Kolkata, America/New_York"
              />
              <Input
                label="Base Currency"
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value)}
                placeholder="USD, INR, EUR, GBP"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Absence Deduction Mode
              </label>
              <select
                value={formAbsenceDeductionMode}
                onChange={(e) => setFormAbsenceDeductionMode(e.target.value as "AUTOMATIC" | "MANUAL")}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="AUTOMATIC">Automatic Formula ((Basic / Working Days) × Absent Days)</option>
                <option value="MANUAL">Manual Entry (User specifies amount during generation)</option>
              </select>
              <p className="text-[11px] text-muted-foreground">
                Determines how absent days reduce gross salary during monthly payroll generation.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      </PageContainer>
    </Can>
  );
}

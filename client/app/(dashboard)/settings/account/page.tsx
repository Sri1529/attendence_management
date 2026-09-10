"use client";

import React, { useState, useEffect } from "react";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { useToast } from "@/hooks/use-toast";
import { settingsApi } from "@/lib/api/settings";
import { usersApi } from "@/lib/api/users";
import { UserProfile } from "@/lib/api/auth";
import { User, ShieldCheck, Building2, Clock, Save, AlertCircle } from "lucide-react";

export default function UserAccountSettingsPage() {
  const { toast } = useToast();

  const [account, setAccount] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const acc = await settingsApi.getAccount();
        if (isMounted) {
          setAccount(acc);
          setName(acc.name);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load account profile.";
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setSaveError(null);

    if (!name.trim()) {
      setSaveError("Full Name is required.");
      return;
    }

    setIsSaving(true);
    try {
      await usersApi.update(account.id, {
        name: name.trim(),
        password: newPassword.trim() || undefined,
      });
      toast.success("Profile Updated", "Your account settings have been saved.");
      setNewPassword("");
      const updatedAcc = await settingsApi.getAccount();
      setAccount(updatedAcc);
      setName(updatedAcc.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile.";
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer maxWidth="xl" className="py-12 flex flex-col items-center justify-center">
        <Spinner size="lg" className="text-primary mb-3" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          Loading user account profile...
        </p>
      </PageContainer>
    );
  }

  if (error || !account) {
    return (
      <PageContainer maxWidth="xl" className="py-6">
        <ErrorState
          title="Account Profile Unavailable"
          message={error || "Could not retrieve account details."}
          onRetry={() => window.location.reload()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="xl" className="py-6 space-y-6">
      <PageHeader
        title="My Account Settings"
        description="Manage your user profile details, credentials, and active role assignment."
        badge={
          <Badge variant="primary" showDot>
            {account.role?.name || "User"}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Edit Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Profile Settings
            </CardTitle>
            <CardDescription>Update your displayed name and login credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {saveError && (
                <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <Input
                label="Full Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Input
                label="Email Address (Read-only)"
                disabled
                value={account.email}
                helperText="Email address changes must be requested through your administrator."
              />

              <Input
                label="Change Password (Optional)"
                type="password"
                placeholder="Enter new password (min 6 chars)..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              <div className="flex justify-end pt-2 border-t border-border">
                <Button
                  type="submit"
                  variant="primary"
                  leftIcon={<Save className="w-4 h-4" />}
                  isLoading={isSaving}
                >
                  Save Profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Read-Only Account Metadata */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Security & Role
            </CardTitle>
            <CardDescription>Account permissions context</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-primary" /> Company
              </span>
              <span className="font-semibold text-foreground truncate">
                {account.company?.name || "Company"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Active Role
              </span>
              <div>
                <Badge variant={account.role?.is_system ? "primary" : "neutral"}>
                  {account.role?.name || "User"}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Session Type
              </span>
              <span className="font-medium text-foreground">Authenticated JWT</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

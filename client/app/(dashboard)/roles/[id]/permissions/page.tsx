"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { Can } from "@/components/auth/can";
import { useToast } from "@/hooks/use-toast";
import { rolesApi } from "@/lib/api/roles";
import { permissionsApi } from "@/lib/api/permissions";
import { groupPermissions } from "@/lib/utils/permission-grouping";
import { Role } from "@/types/roles";
import { Permission } from "@/types/permissions";
import { PermissionCode } from "@/lib/permissions/codes";
import {
  ArrowLeft,
  CheckSquare,
  Square,
  Lock,
  Save,
  Building2,
  Users,
  CalendarCheck2,
  CircleDollarSign,
  ShieldCheck,
} from "lucide-react";

export default function RolePermissionMatrixPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const roleId = resolvedParams.id;
  const router = useRouter();
  const { toast } = useToast();

  const [role, setRole] = useState<Role | null>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchRoleAndPermissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [r, pList] = await Promise.all([
        rolesApi.findOne(roleId),
        permissionsApi.findAll(),
      ]);
      setRole(r);
      setAllPermissions(pList);

      const assigned = new Set((r.permissions || []).map((p) => p.id));
      setSelectedIds(assigned);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load role permissions matrix.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [r, pList] = await Promise.all([
          rolesApi.findOne(roleId),
          permissionsApi.findAll(),
        ]);
        if (isMounted) {
          setRole(r);
          setAllPermissions(pList);
          const assigned = new Set((r.permissions || []).map((p) => p.id));
          setSelectedIds(assigned);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load role permissions matrix.";
        if (isMounted) setError(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [roleId]);

  const togglePermission = (id: string) => {
    if (role?.is_system) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleGroup = (permIds: string[], select: boolean) => {
    if (role?.is_system) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      permIds.forEach((id) => {
        if (select) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  };

  const selectAll = () => {
    if (role?.is_system) return;
    setSelectedIds(new Set(allPermissions.map((p) => p.id)));
  };

  const deselectAll = () => {
    if (role?.is_system) return;
    setSelectedIds(new Set());
  };

  const handleSave = async () => {
    if (!role || role.is_system) return;
    setIsSaving(true);
    try {
      await rolesApi.assignPermissions(role.id, Array.from(selectedIds));
      toast.success("Permissions Matrix Saved", `Updated permission matrix for role '${role.name}'.`);
      fetchRoleAndPermissions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save permissions matrix.";
      toast.error("Save Rejected", msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer maxWidth="xl" className="py-12 flex flex-col items-center justify-center">
        <Spinner size="lg" className="text-primary mb-3" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          Loading role permission matrix...
        </p>
      </PageContainer>
    );
  }

  if (error || !role) {
    return (
      <PageContainer maxWidth="xl" className="py-6">
        <ErrorState
          title="Role Not Found"
          message={error || "The requested role could not be found."}
          onRetry={() => router.push("/roles")}
          retryText="Return to Roles Directory"
        />
      </PageContainer>
    );
  }

  const grouped = groupPermissions(allPermissions);

  const getGroupIcon = (groupId: string) => {
    switch (groupId) {
      case "workforce":
        return <Users className="w-4 h-4 text-primary" />;
      case "operations":
        return <CalendarCheck2 className="w-4 h-4 text-primary" />;
      case "payroll":
        return <CircleDollarSign className="w-4 h-4 text-primary" />;
      case "admin":
        return <ShieldCheck className="w-4 h-4 text-primary" />;
      default:
        return <Building2 className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <PageContainer maxWidth="xl" className="py-6 space-y-6">
      <PageHeader
        title={`Permission Matrix — ${role.name}`}
        description={role.description || "Granular security permission configuration."}
        badge={
          <Badge variant={role.is_system ? "primary" : "neutral"} showDot>
            {role.is_system ? "System Protected Role" : "Custom Role"}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/roles">
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back to Roles
              </Button>
            </Link>

            {!role.is_system && (
              <Can permission={PermissionCode.ROLE_UPDATE}>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Save className="w-4 h-4" />}
                  isLoading={isSaving}
                  onClick={handleSave}
                >
                  Save Matrix
                </Button>
              </Can>
            )}
          </div>
        }
      />

      {role.is_system && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-3">
          <Lock className="w-5 h-5 text-primary shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-foreground block">System Role Protection Active</span>
            <span className="text-muted-foreground">
              This system role (Company Owner) possesses permanent, immutable access to all organization capabilities.
            </span>
          </div>
        </div>
      )}

      {/* Control Toolbar for Custom Roles */}
      {!role.is_system && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
          <div className="text-xs text-muted-foreground">
            <span className="font-bold text-foreground">{selectedIds.size}</span> of{" "}
            <span className="font-bold text-foreground">{allPermissions.length}</span> permissions enabled
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAll}>
              Select All
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={deselectAll}>
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* Permission Module Groups */}
      <div className="space-y-6">
        {grouped.map((group) => {
          const groupIds = group.permissions.map((p) => p.id);
          const allSelected = groupIds.every((id) => selectedIds.has(id));

          return (
            <Card key={group.id}>
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getGroupIcon(group.id)}
                    <div>
                      <CardTitle className="text-base">{group.name}</CardTitle>
                      <CardDescription className="text-xs">{group.description}</CardDescription>
                    </div>
                  </div>

                  {!role.is_system && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs font-medium text-primary"
                      onClick={() => toggleGroup(groupIds, !allSelected)}
                    >
                      {allSelected ? "Deselect Module" : "Select Module All"}
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-6">
                {group.subGroups.map((sub) => (
                  <div key={sub.id} className="space-y-2.5">
                    <div className="text-xs font-bold text-foreground/80 tracking-wide uppercase flex items-center gap-1.5 border-b border-border/50 pb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {sub.name}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {sub.permissions.map((perm) => {
                        const isChecked = role.is_system || selectedIds.has(perm.id);

                        return (
                          <div
                            key={perm.id}
                            onClick={() => togglePermission(perm.id)}
                            className={`p-3 rounded-lg border transition-all flex items-start gap-3 ${
                              role.is_system
                                ? "opacity-80 bg-secondary/30 border-border cursor-not-allowed"
                                : isChecked
                                ? "bg-primary/5 border-primary/30 cursor-pointer shadow-sm"
                                : "bg-card border-border hover:bg-secondary/40 cursor-pointer"
                            }`}
                          >
                            <div className="mt-0.5 shrink-0 text-primary">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4" />
                              ) : (
                                <Square className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>

                            <div className="space-y-0.5 text-xs min-w-0">
                              <div className="font-semibold text-foreground truncate">
                                {perm.name}
                              </div>
                              <div className="font-mono text-[10px] text-muted-foreground">{perm.code}</div>
                              {perm.description && (
                                <p className="text-[11px] text-muted-foreground leading-tight mt-1 line-clamp-2">
                                  {perm.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}

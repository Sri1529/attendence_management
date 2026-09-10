"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { PermissionCode } from "@/lib/permissions/codes";
import { hasPermission, hasAnyPermission, hasAllPermissions } from "@/lib/permissions/rbac";

export interface CanProps {
  permission?: PermissionCode | string;
  anyPermission?: (PermissionCode | string)[];
  allPermissions?: (PermissionCode | string)[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({
  permission,
  anyPermission,
  allPermissions,
  fallback = null,
  children,
}) => {
  const { permissions: userPermissions } = useAuth();

  let isAllowed = false;

  if (permission) {
    isAllowed = hasPermission(userPermissions, permission);
  } else if (anyPermission && anyPermission.length > 0) {
    isAllowed = hasAnyPermission(userPermissions, anyPermission);
  } else if (allPermissions && allPermissions.length > 0) {
    isAllowed = hasAllPermissions(userPermissions, allPermissions);
  } else {
    // If no permission criteria provided, render children by default
    isAllowed = true;
  }

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

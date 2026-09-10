import { PermissionCode } from "./codes";

/**
 * Checks if the user holds a specific permission code.
 */
export function hasPermission(
  userPermissions: string[] | undefined | null,
  permission: PermissionCode | string
): boolean {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return false;
  }
  return userPermissions.includes(permission);
}

/**
 * Checks if the user holds AT LEAST ONE of the specified permission codes.
 */
export function hasAnyPermission(
  userPermissions: string[] | undefined | null,
  permissions: (PermissionCode | string)[]
): boolean {
  if (!userPermissions || !Array.isArray(userPermissions) || permissions.length === 0) {
    return false;
  }
  return permissions.some((code) => userPermissions.includes(code));
}

/**
 * Checks if the user holds ALL of the specified permission codes.
 */
export function hasAllPermissions(
  userPermissions: string[] | undefined | null,
  permissions: (PermissionCode | string)[]
): boolean {
  if (!userPermissions || !Array.isArray(userPermissions) || permissions.length === 0) {
    return false;
  }
  return permissions.every((code) => userPermissions.includes(code));
}

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { PermissionCode } from "@/lib/permissions/codes";
import { hasPermission } from "@/lib/permissions/rbac";
import { cn } from "@/lib/utils";
import { ArrowvexLogo } from "@/components/ui/arrowvex-logo";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  CalendarCheck2,
  CalendarDays,
  ListTree,
  CircleDollarSign,
  HandCoins,
  Calculator,
  UserCheck,
  ShieldAlert,
  CreditCard,
  History,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission?: PermissionCode;
  alternativePermission?: PermissionCode;
  badge?: string;
  disabled?: boolean;
}

export interface NavGroup {
  groupName: string;
  items: NavItem[];
}

export interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export const navigationGroups: NavGroup[] = [
  {
    groupName: "Main",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: <LayoutDashboard className="w-4 h-4" />,
      },
    ],
  },
  {
    groupName: "Workforce & HR",
    items: [
      {
        label: "Employees",
        href: "/employees",
        icon: <Users className="w-4 h-4" />,
        permission: PermissionCode.EMPLOYEE_VIEW,
      },
      {
        label: "Departments",
        href: "/departments",
        icon: <Building2 className="w-4 h-4" />,
        permission: PermissionCode.DEPARTMENT_VIEW,
      },
      {
        label: "Designations",
        href: "/designations",
        icon: <Briefcase className="w-4 h-4" />,
        permission: PermissionCode.DESIGNATION_VIEW,
      },
    ],
  },
  {
    groupName: "Attendance & Leave",
    items: [
      {
        label: "Attendance",
        href: "/attendance",
        icon: <CalendarCheck2 className="w-4 h-4" />,
        permission: PermissionCode.ATTENDANCE_VIEW,
      },
      {
        label: "Leave Records",
        href: "/leave",
        icon: <CalendarDays className="w-4 h-4" />,
        permission: PermissionCode.LEAVE_VIEW,
      },
      {
        label: "Leave Types",
        href: "/leave-types",
        icon: <ListTree className="w-4 h-4" />,
        permission: PermissionCode.LEAVE_VIEW,
      },
    ],
  },
  {
    groupName: "Salary & Payroll",
    items: [
      {
        label: "Salary Management",
        href: "/salary",
        icon: <CircleDollarSign className="w-4 h-4" />,
        permission: PermissionCode.SALARY_VIEW,
      },
      {
        label: "Salary Advances",
        href: "/advances",
        icon: <HandCoins className="w-4 h-4" />,
        permission: PermissionCode.ADVANCE_VIEW,
      },
      {
        label: "Payroll & Payslips",
        href: "/payroll",
        icon: <Calculator className="w-4 h-4" />,
        permission: PermissionCode.PAYROLL_VIEW,
        alternativePermission: PermissionCode.PAYSLIP_VIEW,
      },
    ],
  },
  {
    groupName: "Administration",
    items: [
      {
        label: "Users & Accounts",
        href: "/users",
        icon: <UserCheck className="w-4 h-4" />,
        permission: PermissionCode.USER_VIEW,
      },
      {
        label: "Roles & Permissions",
        href: "/roles",
        icon: <ShieldAlert className="w-4 h-4" />,
        permission: PermissionCode.ROLE_VIEW,
      },
      {
        label: "Subscription & Billing",
        href: "/subscription",
        icon: <CreditCard className="w-4 h-4" />,
        permission: PermissionCode.SUBSCRIPTION_VIEW,
      },
      {
        label: "Audit Logs",
        href: "/audit-logs",
        icon: <History className="w-4 h-4" />,
        permission: PermissionCode.AUDIT_LOG_VIEW,
      },
      {
        label: "Company Settings",
        href: "/settings/company",
        icon: <Settings className="w-4 h-4" />,
        permission: PermissionCode.COMPANY_SETTINGS_VIEW,
      },
      {
        label: "Account Settings",
        href: "/settings/account",
        icon: <User className="w-4 h-4" />,
      },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onToggleCollapse,
  className,
}) => {
  const pathname = usePathname();
  const { permissions: userPermissions } = useAuth();

  const visibleGroups = navigationGroups
    .map((group) => {
      const allowedItems = group.items.filter((item) => {
        if (!item.permission) return true;
        const hasMain = hasPermission(userPermissions, item.permission);
        const hasAlt = item.alternativePermission
          ? hasPermission(userPermissions, item.alternativePermission)
          : false;
        return hasMain || hasAlt;
      });
      return { ...group, items: allowedItems };
    })
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-surface text-foreground transition-all duration-200 shrink-0 h-screen sticky top-0 z-30 select-none",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-border h-16">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden flex-1">
          <ArrowvexLogo collapsed={collapsed} size="md" />
        </Link>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus:outline-none hidden md:block cursor-pointer"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation Group Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {visibleGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <h4 className="px-3 text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">
                {group.groupName}
              </h4>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

                if (item.disabled) {
                  return (
                    <div
                      key={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg opacity-50 cursor-not-allowed select-none text-muted-foreground",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {!collapsed && (
                        <div className="flex items-center justify-between w-full">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors relative",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-secondary hover:text-foreground",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                    )}
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

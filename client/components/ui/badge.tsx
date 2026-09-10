import React from "react";
import { cn } from "@/lib/utils";
import { StatusVariant } from "@/types";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusVariant;
  size?: "sm" | "md";
  showDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  size = "md",
  showDot = false,
  children,
  ...props
}) => {
  const variantStyles: Record<StatusVariant, string> = {
    neutral:
      "bg-muted text-muted-foreground border-border",
    success:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    warning:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    danger:
      "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    info:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    primary:
      "bg-primary/10 text-primary border-primary/30",
  };

  const dotStyles: Record<StatusVariant, string> = {
    neutral: "bg-muted-foreground",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    info: "bg-blue-500",
    primary: "bg-primary",
  };

  const sizeStyles = {
    sm: "text-[10px] px-2 py-0.5 font-medium gap-1",
    md: "text-xs px-2.5 py-1 font-medium gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border tracking-wide uppercase font-semibold transition-colors select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotStyles[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

import React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer";

    const variantStyles = {
      primary:
        "bg-primary text-primary-foreground hover:bg-[#E04F18] active:bg-[#C94313] shadow-xs border border-transparent",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-muted active:bg-border border border-transparent",
      outline:
        "bg-transparent text-foreground border border-border hover:bg-secondary hover:border-muted-foreground/30 active:bg-muted",
      ghost:
        "bg-transparent text-foreground hover:bg-secondary active:bg-muted border border-transparent",
      danger:
        "bg-danger text-danger-foreground hover:bg-red-600 active:bg-red-700 shadow-xs border border-transparent",
    };

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 min-h-[32px] gap-1.5",
      md: "text-sm px-4 py-2 min-h-[40px] gap-2",
      lg: "text-base px-5 py-2.5 min-h-[48px] gap-2.5",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Spinner
            size="sm"
            className={
              variant === "primary" || variant === "danger"
                ? "text-white"
                : "text-current"
            }
          />
        ) : (
          leftIcon
        )}
        {children && <span className="inline-flex items-center gap-1.5">{children}</span>}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";

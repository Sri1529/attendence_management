import React from "react";
import { cn } from "@/lib/utils";

export interface ArrowvexIconProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "gradient" | "plain" | "outline";
}

export interface ArrowvexLogoProps {
  className?: string;
  imgClassName?: string;
  textClassName?: string;
  showText?: boolean;
  showCompanyLabel?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  collapsed?: boolean;
  variant?: "gradient" | "plain";
}

export const ArrowvexIcon: React.FC<ArrowvexIconProps> = ({
  className,
  size = "md",
  variant = "gradient",
}) => {
  const sizeMap = {
    sm: "w-7 h-7 rounded-lg",
    md: "w-9 h-9 rounded-xl",
    lg: "w-11 h-11 rounded-xl",
    xl: "w-14 h-14 rounded-2xl",
  };

  const svgSizeMap = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
  };

  if (variant === "plain") {
    return (
      <svg
        className={cn("shrink-0 text-primary transition-colors", svgSizeMap[size], className)}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M42 82 C32 70 28 55 35 42 C42 27 68 27 75 42 C82 57 50 68 42 50 C34 32 52 16 66 14"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M52 23 L70 12 L71 30"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-600 via-primary to-violet-600 text-white shadow-md shadow-primary/25 border border-white/20 transition-all duration-200 hover:scale-105",
        sizeMap[size],
        className
      )}
    >
      <svg
        className={cn("drop-shadow-xs", svgSizeMap[size])}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M42 82 C32 70 28 55 35 42 C42 27 68 27 75 42 C82 57 50 68 42 50 C34 32 52 16 66 14"
          stroke="currentColor"
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M52 23 L70 12 L71 30"
          stroke="currentColor"
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export const ArrowvexLogo: React.FC<ArrowvexLogoProps> = ({
  className,
  imgClassName,
  textClassName,
  showText = true,
  showCompanyLabel = true,
  size = "md",
  collapsed = false,
  variant = "gradient",
}) => {
  const textTitleSizeMap = {
    sm: "text-sm",
    md: "text-base sm:text-lg",
    lg: "text-xl sm:text-2xl",
    xl: "text-2xl sm:text-3xl",
  };

  const textSubSizeMap = {
    sm: "text-[8px]",
    md: "text-[9px] sm:text-[10px]",
    lg: "text-[10px] sm:text-[11px]",
    xl: "text-[11px] sm:text-[12px]",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 overflow-hidden select-none",
        collapsed && "justify-center w-full",
        className
      )}
      title="PayPilot by ArrowVex"
    >
      <ArrowvexIcon size={size} variant={variant} className={imgClassName} />

      {!collapsed && showText && (
        <div className={cn("flex flex-col leading-tight overflow-hidden", textClassName)}>
          <div className="flex items-center">
            <span
              className={cn(
                "font-black tracking-tight text-foreground transition-colors",
                textTitleSizeMap[size]
              )}
            >
              Pay<span className="text-primary">Pilot</span>
            </span>
          </div>

          {showCompanyLabel && (
            <span
              className={cn(
                "font-bold text-muted-foreground uppercase tracking-widest opacity-80 whitespace-nowrap",
                textSubSizeMap[size]
              )}
            >
              by ArrowVex
            </span>
          )}
        </div>
      )}
    </div>
  );
};


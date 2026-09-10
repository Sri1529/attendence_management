import React from "react";
import { cn } from "@/lib/utils";

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  label?: string;
}

export const Divider: React.FC<DividerProps> = ({
  className,
  orientation = "horizontal",
  label,
  ...props
}) => {
  if (orientation === "vertical") {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn("w-[1px] bg-border self-stretch mx-2", className)}
        {...props}
      />
    );
  }

  if (label) {
    return (
      <div
        role="separator"
        className={cn("flex items-center my-4 w-full", className)}
        {...props}
      >
        <div className="flex-grow border-t border-border" />
        <span className="px-3 text-xs uppercase font-medium text-muted-foreground tracking-wider">
          {label}
        </span>
        <div className="flex-grow border-t border-border" />
      </div>
    );
  }

  return (
    <div
      role="separator"
      className={cn("w-full border-t border-border my-4", className)}
      {...props}
    />
  );
};

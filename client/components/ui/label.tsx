import React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 select-none",
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
      </label>
    );
  }
);

Label.displayName = "Label";

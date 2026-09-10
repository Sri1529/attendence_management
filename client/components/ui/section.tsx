import React from "react";
import { cn } from "@/lib/utils";

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({
  className,
  title,
  description,
  action,
  children,
  ...props
}) => {
  return (
    <section className={cn("space-y-4 my-6", className)} {...props}>
      {(title || description || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-foreground tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
};

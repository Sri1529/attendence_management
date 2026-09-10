import React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  className,
  icon = <AlertTriangle className="w-10 h-10 text-danger" />,
  title = "Something went wrong",
  message = "An unexpected error occurred while loading this section. Please try again.",
  onRetry,
  retryText = "Try Again",
  ...props
}) => {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-danger/30 bg-danger/5 my-4 min-h-[220px]",
        className
      )}
      {...props}
    >
      <div className="p-3 rounded-full bg-danger/10 mb-3 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryText}
        </Button>
      )}
    </div>
  );
};

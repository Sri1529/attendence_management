"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

export const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const icons: Record<ToastVariant, React.ReactNode> = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <XCircle className="w-5 h-5 text-red-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
  };

  const variantBorders: Record<ToastVariant, string> = {
    success: "border-emerald-500/30 bg-card text-card-foreground",
    error: "border-red-500/30 bg-card text-card-foreground",
    warning: "border-amber-500/30 bg-card text-card-foreground",
    info: "border-blue-500/30 bg-card text-card-foreground",
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border shadow-lg max-w-sm w-full transition-all duration-200 animate-in slide-in-from-bottom-5",
        variantBorders[toast.variant]
      )}
    >
      <div className="mt-0.5">{icons[toast.variant]}</div>
      <div className="flex-1 space-y-0.5">
        <h4 className="text-xs font-bold text-foreground">{toast.title}</h4>
        {toast.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus:outline-none"
        aria-label="Dismiss toast"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

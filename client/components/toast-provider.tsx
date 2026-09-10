"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { ToastMessage, ToastItem } from "@/components/ui/toast";

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, description?: string, duration?: number) => void;
    error: (title: string, description?: string, duration?: number) => void;
    warning: (title: string, description?: string, duration?: number) => void;
    info: (title: string, description?: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const toastHelpers = {
    success: (title: string, description?: string, duration?: number) =>
      addToast({ variant: "success", title, description, duration }),
    error: (title: string, description?: string, duration?: number) =>
      addToast({ variant: "error", title, description, duration }),
    warning: (title: string, description?: string, duration?: number) =>
      addToast({ variant: "warning", title, description, duration }),
    info: (title: string, description?: string, duration?: number) =>
      addToast({ variant: "info", title, description, duration }),
  };

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, toast: toastHelpers }}
    >
      {children}
      {/* Fixed Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

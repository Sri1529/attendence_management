"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log sanitized error in development without leaking secrets
    if (process.env.NODE_ENV === "development") {
      console.error("Next.js Client Error Boundary caught exception:", error.message);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-16 h-16 rounded-2xl bg-danger/10 text-danger flex items-center justify-center mb-6 shadow-sm">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <span className="font-mono text-xs font-bold text-danger uppercase tracking-widest mb-2">
        UNHANDLED RUNTIME ERROR
      </span>

      <h1 className="text-3xl font-extrabold text-foreground mb-3 tracking-tight">
        Something Went Wrong
      </h1>

      <p className="text-xs text-muted-foreground max-w-md mb-8 leading-relaxed">
        An unexpected application error occurred. You can retry your request or return to the safe dashboard workspace.
      </p>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={() => reset()}
        >
          Try Again
        </Button>
        <Link href="/dashboard">
          <Button variant="primary" size="sm" leftIcon={<Home className="w-4 h-4" />}>
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

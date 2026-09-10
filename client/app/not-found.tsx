"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 shadow-sm">
        <FileQuestion className="w-8 h-8" />
      </div>

      <span className="font-mono text-xs font-bold text-primary uppercase tracking-widest mb-2">
        404 ERROR — PAGE NOT FOUND
      </span>

      <h1 className="text-3xl font-extrabold text-foreground mb-3 tracking-tight">
        Lost in the Cloud?
      </h1>

      <p className="text-xs text-muted-foreground max-w-md mb-8 leading-relaxed">
        The requested resource or dashboard page does not exist or has been relocated to another workspace URL.
      </p>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => window.history.back()}
        >
          Go Back
        </Button>
        <Link href="/dashboard">
          <Button variant="primary" size="sm" leftIcon={<Home className="w-4 h-4" />}>
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

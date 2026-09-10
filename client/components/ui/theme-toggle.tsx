"use client";

import React from "react";
import { useTheme } from "@/hooks/use-theme";
import { Sun, Moon, Monitor } from "lucide-react";
import { Theme } from "@/types";
import { cn } from "@/lib/utils";

export interface ThemeToggleProps {
  variant?: "dropdown" | "pills";
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = "dropdown",
  className,
}) => {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const handleToggle = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const options: { label: string; value: Theme; icon: React.ReactNode }[] = [
    { label: "Light", value: "light", icon: <Sun className="w-4 h-4 text-amber-500" /> },
    { label: "Dark", value: "dark", icon: <Moon className="w-4 h-4 text-sky-400" /> },
    { label: "System", value: "system", icon: <Monitor className="w-4 h-4 text-muted-foreground" /> },
  ];

  if (variant === "pills") {
    return (
      <div className={cn("inline-flex p-1 bg-secondary rounded-lg border border-border", className)}>
        {options.map((opt) => {
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                isActive
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <button
      onClick={handleToggle}
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      className={cn(
        "flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card text-foreground hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer",
        className
      )}
    >
      {resolvedTheme === "dark" ? (
        <Moon className="w-4 h-4 text-primary" />
      ) : (
        <Sun className="w-4 h-4 text-primary" />
      )}
    </button>
  );
};

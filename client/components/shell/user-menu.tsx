"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Building, ShieldCheck } from "lucide-react";

export const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const roleName = user.role?.name || "Member";
  const companyName = user.company?.name || "Company";

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 font-bold text-xs flex items-center justify-center shrink-0">
          {initials}
        </div>
        <div className="hidden sm:flex flex-col text-left truncate max-w-[120px]">
          <span className="text-xs font-semibold text-foreground truncate leading-tight">
            {user.name}
          </span>
          <span className="text-[10px] text-muted-foreground truncate">
            {roleName}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-xl z-50 animate-in fade-in zoom-in-95">
          {/* User Profile Summary Header */}
          <div className="p-3 border-b border-border space-y-1">
            <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>

            <div className="pt-2 flex flex-col gap-1 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Building className="w-3 h-3 text-primary" />
                <span className="truncate font-medium text-foreground">{companyName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-primary" />
                <span className="truncate font-medium text-foreground">{roleName}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

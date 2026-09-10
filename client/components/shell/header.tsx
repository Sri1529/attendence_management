"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserMenu } from "@/components/shell/user-menu";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Menu, PanelLeft } from "lucide-react";
import { navigationGroups } from "./sidebar";

export interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Find page title from navigation items
  let pageTitle = "Dashboard";
  for (const group of navigationGroups) {
    const item = group.items.find((i) => i.href === pathname);
    if (item) {
      pageTitle = item.label;
      break;
    }
  }

  return (
    <>
      <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between transition-colors duration-200">
        {/* Left Side: Mobile Menu Button & Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary focus:outline-none md:hidden cursor-pointer"
            aria-label="Open Mobile Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary focus:outline-none hidden md:block cursor-pointer"
              aria-label="Toggle Sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              App /
            </span>
            <h1 className="text-sm font-bold text-foreground tracking-tight">
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Right Side: Theme Toggle & User Menu */}
        <div className="flex items-center gap-3">
          <ThemeToggle variant="dropdown" />
          <div className="h-5 w-[1px] bg-border" />
          <UserMenu />
        </div>
      </header>

      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
    </>
  );
};

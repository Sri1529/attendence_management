"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectOption } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";

export interface FilterConfig {
  key: string;
  label: string;
  options: SelectOption[];
  value: string;
}

export interface FilterBarProps {
  filters?: FilterConfig[];
  onFilterChange?: (key: string, value: string) => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onClearAll?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters = [],
  onFilterChange,
  searchValue,
  onSearchChange,
  onClearAll,
  className,
  children,
}) => {
  const activeFilters = filters.filter((f) => f.value !== "");
  const hasActiveFilters = activeFilters.length > 0 || !!searchValue;

  return (
    <div className={cn("space-y-3 my-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Search & Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {onSearchChange && (
            <SearchInput
              value={searchValue}
              onSearch={onSearchChange}
              placeholder="Search records..."
            />
          )}

          {filters.map((filter) => (
            <div key={filter.key} className="w-40">
              <Select
                placeholder={`All ${filter.label}s`}
                options={filter.options}
                value={filter.value}
                onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                className="py-1.5 text-xs"
              />
            </div>
          ))}

          {children}
        </div>

        {/* Right Side: Clear All Button */}
        {hasActiveFilters && onClearAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            leftIcon={<X className="w-3.5 h-3.5" />}
            className="text-xs text-muted-foreground hover:text-foreground h-8"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Active Filter Chips/Pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Filter className="w-3 h-3 text-primary" /> Active filters:
          </span>

          {searchValue && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary border border-border text-[11px] font-medium text-foreground">
              Search: &quot;{searchValue}&quot;
              <button
                onClick={() => onSearchChange?.("")}
                className="hover:text-danger focus:outline-none"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {activeFilters.map((filter) => {
            const selectedOption = filter.options.find(
              (opt) => opt.value === filter.value
            );
            return (
              <span
                key={filter.key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary border border-border text-[11px] font-medium text-foreground"
              >
                {filter.label}: {selectedOption?.label || filter.value}
                <button
                  onClick={() => onFilterChange?.(filter.key, "")}
                  className="hover:text-danger focus:outline-none"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

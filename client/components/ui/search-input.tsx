"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Search, X, Loader2 } from "lucide-react";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  debounceMs?: number;
  isLoading?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  className,
  value: externalValue = "",
  onChange,
  onSearch,
  debounceMs = 300,
  isLoading = false,
  placeholder = "Search...",
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(externalValue);
  const [prevExternal, setPrevExternal] = useState(externalValue);
  const isFirstRender = useRef(true);

  if (externalValue !== prevExternal) {
    setPrevExternal(externalValue);
    setInternalValue(externalValue);
  }

  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      onSearchRef.current?.(internalValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalValue, debounceMs]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternalValue(val);
    onChange?.(val);
  };

  const handleClear = () => {
    setInternalValue("");
    onChange?.("");
    onSearchRef.current?.("");
  };

  return (
    <div className={cn("relative flex items-center w-full max-w-xs", className)}>
      <div className="absolute left-3 text-muted-foreground pointer-events-none flex items-center justify-center">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </div>

      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-input bg-card pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        {...props}
      />

      {internalValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary focus:outline-none"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

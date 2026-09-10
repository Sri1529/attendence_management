import React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  limitOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  className,
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 20, 50, 100],
  ...props
}) => {
  if (total === 0) return null;

  const startRecord = Math.min((page - 1) * limit + 1, total);
  const endRecord = Math.min(page * limit, total);

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 border-t border-border bg-card text-xs text-muted-foreground select-none",
        className
      )}
      {...props}
    >
      {/* Showing Record Counts */}
      <div className="flex items-center gap-3">
        <span>
          Showing <strong className="font-semibold text-foreground">{startRecord}</strong> to{" "}
          <strong className="font-semibold text-foreground">{endRecord}</strong> of{" "}
          <strong className="font-semibold text-foreground">{total}</strong> results
        </span>

        {onLimitChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-background border border-input rounded px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page Navigation Buttons */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous Page"
          className="h-8 px-2 text-xs"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <div className="flex items-center gap-1 px-1">
          <span className="font-semibold text-foreground">
            {page}
          </span>
          <span>/</span>
          <span>{totalPages || 1}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next Page"
          className="h-8 px-2 text-xs"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

import React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination, PaginationProps } from "@/components/ui/pagination";

export interface ColumnDef<TData> {
  id?: string;
  header: React.ReactNode;
  accessorKey?: keyof TData;
  cell?: (row: TData, index: number) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  isLoading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: TData) => void;
  pagination?: PaginationProps;
  className?: string;
  skeletonRows?: number;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  error = null,
  emptyTitle = "No records found",
  emptyDescription = "There is no data to display for this view.",
  onRowClick,
  pagination,
  className,
  skeletonRows = 5,
}: DataTableProps<TData>) {
  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden transition-colors duration-150",
        className
      )}
    >
      {/* Scrollable Table Container */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          {/* Table Header */}
          <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.id || idx}
                  className={cn("px-4 py-3 font-semibold select-none", col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, rIdx) => (
                <tr key={rIdx}>
                  {columns.map((col, cIdx) => (
                    <td key={col.id || cIdx} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-[120px]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "transition-colors hover:bg-secondary/40",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={col.id || cIdx}
                      className={cn("px-4 py-3 text-foreground", col.className)}
                    >
                      {col.cell
                        ? col.cell(row, rIdx)
                        : col.accessorKey
                        ? String(row[col.accessorKey] ?? "")
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Embedded Pagination */}
      {pagination && !isLoading && data.length > 0 && <Pagination {...pagination} />}
    </div>
  );
}

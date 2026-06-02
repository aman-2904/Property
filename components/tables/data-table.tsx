"use client";

import * as React from "react";
import { TableSkeleton } from "@/components/ui/skeletons";
import { EmptyState } from "@/components/ui/empty-states";
import { cn } from "@/lib/utils";

interface Column<T> {
  header: string;
  accessorKey?: keyof T | string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  rowClassName?: string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyTitle,
  emptyDescription,
  rowClassName,
}: DataTableProps<T>) {
  if (isLoading) {
    return <TableSkeleton rows={5} />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border/50 glass shadow-xl">
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/40 font-medium text-muted-foreground transition-colors">
              {columns.map((col, index) => (
                <th
                  key={index}
                  className={cn(
                    "px-6 py-4 text-xs font-semibold uppercase tracking-wider",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 bg-transparent">
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn(
                  "hover:bg-muted/10 transition-colors",
                  rowClassName
                )}
              >
                {columns.map((col, colIndex) => {
                  const val =
                    col.accessorKey && typeof col.accessorKey === "string"
                      ? (row as any)[col.accessorKey]
                      : undefined;

                  return (
                    <td
                      key={colIndex}
                      className={cn(
                        "px-6 py-4 text-foreground/90 align-middle",
                        col.className
                      )}
                    >
                      {col.render ? col.render(row) : (val !== undefined ? String(val) : "-")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

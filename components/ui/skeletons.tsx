import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-muted/60", className)}
      {...props}
    />
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/50 p-6 glass-premium">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between gap-4 py-4">
        <Skeleton className="h-10 w-full max-w-[300px]" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="rounded-xl border border-border/50 glass overflow-hidden">
        <div className="border-b border-border/50 bg-muted/30 px-6 py-4">
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-20" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-border/50">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="px-6 py-4">
              <div className="grid grid-cols-5 gap-4">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col rounded-2xl border border-border/50 overflow-hidden glass-premium">
          <Skeleton className="aspect-video w-full" />
          <div className="p-6 flex-1 flex flex-col space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border/40">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 p-6 glass-premium w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="flex items-end gap-3 h-[250px] pt-4 px-2">
        {Array.from({ length: 12 }).map((_, i) => {
          const heights = ["h-[40%]", "h-[65%]", "h-[50%]", "h-[85%]", "h-[30%]", "h-[70%]", "h-[90%]", "h-[45%]", "h-[60%]", "h-[80%]", "h-[55%]", "h-[75%]"];
          return (
            <Skeleton
              key={i}
              className={cn("w-full rounded-t-lg", heights[i])}
            />
          );
        })}
      </div>
    </div>
  );
}

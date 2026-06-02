import * as React from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function StatsCard({
  title,
  value,
  icon,
  description,
  trend,
  className,
  ...props
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/40 p-6 glass-premium flex flex-col justify-between hover:scale-[1.01] hover:border-primary/20 transition-all duration-300 shadow-xl",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/25">
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          {value}
        </h2>
        {(description || trend) && (
          <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
            {trend && (
              <span
                className={cn(
                  "font-bold",
                  trend.isPositive ? "text-emerald-500" : "text-rose-500"
                )}
              >
                {trend.value}
              </span>
            )}
            <span>{description}</span>
          </p>
        )}
      </div>
    </div>
  );
}

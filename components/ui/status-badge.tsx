import * as React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const normStatus = status.toLowerCase().replace(/_/g, " ");

  const configs: Record<
    string,
    { bg: string; text: string; dot: string; label: string }
  > = {
    // Agent status
    active: {
      bg: "bg-emerald-500/10 border border-emerald-500/20",
      text: "text-emerald-500 dark:text-emerald-400",
      dot: "bg-emerald-500",
      label: "Active",
    },
    suspended: {
      bg: "bg-rose-500/10 border border-rose-500/20",
      text: "text-rose-500 dark:text-rose-400",
      dot: "bg-rose-500",
      label: "Suspended",
    },
    // Sales / Commission / Payout status
    pending: {
      bg: "bg-amber-500/10 border border-amber-500/20",
      text: "text-amber-500 dark:text-amber-400",
      dot: "bg-amber-500 animate-pulse",
      label: "Pending",
    },
    pending_approval: {
      bg: "bg-amber-500/10 border border-amber-500/20",
      text: "text-amber-500 dark:text-amber-400",
      dot: "bg-amber-500 animate-pulse",
      label: "Pending Approval",
    },
    approved: {
      bg: "bg-emerald-500/10 border border-emerald-500/20",
      text: "text-emerald-500 dark:text-emerald-400",
      dot: "bg-emerald-500",
      label: "Approved",
    },
    rejected: {
      bg: "bg-rose-500/10 border border-rose-500/20",
      text: "text-rose-500 dark:text-rose-400",
      dot: "bg-rose-500",
      label: "Rejected",
    },
    paid: {
      bg: "bg-blue-500/10 border border-blue-500/20",
      text: "text-blue-500 dark:text-blue-400",
      dot: "bg-blue-500",
      label: "Paid",
    },
    cancelled: {
      bg: "bg-zinc-500/10 border border-zinc-500/20",
      text: "text-zinc-500 dark:text-zinc-400",
      dot: "bg-zinc-500",
      label: "Cancelled",
    },
    // Properties status
    available: {
      bg: "bg-emerald-900 border border-emerald-700",
      text: "text-emerald-300",
      dot: "bg-emerald-400",
      label: "Available",
    },
    sold: {
      bg: "bg-zinc-500/10 border border-zinc-500/20",
      text: "text-zinc-400 dark:text-zinc-500",
      dot: "bg-zinc-500",
      label: "Sold",
    },
  };

  const config = configs[status] || {
    bg: "bg-zinc-500/10 border border-zinc-500/20",
    text: "text-zinc-500",
    dot: "bg-zinc-500",
    label: normStatus.charAt(0).toUpperCase() + normStatus.slice(1),
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
        config.bg,
        config.text,
        className
      )}
      {...props}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

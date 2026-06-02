"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Check,
  X,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  Coins,
  Search,
  Filter,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  profiles?: { name: string; email: string; avatar?: string } | null;
}

interface ActivityLogsClientProps {
  initialLogs: ActivityLog[];
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  sale_approved: <Check className="h-3.5 w-3.5 text-emerald-500" />,
  sale_rejected: <X className="h-3.5 w-3.5 text-rose-500" />,
  sale_submitted: <TrendingUp className="h-3.5 w-3.5 text-blue-400" />,
  withdrawal_approved: <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />,
  withdrawal_rejected: <X className="h-3.5 w-3.5 text-rose-500" />,
  withdrawal_requested: <ArrowUpRight className="h-3.5 w-3.5 text-amber-400" />,
  commission_approved: <Coins className="h-3.5 w-3.5 text-violet-400" />,
  commission_created: <Coins className="h-3.5 w-3.5 text-primary" />,
  commission_rejected: <AlertCircle className="h-3.5 w-3.5 text-rose-500" />,
};

const ACTION_COLORS: Record<string, string> = {
  sale_approved: "bg-emerald-500/10 border-emerald-500/20",
  sale_rejected: "bg-rose-500/10 border-rose-500/20",
  sale_submitted: "bg-blue-500/10 border-blue-500/20",
  withdrawal_approved: "bg-emerald-500/10 border-emerald-500/20",
  withdrawal_rejected: "bg-rose-500/10 border-rose-500/20",
  withdrawal_requested: "bg-amber-500/10 border-amber-500/20",
  commission_approved: "bg-violet-500/10 border-violet-500/20",
  commission_created: "bg-primary/10 border-primary/20",
  commission_rejected: "bg-rose-500/10 border-rose-500/20",
};

const ACTION_LABELS: Record<string, string> = {
  sale_approved: "Sale Approved",
  sale_rejected: "Sale Rejected",
  sale_submitted: "Sale Submitted",
  withdrawal_approved: "Withdrawal Approved",
  withdrawal_rejected: "Withdrawal Rejected",
  withdrawal_requested: "Withdrawal Requested",
  commission_approved: "Commission Approved",
  commission_created: "Commission Distributed",
  commission_rejected: "Commission Rejected",
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

function exportLogsCSV(logs: ActivityLog[]) {
  const headers = ["Action", "Entity Type", "Actor", "Metadata", "Timestamp"];
  const lines = [
    headers.join(","),
    ...logs.map((log) =>
      [
        `"${ACTION_LABELS[log.action] || log.action}"`,
        `"${log.entity_type}"`,
        `"${log.profiles?.name || "System"}"`,
        `"${JSON.stringify(log.metadata || {}).replace(/"/g, '""')}"`,
        `"${new Date(log.created_at).toISOString()}"`,
      ].join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `activity-logs-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ActivityLogsClient({ initialLogs }: ActivityLogsClientProps) {
  const supabase = createClient();
  const [logs, setLogs] = React.useState<ActivityLog[]>(initialLogs);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [newLogIds, setNewLogIds] = React.useState<Set<string>>(new Set());

  // Realtime subscription
  React.useEffect(() => {
    const channel = supabase
      .channel("activity-logs-page")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        (payload) => {
          const newLog = payload.new as ActivityLog;
          setLogs((prev) => [newLog, ...prev].slice(0, 100));
          setNewLogIds((prev) => new Set(Array.from(prev).concat(newLog.id)));
          setTimeout(() => {
            setNewLogIds((prev) => {
              const next = new Set(prev);
              next.delete(newLog.id);
              return next;
            });
          }, 3000);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const filtered = logs.filter((log) => {
    const matchSearch =
      search === "" ||
      (log.profiles?.name?.toLowerCase().includes(search.toLowerCase())) ||
      (ACTION_LABELS[log.action] || log.action).toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "" || log.entity_type === typeFilter;
    return matchSearch && matchType;
  });

  const entityTypes = Array.from(new Set(logs.map((l) => l.entity_type)));

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actions, actors..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/50 bg-muted/20 text-sm text-foreground outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex gap-2">
          {/* Entity filter */}
          <div className="relative flex items-center">
            <Filter className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-xl border border-border/50 bg-muted/20 text-sm text-foreground outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
            >
              <option value="">All Types</option>
              {entityTypes.map((t) => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
          </div>

          {/* Export */}
          <button
            onClick={() => exportLogsCSV(filtered)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/50 bg-muted/20 px-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-xs text-muted-foreground font-semibold">Live feed — {filtered.length} events</span>
      </div>

      {/* Log List */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-border/40 glass-premium p-12 text-center">
              <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold text-muted-foreground">No activity logs found.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Logs appear here after the SQL migration is run in Supabase.
              </p>
            </div>
          ) : (
            filtered.map((log) => (
              <motion.div
                key={log.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex items-center gap-4 rounded-xl border p-4 transition-all",
                  newLogIds.has(log.id)
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/40 glass-premium"
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                    ACTION_COLORS[log.action] || "bg-muted/20 border-border/40"
                  )}
                >
                  {ACTION_ICONS[log.action] || <Activity className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-border/40 bg-muted/20 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {log.entity_type}
                    </span>
                    {newLogIds.has(log.id) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/20 text-[10px] font-bold text-primary border border-primary/30">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {log.profiles && (
                      <span className="text-xs text-muted-foreground">
                        by <span className="font-semibold text-foreground/80">{log.profiles.name}</span>
                      </span>
                    )}
                    {log.metadata?.amount && (
                      <span className="text-xs font-bold text-foreground/70">
                        · ${Number(log.metadata.amount).toLocaleString("en-US")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">{timeAgo(log.created_at)}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/ui/status-badge";
import { MonthlyTrendsChart } from "@/components/charts/monthly-trends-chart";
import { CommissionDistChart } from "@/components/charts/commission-dist-chart";
import { PromotionDistChart } from "@/components/charts/promotion-dist-chart";
import { AgentGrowthChart } from "@/components/charts/agent-growth-chart";
import { VisitTrendsChart } from "@/components/charts/visit-trends-chart";
import { updateSaleStatus } from "@/lib/actions/sales";
import { updatePayoutStatus } from "@/lib/actions/payouts";
import { globalSearch } from "@/lib/actions/admin";
import {
  Users,
  Building2,
  TrendingUp,
  Coins,
  ArrowUpRight,
  DollarSign,
  Bell,
  Search,
  X,
  Check,
  RefreshCw,
  Download,
  Filter,
  Activity,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminStats {
  totalAgents: number;
  totalProperties: number;
  totalSales: number;
  totalCommissions: number;
  totalWithdrawals: number;
  totalRevenue: number;
}

interface AdminDashboardClientProps {
  stats: AdminStats;
  monthlySales: any[];
  commissionDist: any[];
  promotionDist: any[];
  agentGrowth: any[];
  visitTrends: any[];
  initialRecentSales: any[];
  initialRecentWithdrawals: any[];
  initialRecentCommissions: any[];
  initialActivityLogs: any[];
  isSuperAdmin: boolean;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  icon,
  color,
  subtitle,
  pulse,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  pulse?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border/40 p-5 glass-premium flex flex-col justify-between hover:scale-[1.015] hover:border-primary/25 transition-all duration-300 shadow-xl group"
    >
      {/* Background glow */}
      <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20", color)} />
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border border-border/40 text-foreground/70 transition-colors group-hover:text-foreground", color, "bg-opacity-10")}>
          {pulse ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          ) : (
            icon
          )}
        </div>
      </div>
      <div className="mt-4">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{value}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </motion.div>
  );
}

// ─── Chart Panel ─────────────────────────────────────────────────────────────

function ChartPanel({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border/40 p-5 glass-premium", className)}>
      <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      {children}
    </div>
  );
}

// ─── Activity Log Item ────────────────────────────────────────────────────────

function ActivityItem({ log }: { log: any }) {
  const icons: Record<string, React.ReactNode> = {
    sale_approved: <Check className="h-3 w-3 text-emerald-500" />,
    sale_rejected: <X className="h-3 w-3 text-rose-500" />,
    sale_submitted: <TrendingUp className="h-3 w-3 text-blue-400" />,
    withdrawal_approved: <CheckCircle className="h-3 w-3 text-emerald-500" />,
    withdrawal_rejected: <X className="h-3 w-3 text-rose-500" />,
    withdrawal_requested: <ArrowUpRight className="h-3 w-3 text-amber-400" />,
    commission_approved: <Coins className="h-3 w-3 text-violet-400" />,
    commission_created: <Coins className="h-3 w-3 text-primary" />,
    commission_rejected: <AlertCircle className="h-3 w-3 text-rose-500" />,
  };

  const labels: Record<string, string> = {
    sale_approved: "Sale approved",
    sale_rejected: "Sale rejected",
    sale_submitted: "New sale submitted",
    withdrawal_approved: "Withdrawal approved",
    withdrawal_rejected: "Withdrawal rejected",
    withdrawal_requested: "Withdrawal requested",
    commission_approved: "Commission approved",
    commission_created: "Commission distributed",
    commission_rejected: "Commission rejected",
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-border/30 last:border-0">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted/40 border border-border/40">
        {icons[log.action] || <Activity className="h-3 w-3 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">
          {labels[log.action] || log.action}
        </p>
        {log.profiles && (
          <p className="text-[10px] text-muted-foreground truncate">{log.profiles.name}</p>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{timeAgo(log.created_at)}</span>
    </div>
  );
}

// ─── Global Search Panel ──────────────────────────────────────────────────────

function GlobalSearchPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<{ sales: any[]; agents: any[]; properties: any[] } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (query.length < 2) { setResults(null); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await globalSearch(query);
      setResults(res);
      setLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const total = results ? results.sales.length + results.agents.length + results.properties.length : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -8 }}
      className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search agents, sales, properties..."
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted/40 text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {results && (
        <div className="max-h-[420px] overflow-y-auto p-2">
          {total === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No results found for "{query}"</p>
          ) : (
            <>
              {results.agents.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1.5">Agents</p>
                  {results.agents.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/20 cursor-pointer">
                      <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {a.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{a.name}</p>
                        <p className="text-[10px] text-muted-foreground">{a.email}</p>
                      </div>
                      <StatusBadge status={a.is_active ? "active" : "suspended"} className="ml-auto" />
                    </div>
                  ))}
                </div>
              )}
              {results.sales.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1.5">Sales</p>
                  {results.sales.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/20 cursor-pointer">
                      <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{s.buyer_name}</p>
                        <p className="text-[10px] text-muted-foreground">${Number(s.sale_amount).toLocaleString("en-US")}</p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                  ))}
                </div>
              )}
              {results.properties.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1.5">Properties</p>
                  {results.properties.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/20 cursor-pointer">
                      <Building2 className="h-4 w-4 text-violet-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{p.title}</p>
                        <p className="text-[10px] text-muted-foreground">{p.location}</p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── CSV Export helper ────────────────────────────────────────────────────────

function exportCSV(rows: any[], filename: string, headers: string[], keys: string[]) {
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      keys.map((k) => {
        const val = k.split(".").reduce((o, p) => (o ? o[p] : ""), r as any);
        return `"${String(val ?? "").replace(/"/g, '""')}"`;
      }).join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Notification Panel ───────────────────────────────────────────────────────

function NotificationPanel({
  logs,
  onClose,
}: {
  logs: any[];
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.97 }}
      className="fixed top-16 right-4 lg:right-6 z-50 w-80 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Activity Feed</span>
          {logs.length > 0 && (
            <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {logs.length}
            </span>
          )}
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted/40 text-muted-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[400px] overflow-y-auto px-4 py-2">
        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No activity yet.</p>
        ) : (
          logs.slice(0, 25).map((log) => <ActivityItem key={log.id} log={log} />)
        )}
      </div>
      <div className="border-t border-border/40 px-4 py-2.5">
        <a href="/admin/activity" className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline">
          View full activity log <ChevronRight className="h-3 w-3" />
        </a>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminDashboardClient({
  stats,
  monthlySales,
  commissionDist,
  promotionDist,
  agentGrowth,
  visitTrends,
  initialRecentSales,
  initialRecentWithdrawals,
  initialRecentCommissions,
  initialActivityLogs,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isSuperAdmin: _isSuperAdmin,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const supabase = createClient();

  // ── State ──────────────────────────────────────────────────────────────────
  const [recentSales] = React.useState(initialRecentSales);
  const [recentWithdrawals] = React.useState(initialRecentWithdrawals);
  const [recentCommissions] = React.useState(initialRecentCommissions);
  const [activityLogs, setActivityLogs] = React.useState(initialActivityLogs);

  const [activeTab, setActiveTab] = React.useState<"sales" | "withdrawals" | "commissions">("sales");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{ msg: string; ok: boolean } | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const searchRef = React.useRef<HTMLDivElement>(null);

  // ── Supabase Realtime ──────────────────────────────────────────────────────
  React.useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => {
        router.refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, () => {
        router.refresh();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, (payload) => {
        const newLog = payload.new as any;
        setActivityLogs((prev) => [newLog, ...prev].slice(0, 40));
        if (!notifOpen) setUnreadCount((c) => c + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, router, notifOpen]);

  // Clear unread when panel opens
  React.useEffect(() => {
    if (notifOpen) setUnreadCount(0);
  }, [notifOpen]);

  // Close search panel on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Manual Refresh ─────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Sale Actions ───────────────────────────────────────────────────────────
  const handleSaleAction = async (saleId: string, action: "approved" | "rejected") => {
    setActionLoading(saleId);
    const res = await updateSaleStatus(saleId, action);
    setActionLoading(null);
    if (res?.error) {
      showToast(res.error, false);
    } else {
      showToast(action === "approved" ? "Sale approved & commissions distributed!" : "Sale rejected.");
      router.refresh();
    }
  };

  // ── Withdrawal Actions ─────────────────────────────────────────────────────
  const handleWithdrawalAction = async (payoutId: string, status: "approved" | "rejected") => {
    setActionLoading(payoutId);
    const res = await updatePayoutStatus({ payoutId, status });
    setActionLoading(null);
    if (res?.error) {
      showToast(res.error, false);
    } else {
      showToast(status === "approved" ? "Withdrawal approved & balance deducted." : "Withdrawal rejected.");
      router.refresh();
    }
  };

  // ── Filtered Data ──────────────────────────────────────────────────────────
  const filteredSales = statusFilter
    ? recentSales.filter((s) => s.status === statusFilter)
    : recentSales;

  const filteredWithdrawals = statusFilter
    ? recentWithdrawals.filter((w) => w.status === statusFilter)
    : recentWithdrawals;

  const filteredCommissions = statusFilter
    ? recentCommissions.filter((c) => c.status === statusFilter)
    : recentCommissions;

  // ── Table row action button ─────────────────────────────────────────────────
  const ActionButtons = ({
    id,
    type,
    status,
  }: {
    id: string;
    type: "sale" | "withdrawal";
    status: string;
  }) => {
    const isPending = status === "pending" || status === "pending_approval";
    if (!isPending) return <StatusBadge status={status} />;

    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={() =>
            type === "sale"
              ? handleSaleAction(id, "approved")
              : handleWithdrawalAction(id, "approved")
          }
          disabled={actionLoading === id}
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 text-[11px] font-bold text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
        >
          {actionLoading === id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Approve
        </button>
        <button
          onClick={() =>
            type === "sale"
              ? handleSaleAction(id, "rejected")
              : handleWithdrawalAction(id, "rejected")
          }
          disabled={actionLoading === id}
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 text-[11px] font-bold text-rose-500 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50"
        >
          <X className="h-3 w-3" /> Reject
        </button>
      </div>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 relative">

      {/* ── Header Bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
            Platform Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time operations center · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Global Search */}
          <div ref={searchRef} className="relative">
            <button
              onClick={() => setSearchOpen((o) => !o)}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 text-xs font-semibold text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search platform...</span>
              <kbd className="hidden sm:inline-flex items-center rounded border border-border/50 px-1 text-[10px] font-mono text-muted-foreground">⌘K</kbd>
            </button>
            <AnimatePresence>
              {searchOpen && <GlobalSearchPanel onClose={() => setSearchOpen(false)} />}
            </AnimatePresence>
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          </button>

          {/* Notification Bell */}
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all"
          >
            <Bell className="h-3.5 w-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          title="Total Agents"
          value={stats.totalAgents.toLocaleString("en-US")}
          icon={<Users className="h-4 w-4" />}
          color="bg-blue-500"
          subtitle="Registered agents"
        />
        <KpiCard
          title="Properties"
          value={stats.totalProperties.toLocaleString("en-US")}
          icon={<Building2 className="h-4 w-4" />}
          color="bg-violet-500"
          subtitle="Active listings"
        />
        <KpiCard
          title="Approved Sales"
          value={stats.totalSales.toLocaleString("en-US")}
          icon={<TrendingUp className="h-4 w-4" />}
          color="bg-emerald-500"
          subtitle="Completed transactions"
          pulse
        />
        <KpiCard
          title="Commissions"
          value={`$${(stats.totalCommissions / 1000).toFixed(1)}k`}
          icon={<Coins className="h-4 w-4" />}
          color="bg-amber-500"
          subtitle="Distributed to network"
        />
        <KpiCard
          title="Withdrawals"
          value={`$${(stats.totalWithdrawals / 1000).toFixed(1)}k`}
          icon={<ArrowUpRight className="h-4 w-4" />}
          color="bg-rose-500"
          subtitle="Paid out to agents"
        />
        <KpiCard
          title="Total Revenue"
          value={`$${(stats.totalRevenue / 1000).toFixed(1)}k`}
          icon={<DollarSign className="h-4 w-4" />}
          color="bg-primary"
          subtitle="Platform volume"
        />
      </div>

      {/* ── Charts Row 1 ───────────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <ChartPanel
          title="Monthly Sales Trends"
          subtitle="Volume & count · last 12 months"
          className="lg:col-span-2"
        >
          <MonthlyTrendsChart data={monthlySales} />
        </ChartPanel>
        <ChartPanel title="Commission Breakdown" subtitle="By status distribution">
          <CommissionDistChart data={commissionDist} />
        </ChartPanel>
      </div>

      {/* ── Charts Row 2 ───────────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <ChartPanel title="Promotion Distribution" subtitle="Agents per level">
          <PromotionDistChart data={promotionDist} />
        </ChartPanel>
        <ChartPanel title="Agent Growth" subtitle="Cumulative recruitment trend">
          <AgentGrowthChart data={agentGrowth} />
        </ChartPanel>
        <ChartPanel title="Visit Trends" subtitle="Physical vs virtual · 12 months">
          <VisitTrendsChart data={visitTrends} />
        </ChartPanel>
      </div>

      {/* ── Recent Tables Section ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/40 glass-premium overflow-hidden">
        {/* Tab Bar + Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-border/40">
          <div className="flex items-center gap-1 rounded-xl bg-muted/20 p-1 border border-border/30">
            {(["sales", "withdrawals", "commissions"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setStatusFilter(""); }}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all",
                  activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <div className="relative flex items-center">
              <Filter className="absolute left-2.5 h-3 w-3 text-muted-foreground pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-7 pr-3 py-1.5 rounded-xl border border-border/40 bg-muted/20 text-xs font-semibold text-foreground outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
              >
                <option value="">All Status</option>
                {activeTab === "sales" && (
                  <>
                    <option value="pending_approval">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </>
                )}
                {activeTab === "withdrawals" && (
                  <>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </>
                )}
                {activeTab === "commissions" && (
                  <>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                    <option value="rejected">Rejected</option>
                  </>
                )}
              </select>
            </div>

            {/* Export CSV */}
            <button
              onClick={() => {
                if (activeTab === "sales") {
                  exportCSV(filteredSales, "sales", ["Agent", "Email", "Property", "Buyer", "Amount", "Status", "Date"],
                    ["profiles.name", "profiles.email", "properties.title", "buyer_name", "sale_amount", "status", "created_at"]);
                } else if (activeTab === "withdrawals") {
                  exportCSV(filteredWithdrawals, "withdrawals", ["Agent", "Email", "Amount", "Status", "Date"],
                    ["profiles.name", "profiles.email", "amount", "status", "created_at"]);
                } else {
                  exportCSV(filteredCommissions, "commissions", ["Recipient", "Email", "Amount", "Level", "Status"],
                    ["profiles.name", "profiles.email", "amount", "level", "status"]);
                }
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/40 bg-muted/20 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
            >
              <Download className="h-3 w-3" />
              Export
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {/* SALES TABLE */}
          {activeTab === "sales" && (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  {["Agent", "Property", "Buyer", "Amount", "Date", "Status / Action"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredSales.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-xs text-muted-foreground">No sales found.</td></tr>
                ) : filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground text-xs">{s.profiles?.name ?? "—"}</span>
                        <span className="text-[10px] text-muted-foreground">{s.profiles?.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-foreground/80">{s.properties?.title ?? "—"}</td>
                    <td className="px-5 py-3.5 text-xs text-foreground/80">{s.buyer_name}</td>
                    <td className="px-5 py-3.5 text-xs font-bold text-foreground">${Number(s.sale_amount).toLocaleString("en-US")}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      <ActionButtons id={s.id} type="sale" status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* WITHDRAWALS TABLE */}
          {activeTab === "withdrawals" && (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  {["Agent", "Email", "Amount", "Date", "Status / Action"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredWithdrawals.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-xs text-muted-foreground">No withdrawals found.</td></tr>
                ) : filteredWithdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-3.5 text-xs font-semibold text-foreground">{w.profiles?.name ?? "—"}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{w.profiles?.email}</td>
                    <td className="px-5 py-3.5 text-xs font-bold text-foreground">${Number(w.amount).toLocaleString("en-US")}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      <ActionButtons id={w.id} type="withdrawal" status={w.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* COMMISSIONS TABLE */}
          {activeTab === "commissions" && (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  {["Recipient", "Property", "Level", "Amount", "Status"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredCommissions.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-xs text-muted-foreground">No commissions found.</td></tr>
                ) : filteredCommissions.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground text-xs">{c.profiles?.name ?? "—"}</span>
                        <span className="text-[10px] text-muted-foreground">{c.profiles?.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-foreground/80">{c.sales?.properties?.title ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-violet-500/20 bg-violet-500/10 text-[11px] font-bold text-violet-400">
                        L{c.level}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-bold text-foreground">${Number(c.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Activity Log Strip ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/40 glass-premium p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <a href="/admin/activity" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            View all <ChevronRight className="h-3 w-3" />
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6">
          {activityLogs.slice(0, 9).map((log) => (
            <ActivityItem key={log.id} log={log} />
          ))}
          {activityLogs.length === 0 && (
            <p className="text-xs text-muted-foreground col-span-3 py-4 text-center">No activity logged yet. Activity appears here after the SQL migration is run.</p>
          )}
        </div>
      </div>

      {/* ── Notification Panel ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {notifOpen && (
          <NotificationPanel logs={activityLogs} onClose={() => setNotifOpen(false)} />
        )}
      </AnimatePresence>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-4 rounded-2xl border font-semibold text-sm shadow-2xl",
              toast.ok
                ? "bg-zinc-900 border-border/50 text-white"
                : "bg-rose-950 border-rose-800/50 text-rose-200"
            )}
          >
            {toast.ok
              ? <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
              : <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />}
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

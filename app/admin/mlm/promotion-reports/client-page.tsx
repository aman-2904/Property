"use client";

import * as React from "react";
import { DataTable } from "@/components/tables/data-table";
import { SearchFilter } from "@/components/tables/search-filter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts";
import {
  Users,
  TrendingUp,
  Download,
  Award,
  Wallet,
  Clock,
  CheckCircle,
  HelpCircle,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PromotionLevel {
  level: number;
  title: string;
  required_direct_sales: number;
  required_group_sales: number;
  personal_sale_incentive: number;
}

interface ReportAgent {
  agentId: string;
  name: string;
  email: string;
  currentPromotion: string;
  currentIncentive: number;
  walletBalance: number;
  pendingIncome: number;
  paidIncome: number;
  lifetimeIncome: number;
}

interface DistributionItem {
  level: string;
  count: number;
}

interface ClientProps {
  initialLevels: PromotionLevel[];
  initialReports: ReportAgent[];
  initialDistribution: DistributionItem[];
}

export function AdminPromotionReportsClient({
  initialLevels,
  initialReports,
  initialDistribution
}: ClientProps) {
  const [activeTab, setActiveTab] = React.useState<"overview" | "income" | "near">("overview");
  const [levels] = React.useState(initialLevels);
  const [reports] = React.useState(initialReports);
  const [distribution, setDistribution] = React.useState(initialDistribution);
  
  // Filters
  const [search, setSearch] = React.useState("");
  const [promoFilter, setPromoFilter] = React.useState("all");

  // Re-calculate distribution if reports change
  React.useEffect(() => {
    if (initialDistribution && initialDistribution.length > 0) {
      setDistribution(initialDistribution);
    }
  }, [initialDistribution]);

  // Income Report filters
  const filteredReports = reports.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase());
    const matchesPromo = promoFilter === "all" ? true : item.currentPromotion === promoFilter;
    return matchesSearch && matchesPromo;
  });

  // Calculate high-level summary statistics
  const totalAgents = reports.length;
  const totalLifetimeIncome = reports.reduce((sum, r) => sum + r.lifetimeIncome, 0);
  const totalWalletBalance = reports.reduce((sum, r) => sum + r.walletBalance, 0);
  const totalPendingIncome = reports.reduce((sum, r) => sum + r.pendingIncome, 0);
  const totalPaidIncome = reports.reduce((sum, r) => sum + r.paidIncome, 0);

  // Recharts colors
  const COLORS = ["#8b5cf6", "#a78bfa", "#ec4899", "#f43f5e", "#10b981", "#3b82f6", "#f59e0b"];

  // Export to CSV Function
  const handleExportCSV = () => {
    const headers = ["Agent Name", "Email", "Current Promotion", "Per Sale Incentive (INR)", "Wallet Balance (INR)", "Pending Income (INR)", "Paid Income (INR)", "Lifetime Income (INR)"];
    const csvRows = [
      headers.join(","),
      ...filteredReports.map((r) => [
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.email.replace(/"/g, '""')}"`,
        `"${r.currentPromotion.replace(/"/g, '""')}"`,
        r.currentIncentive,
        r.walletBalance,
        r.pendingIncome,
        r.paidIncome,
        r.lifetimeIncome
      ].join(","))
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `promotion_income_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mock Print/PDF function
  const handlePrintPDF = () => {
    window.print();
  };

  // Main reports table columns
  const reportColumns = [
    {
      header: "Agent",
      accessorKey: "name",
      render: (row: ReportAgent) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{row.name}</span>
          <span className="text-[10px] text-muted-foreground">{row.email}</span>
        </div>
      )
    },
    {
      header: "Current Promotion",
      accessorKey: "currentPromotion",
      render: (row: ReportAgent) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 border border-violet-500/25 text-violet-400">
          <Award className="h-3 w-3" />
          {row.currentPromotion}
        </span>
      )
    },
    {
      header: "Incentive Per Sale",
      accessorKey: "currentIncentive",
      render: (row: ReportAgent) => (
        <span className="font-semibold text-foreground">
          ₹{row.currentIncentive.toLocaleString("en-IN")}
        </span>
      )
    },
    {
      header: "Wallet Balance",
      accessorKey: "walletBalance",
      render: (row: ReportAgent) => (
        <span className="font-bold text-emerald-500">
          ₹{row.walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: "Pending Income",
      accessorKey: "pendingIncome",
      render: (row: ReportAgent) => (
        <span className="font-semibold text-amber-500">
          ₹{row.pendingIncome.toLocaleString("en-IN")}
        </span>
      )
    },
    {
      header: "Paid Income",
      accessorKey: "paidIncome",
      render: (row: ReportAgent) => (
        <span className="font-semibold text-blue-500">
          ₹{row.paidIncome.toLocaleString("en-IN")}
        </span>
      )
    },
    {
      header: "Lifetime Income",
      accessorKey: "lifetimeIncome",
      render: (row: ReportAgent) => (
        <span className="font-extrabold text-foreground">
          ₹{row.lifetimeIncome.toLocaleString("en-IN")}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Navigation tabs */}
      <div className="flex border-b border-border/40 pb-px">
        {(["overview", "income"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-3 text-sm font-bold border-b-2 transition-all capitalize -mb-px",
              activeTab === tab
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "overview" ? "Overview & Distribution" : "Promotion Income Reports"}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Metrics summary widgets */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative overflow-hidden rounded-2xl border border-border/40 p-5 bg-card flex flex-col justify-between shadow-lg">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Promotion Income</span>
                <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h2 className="text-2xl font-extrabold text-foreground">₹{totalLifetimeIncome.toLocaleString("en-IN")}</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Aggregate system payout</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/40 p-5 bg-card flex flex-col justify-between shadow-lg">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wallet Balance</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h2 className="text-2xl font-extrabold text-foreground">₹{totalWalletBalance.toLocaleString("en-IN")}</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Withdrawable agent funds</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/40 p-5 bg-card flex flex-col justify-between shadow-lg">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Income</span>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h2 className="text-2xl font-extrabold text-foreground">₹{totalPendingIncome.toLocaleString("en-IN")}</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Review queue volume</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/40 p-5 bg-card flex flex-col justify-between shadow-lg">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paid Income</span>
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h2 className="text-2xl font-extrabold text-foreground">₹{totalPaidIncome.toLocaleString("en-IN")}</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Released funds sum</p>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Rank distribution chart */}
            <div className="lg:col-span-2 p-6 rounded-2xl border border-border/40 bg-card shadow-lg flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-foreground">Promotion Levels Distribution</h3>
                <p className="text-xs text-muted-foreground">Number of active agents per rank title</p>
              </div>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution}>
                    <XAxis dataKey="level" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ backgroundColor: "#1e1b4b", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px" }} labelClassName="text-white font-bold" />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ratio list */}
            <div className="p-6 rounded-2xl border border-border/40 bg-card shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Distribution Statistics</h3>
                <p className="text-xs text-muted-foreground">Ratio of agents at each rank level</p>
              </div>
              <div className="space-y-4 my-6">
                {distribution.map((item, idx) => {
                  const percent = totalAgents > 0 ? Math.round((item.count / totalAgents) * 100) : 0;
                  return (
                    <div key={item.level} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">{item.level}</span>
                        <span className="text-foreground">{item.count} agents ({percent}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: COLORS[idx % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-center text-[10px] text-muted-foreground font-semibold">
                Updated in real time based on active seller profiles.
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "income" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Filters & Export Panel */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-border/40 bg-card text-foreground shadow-lg">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:max-w-xl">
              <div className="flex-1">
                <SearchFilter
                  searchPlaceholder="Search agent name/email..."
                  searchValue={search}
                  onSearchChange={setSearch}
                />
              </div>
              <select
                value={promoFilter}
                onChange={(e) => setPromoFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border border-border/60 bg-card text-sm text-foreground focus:outline-none focus:border-primary"
              >
                <option value="all">All Promotions</option>
                {levels.map(l => (
                  <option key={l.level} value={l.title}>{l.title}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border/60 bg-transparent px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-all"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                onClick={handlePrintPDF}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/95 transition-all shadow-sm"
              >
                <FileText className="h-4 w-4" />
                Print Statement
              </button>
            </div>
          </div>

          {/* Main Table */}
          <div className="rounded-2xl border border-border/40 bg-card shadow-lg overflow-hidden">
            <DataTable
              columns={reportColumns}
              data={filteredReports}
              emptyTitle="No income reports match criteria"
              emptyDescription="Change search queries or level filters and try again."
            />
          </div>
        </div>
      )}
    </div>
  );
}

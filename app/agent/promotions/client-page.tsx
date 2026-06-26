"use client";

import * as React from "react";
import { DataTable } from "@/components/tables/data-table";
import { SearchFilter } from "@/components/tables/search-filter";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAgentPromotionWallet } from "@/lib/actions/promotions";
import {
  Trophy,
  Calendar,
  DollarSign,
  Award,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Calculator,
  Bell,
  Download,
  Printer,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientProps {
  userId: string;
  statusData: any;
  initialWalletData: any;
}

export function AgentPromotionsClient({ userId, statusData, initialWalletData }: ClientProps) {
  const [walletData, setWalletData] = React.useState(initialWalletData);
  const [dateFilter, setDateFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  
  // Custom Date state
  const [isCustomDate, setIsCustomDate] = React.useState(false);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  // Calculator states
  const [calcSales, setCalcSales] = React.useState<number>(12);

  // Fetch updated wallet logs when filters change
  React.useEffect(() => {
    async function updateData() {
      // If dateFilter is "custom" we handle filtering in JS, otherwise load from DB action
      const filterArg = dateFilter === "custom" ? "all" : dateFilter;
      const data = await getAgentPromotionWallet(userId, {
        dateRange: filterArg,
        search: searchQuery || undefined
      });
      setWalletData(data);
    }
    updateData();
  }, [userId, dateFilter, searchQuery]);

  const { currentLevel, nextLevel, progress, wallet } = statusData;
  const { transactions, promHistory, notifications } = walletData;

  // Custom date JS filtering
  const filteredTransactions = React.useMemo(() => {
    if (dateFilter !== "custom" || !startDate || !endDate) return transactions;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return transactions.filter((t: any) => {
      const time = new Date(t.created_at).getTime();
      return time >= start && time <= end;
    });
  }, [transactions, dateFilter, startDate, endDate]);

  // Compute stats based on loaded wallet metrics
  const today = new Date();
  const startOfToday = new Date(today.setHours(0,0,0,0)).getTime();
  
  const startOfWeek = new Date();
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0,0,0,0);
  const timeOfWeek = startOfWeek.getTime();

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const startOfYear = new Date(today.getFullYear(), 0, 1).getTime();

  // Aggregate stats from transactions log to display summary
  const approvedTxns = transactions.filter((t: any) => t.status === "approved" || t.status === "paid");
  
  const todayIncome = approvedTxns
    .filter((t: any) => new Date(t.created_at).getTime() >= startOfToday)
    .reduce((sum: number, t: any) => sum + t.earned_amount, 0);

  const weekIncome = approvedTxns
    .filter((t: any) => new Date(t.created_at).getTime() >= timeOfWeek)
    .reduce((sum: number, t: any) => sum + t.earned_amount, 0);

  const monthIncome = approvedTxns
    .filter((t: any) => new Date(t.created_at).getTime() >= startOfMonth)
    .reduce((sum: number, t: any) => sum + t.earned_amount, 0);

  const yearIncome = approvedTxns
    .filter((t: any) => new Date(t.created_at).getTime() >= startOfYear)
    .reduce((sum: number, t: any) => sum + t.earned_amount, 0);

  // Dynamic estimated income calculation
  const estimatedIncome = calcSales * currentLevel.personal_sale_incentive;

  // CSV Export trigger
  const handleExportCSV = () => {
    const headers = ["Date", "Customer Name", "Property Name", "Booking Amount", "Promotion", "Per Sale Incentive", "Earned Amount", "Status", "Transaction ID"];
    const csvRows = [
      headers.join(","),
      ...filteredTransactions.map((t: any) => [
        new Date(t.created_at).toISOString().slice(0, 10),
        `"${t.customer_name?.replace(/"/g, '""') || ""}"`,
        `"${t.property_title?.replace(/"/g, '""') || ""}"`,
        t.booking_amount,
        `"${t.promotion_title}"`,
        t.per_sale_incentive,
        t.earned_amount,
        t.status,
        t.id
      ].join(","))
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `promotion_income_statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // Transaction columns
  const txnColumns = [
    {
      header: "Date",
      accessorKey: "created_at",
      render: (row: any) => (
        <span suppressHydrationWarning className="text-xs text-muted-foreground">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      header: "Customer Name",
      accessorKey: "customer_name",
      render: (row: any) => <span className="font-semibold text-foreground">{row.customer_name || "N/A"}</span>
    },
    {
      header: "Property Name",
      accessorKey: "property_title",
      render: (row: any) => <span className="text-xs text-muted-foreground">{row.property_title || "N/A"}</span>
    },
    {
      header: "Booking Amount",
      accessorKey: "booking_amount",
      render: (row: any) => <span className="text-xs">₹{row.booking_amount.toLocaleString("en-IN")}</span>
    },
    {
      header: "Promotion",
      accessorKey: "promotion_title",
      render: (row: any) => (
        <span className="inline-flex px-2 py-0.5 rounded text-[10px] bg-violet-500/10 text-violet-400 font-bold">
          {row.promotion_title}
        </span>
      )
    },
    {
      header: "Per Sale Incentive",
      accessorKey: "per_sale_incentive",
      render: (row: any) => <span className="text-xs">₹{row.per_sale_incentive.toLocaleString("en-IN")}</span>
    },
    {
      header: "Earned Amount",
      accessorKey: "earned_amount",
      render: (row: any) => <span className="font-bold text-emerald-500">₹{row.earned_amount.toLocaleString("en-IN")}</span>
    },
    {
      header: "Payment Status",
      accessorKey: "status",
      render: (row: any) => {
        let label = "Pending";
        if (row.status === "approved") label = "Approved (Credited)";
        else if (row.status === "paid") label = "Paid";
        else if (row.status === "rejected") label = "Rejected";

        return (
          <StatusBadge 
            status={
              row.status === "approved" ? "approved" : 
              row.status === "paid" ? "approved" : 
              row.status === "rejected" ? "rejected" : "pending"
            } 
            label={label} 
          />
        );
      }
    },
    {
      header: "Transaction ID",
      accessorKey: "id",
      render: (row: any) => <span className="font-mono text-[9px] text-muted-foreground uppercase">{row.id.slice(0, 8)}...</span>
    }
  ];

  // Promotion history columns
  const promColumns = [
    {
      header: "Promotion Level",
      accessorKey: "new_lvl.title",
      render: (row: any) => (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 border border-primary/25 text-primary">
          🏆 {row.new_lvl?.title || "Agent"}
        </span>
      )
    },
    {
      header: "Promotion Date",
      accessorKey: "created_at",
      render: (row: any) => (
        <span suppressHydrationWarning className="text-xs text-muted-foreground">
          {new Date(row.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </span>
      )
    },
    {
      header: "Direct Sales Counts",
      accessorKey: "direct_sales",
      render: (row: any) => <span className="text-xs text-foreground font-semibold">{row.direct_sales} Direct Sales</span>
    },
    {
      header: "Group Sales Counts",
      accessorKey: "group_sales",
      render: (row: any) => <span className="text-xs text-foreground font-semibold">{row.group_sales} Group Sales</span>
    },
    {
      header: "Qualified Members",
      accessorKey: "qualified_members",
      render: (row: any) => {
        let members: any[] = [];
        try {
          members = typeof row.qualified_members === "string" ? JSON.parse(row.qualified_members) : (row.qualified_members || []);
        } catch (e) {
          members = [];
        }

        if (!members || members.length === 0) {
          return <span className="text-xs text-muted-foreground">None</span>;
        }

        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {members.map((m: any, idx: number) => (
              <span key={m.id || idx} className="px-2 py-0.5 rounded text-[10px] bg-muted text-foreground border border-border/40" title={m.name}>
                {m.name}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      header: "Reason",
      accessorKey: "trigger_reason",
      render: (row: any) => <span className="text-xs text-muted-foreground font-medium italic">{row.trigger_reason}</span>
    }
  ];

  return (
    <div className="space-y-8 print:p-0">
      
      {/* Grid containing Section 1 (Current Promotion Card) and Section 2 (Promotion Progress) */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Section 1: Current Promotion Card */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40 p-6 bg-card text-foreground shadow-lg flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300">
          <div className="absolute top-[10%] right-[10%] w-[120px] h-[120px] rounded-full bg-violet-600/10 blur-xl pointer-events-none" />
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest block">Agent Rank</span>
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
                  {currentLevel.title}
                </span>
              </div>
            </div>

            <div className="h-px bg-border/40 w-full" />

            <div className="grid grid-cols-2 gap-y-3 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Promotion Date</span>
                <span suppressHydrationWarning className="font-bold text-foreground">
                  {new Date(currentLevel.promotionDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Incentive Per Sale</span>
                <span className="font-bold text-emerald-500">
                  ₹{Number(currentLevel.personal_sale_incentive).toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Current Status</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Promotion Progress */}
        <div className="md:col-span-2 p-6 rounded-3xl border border-border/40 bg-card text-foreground shadow-lg flex flex-col justify-between">
          <div className="space-y-4 w-full">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Promotion Progress</h3>
                <p className="text-xs text-muted-foreground">Milestones toward rank upgrade</p>
              </div>
              {nextLevel ? (
                <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  <span>{currentLevel.title}</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="font-bold">{nextLevel.title}</span>
                </div>
              ) : (
                <span className="text-xs text-emerald-500 font-bold">✨ Max Rank Achieved!</span>
              )}
            </div>

            {nextLevel ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Progress Direct Sales */}
                <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/30 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Direct Sales</span>
                    <span className="text-foreground">{progress.directSales.current} / {progress.directSales.required}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/65 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-300"
                      style={{ width: `${progress.directSales.percent}%` }}
                    />
                  </div>
                </div>

                {/* Progress Group Sales */}
                <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/30 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Group Sales</span>
                    <span className="text-foreground">{progress.groupSales.current} / {progress.groupSales.required}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/65 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-300"
                      style={{ width: `${progress.groupSales.percent}%` }}
                    />
                  </div>
                </div>

                {/* Progress Qualification */}
                {progress.qualification.required > 0 && (
                  <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/30 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Qualified Downline ({progress.qualification.prevRankTitle})</span>
                      <span className="text-foreground">{progress.qualification.current} / {progress.qualification.required}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/65 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-300"
                        style={{ width: `${progress.qualification.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Progress Different Legs */}
                {nextLevel.different_legs_required && progress.differentLegs.required > 0 && (
                  <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/30 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Different Legs Check</span>
                      <span className="text-foreground">{progress.differentLegs.current} / {progress.differentLegs.required}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/65 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-300"
                        style={{ width: `${progress.differentLegs.percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 text-center text-xs text-muted-foreground italic rounded-2xl bg-muted/20 border border-border/20">
                You have reached the highest career promotion rank. Keep up the amazing work!
              </div>
            )}

            {/* Remaining Requirements checklist */}
            {nextLevel && progress.remainingRequirements.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs border-t border-border/40 pt-3">
                <span className="font-bold text-rose-500">Remaining Requirements:</span>
                <div className="flex flex-wrap gap-2">
                  {progress.remainingRequirements.map((req: string, idx: number) => (
                    <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-semibold">
                      ⚠️ {req}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Promotion Income Summary */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">Promotion Income Summary</h3>
        <div className="grid gap-5 grid-cols-2 md:grid-cols-4">
          <div className="p-4 rounded-2xl border border-border/40 bg-card text-foreground shadow shadow-indigo-500/5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Today's Income</span>
            <h4 className="text-xl font-bold mt-1 text-foreground">₹{todayIncome.toLocaleString("en-IN")}</h4>
          </div>
          <div className="p-4 rounded-2xl border border-border/40 bg-card text-foreground shadow shadow-indigo-500/5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">This Week</span>
            <h4 className="text-xl font-bold mt-1 text-foreground">₹{weekIncome.toLocaleString("en-IN")}</h4>
          </div>
          <div className="p-4 rounded-2xl border border-border/40 bg-card text-foreground shadow shadow-indigo-500/5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">This Month</span>
            <h4 className="text-xl font-bold mt-1 text-foreground">₹{monthIncome.toLocaleString("en-IN")}</h4>
          </div>
          <div className="p-4 rounded-2xl border border-border/40 bg-card text-foreground shadow shadow-indigo-500/5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">This Year</span>
            <h4 className="text-xl font-bold mt-1 text-foreground">₹{yearIncome.toLocaleString("en-IN")}</h4>
          </div>
          <div className="p-4 rounded-2xl border border-border/40 bg-card text-foreground shadow shadow-indigo-500/5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Lifetime Income</span>
            <h4 className="text-xl font-bold mt-1 text-foreground">₹{wallet.lifetime_income.toLocaleString("en-IN")}</h4>
          </div>
          <div className="p-4 rounded-2xl border border-border/40 bg-card text-foreground shadow shadow-indigo-500/5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Pending Income</span>
            <h4 className="text-xl font-bold mt-1 text-amber-500">₹{wallet.pending_income.toLocaleString("en-IN")}</h4>
          </div>
          <div className="p-4 rounded-2xl border border-border/40 bg-card text-foreground shadow shadow-indigo-500/5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Paid Income</span>
            <h4 className="text-xl font-bold mt-1 text-blue-500">₹{wallet.paid_income.toLocaleString("en-IN")}</h4>
          </div>
          <div className="p-4 rounded-2xl border border-border/40 bg-card text-foreground shadow shadow-indigo-500/5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Wallet Balance</span>
            <h4 className="text-xl font-bold mt-1 text-emerald-500">₹{wallet.balance.toLocaleString("en-IN")}</h4>
          </div>
        </div>
      </div>

      {/* Grid containing Section 6 (Income Calculator) and Section 7 (Recent Notifications) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Section 6: Income Calculator */}
        <div className="p-6 rounded-3xl border border-border/40 bg-card text-foreground shadow-lg flex flex-col justify-between">
          <div className="space-y-4 w-full">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Calculator className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Incentive Estimator Calculator</h3>
            </div>
            
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-2xl bg-muted/20 border border-border/30">
                  <span className="text-muted-foreground block mb-0.5">Current Incentive</span>
                  <span className="font-extrabold text-foreground text-sm">₹{Number(currentLevel.personal_sale_incentive).toLocaleString("en-IN")} Per Sale</span>
                </div>
                <div className="p-3 rounded-2xl bg-muted/20 border border-border/30">
                  <span className="text-muted-foreground block mb-0.5">Estimated Income</span>
                  <span className="font-extrabold text-emerald-500 text-sm">₹{estimatedIncome.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="sales-month" className="font-semibold text-muted-foreground">Sales count simulation</label>
                  <span className="font-bold text-primary">{calcSales} Sales</span>
                </div>
                <input
                  id="sales-month"
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={calcSales}
                  onChange={(e) => setCalcSales(parseInt(e.target.value) || 0)}
                  className="w-full h-1.5 bg-muted/65 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 7: Recent Notifications */}
        <div className="p-6 rounded-3xl border border-border/40 bg-card text-foreground shadow-lg flex flex-col justify-between">
          <div className="space-y-4 w-full">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                <Bell className="h-5 w-5 animate-swing" />
              </div>
              <h3 className="text-base font-bold text-foreground">Recent Activity & Notifications</h3>
            </div>
            
            <div className="space-y-2 mt-2 max-h-[140px] overflow-y-auto pr-1">
              {notifications && notifications.length > 0 ? (
                notifications.map((notif: any) => {
                  let notifText = notif.message;
                  try {
                    const parsed = JSON.parse(notif.message);
                    notifText = parsed.text || notif.message;
                  } catch (e) {}

                  return (
                    <div key={notif.id} className="p-2.5 rounded-xl bg-muted/20 border border-border/30 text-xs flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-foreground block">{notif.title}</span>
                        <span className="text-muted-foreground">{notifText}</span>
                      </div>
                      <span suppressHydrationWarning className="text-[9px] text-muted-foreground/60 shrink-0 font-medium">
                        {new Date(notif.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-xs text-muted-foreground italic py-6">
                  No notifications recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Promotion Income History (Searchable Table) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">Promotion Income Ledger</h3>
            <p className="text-xs text-muted-foreground">Search and audit your promotion wallet transaction history</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex border border-border/60 rounded-xl overflow-hidden text-xs">
              <button
                onClick={() => { setDateFilter("all"); setIsCustomDate(false); }}
                className={cn("px-3 py-1.5 border-r border-border/40 font-semibold transition-all", dateFilter === "all" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-muted-foreground")}
              >
                All
              </button>
              <button
                onClick={() => { setDateFilter("today"); setIsCustomDate(false); }}
                className={cn("px-3 py-1.5 border-r border-border/40 font-semibold transition-all", dateFilter === "today" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-muted-foreground")}
              >
                Today
              </button>
              <button
                onClick={() => { setDateFilter("week"); setIsCustomDate(false); }}
                className={cn("px-3 py-1.5 border-r border-border/40 font-semibold transition-all", dateFilter === "week" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-muted-foreground")}
              >
                This Week
              </button>
              <button
                onClick={() => { setDateFilter("month"); setIsCustomDate(false); }}
                className={cn("px-3 py-1.5 border-r border-border/40 font-semibold transition-all", dateFilter === "month" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-muted-foreground")}
              >
                This Month
              </button>
              <button
                onClick={() => { setDateFilter("custom"); setIsCustomDate(true); }}
                className={cn("px-3 py-1.5 font-semibold transition-all", dateFilter === "custom" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-muted-foreground")}
              >
                Custom Date
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border/60 bg-transparent px-3 text-xs font-semibold text-foreground hover:bg-muted transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                Excel
              </button>
              <button
                onClick={handlePrintPDF}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border/60 bg-transparent px-3 text-xs font-semibold text-foreground hover:bg-muted transition-all"
              >
                <Printer className="h-3.5 w-3.5" />
                Print PDF
              </button>
            </div>
          </div>
        </div>

        {/* Custom date pickers */}
        {isCustomDate && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border/40 bg-card text-xs w-fit animate-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-muted-foreground">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 rounded bg-muted/40 border border-border/60 text-foreground text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-muted-foreground">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 rounded bg-muted/40 border border-border/60 text-foreground text-xs"
              />
            </div>
          </div>
        )}

        {/* Search filter input */}
        <div className="w-full md:max-w-md">
          <SearchFilter
            searchPlaceholder="Search by customer, property, transaction id..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Main Table */}
        <div className="rounded-2xl border border-border/40 bg-card shadow shadow-indigo-500/5 overflow-hidden">
          <DataTable
            columns={txnColumns}
            data={filteredTransactions}
            emptyTitle="No wallet history found"
            emptyDescription="Promotion income logs will appear once sales are approved."
          />
        </div>
      </div>

      {/* Section 5: Promotion history logs */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Promotion Upgrade Log</h3>
          <p className="text-xs text-muted-foreground">History of all rank upgrades received on the platform</p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card shadow shadow-indigo-500/5 overflow-hidden">
          <DataTable
            columns={promColumns}
            data={promHistory}
            emptyTitle="No promotions received yet"
            emptyDescription="Keep submitting property sales to earn rank upgrades!"
          />
        </div>
      </div>

    </div>
  );
}

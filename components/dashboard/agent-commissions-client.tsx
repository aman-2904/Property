"use client";

import * as React from "react";
import { DataTable } from "@/components/tables/data-table";
import { SearchFilter } from "@/components/tables/search-filter";
import { StatusBadge } from "@/components/ui/status-badge";
import { Coins, CheckCircle, Clock, BarChart3, TrendingUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Commission {
  id: string;
  level: number;
  percent: number;
  amount: number;
  status: string;
  created_at: string;
  sales: {
    sale_amount: number;
    booking_amount: number;
    properties: {
      title: string;
    } | null;
  } | null;
}

interface AgentCommissionsClientProps {
  initialCommissions: Commission[];
}

function KpiCard({
  title,
  value,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 p-5 glass-premium flex flex-col justify-between hover:scale-[1.015] hover:border-primary/25 transition-all duration-300 shadow-xl group">
      <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20", color)} />
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border border-border/40 text-foreground/70 transition-colors group-hover:text-foreground", color, "bg-opacity-10")}>
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{value}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

export function AgentCommissionsClient({ initialCommissions }: AgentCommissionsClientProps) {
  const [commissions] = React.useState(initialCommissions);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("");

  const filteredCommissions = commissions.filter((comm) => {
    const matchesSearch =
      (comm.sales?.properties?.title || "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "" ? true : comm.status === filter;
    return matchesSearch && matchesFilter;
  });

  // Calculate statistics
  const totalEarned = commissions
    .filter((c) => c.status === "approved" || c.status === "paid")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const pendingVolume = commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const directEarned = commissions
    .filter((c) => c.level === 0 && (c.status === "approved" || c.status === "paid"))
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const networkEarned = commissions
    .filter((c) => c.level > 0 && (c.status === "approved" || c.status === "paid"))
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const columns = [
    {
      header: "Property / Transaction Info",
      accessorKey: "sales.properties.title",
      render: (row: Commission) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground text-xs">
            {row.sales?.properties?.title || "Unknown Property"}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            {row.sales?.booking_amount && (
              <span className="text-[10px] text-muted-foreground">
                Booking: ${Number(row.sales.booking_amount).toLocaleString("en-US")}
              </span>
            )}
            {row.sales?.sale_amount && (
              <span className="text-[9px] text-muted-foreground/60">
                Sale: ${Number(row.sales.sale_amount).toLocaleString("en-US")}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "MLM Level",
      accessorKey: "level",
      render: (row: Commission) => (
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-bold",
          row.level === 0
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            : "border-violet-500/20 bg-violet-500/10 text-violet-400"
        )}>
          {row.level === 0 ? "Direct Seller" : `Level ${row.level}`}
        </span>
      ),
    },
    {
      header: "Commission Rate",
      accessorKey: "percent",
      render: (row: Commission) => (
        <span className="text-foreground/80 font-semibold text-xs">{row.percent}%</span>
      ),
    },
    {
      header: "Commission Amount",
      accessorKey: "amount",
      render: (row: Commission) => (
        <span className="font-bold text-foreground text-sm">
          ${Number(row.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      render: (row: Commission) => <StatusBadge status={row.status} />,
    },
    {
      header: "Date",
      accessorKey: "created_at",
      render: (row: Commission) => (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(row.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          My Commissions Ledger
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track and review all direct sales commissions and upline network override payouts.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Earned"
          value={`$${totalEarned.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<Coins className="h-5 w-5 text-emerald-500" />}
          color="bg-emerald-500"
          subtitle="Approved or paid balances"
        />
        <KpiCard
          title="Pending Audits"
          value={`$${pendingVolume.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          color="bg-amber-500"
          subtitle="Commissions awaiting review"
        />
        <KpiCard
          title="Direct Sales Earnings"
          value={`$${directEarned.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
          color="bg-blue-500"
          subtitle="From your own direct sales"
        />
        <KpiCard
          title="MLM Overrides"
          value={`$${networkEarned.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<BarChart3 className="h-5 w-5 text-violet-500" />}
          color="bg-violet-500"
          subtitle="From team sponsor levels"
        />
      </div>

      {/* Search & Filters */}
      <div className="w-full max-w-xs">
        <SearchFilter
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search property..."
          filterValue={filter}
          onFilterChange={setFilter}
          filterOptions={[
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "paid", label: "Paid" },
            { value: "rejected", label: "Rejected" },
            { value: "cancelled", label: "Cancelled" },
          ]}
          filterPlaceholder="All Statuses"
        />
      </div>

      {/* Commissions Table */}
      <DataTable
        columns={columns}
        data={filteredCommissions}
        emptyTitle="No commissions records found"
        emptyDescription="You don't have any commissions registered yet. Submit sales to generate commissions."
      />
    </div>
  );
}

"use client";

import * as React from "react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { EarningsChart } from "@/components/charts/earnings-chart";
import { DataTable } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DollarSign,
  TrendingUp,
  Award,
  Users,
  Building,
  ArrowUpRight,
} from "lucide-react";

interface AgentDashboardClientProps {
  profile: any;
  balance: number;
  totalEarned: number;
  paid: number;
  totalSalesVolume: number;
  downlineCount: number;
  chartData: { date: string; amount: number }[];
  recentSales: any[];
  currentRankTitle: string;
}

export function AgentDashboardClient({
  profile,
  balance,
  totalEarned,
  paid,
  totalSalesVolume,
  downlineCount,
  chartData,
  recentSales,
  currentRankTitle,
}: AgentDashboardClientProps) {
  const columns = [
    {
      header: "Property",
      accessorKey: "properties.title",
      render: (row: any) => (
        <span className="font-semibold text-foreground">
          {row.properties?.title || "Unknown Property"}
        </span>
      ),
    },
    {
      header: "Buyer",
      accessorKey: "buyer_name",
    },
    {
      header: "Sale Price",
      accessorKey: "sale_amount",
      render: (row: any) => (
        <span className="font-semibold text-foreground">
          ${Number(row.sale_amount).toLocaleString("en-US")}
        </span>
      ),
    },
    {
      header: "Date",
      accessorKey: "created_at",
      render: (row: any) => (
        <span>{new Date(row.created_at).toLocaleDateString()}</span>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      render: (row: any) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-8 rounded-3xl border border-border/40 bg-card text-foreground shadow-lg">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
            Welcome, {profile.name || "Agent"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your earnings, downline network, and sales transactions in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-primary/10 border border-primary/25 text-primary text-sm font-bold w-fit">
          <Award className="h-4 w-4" />
          <span>Rank: {currentRankTitle}</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Available Balance"
          value={`$${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign className="h-5 w-5" />}
          description="Ready for payout request"
        />
        <StatsCard
          title="Total Earnings"
          value={`$${totalEarned.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<TrendingUp className="h-5 w-5" />}
          description={`Withdrawn: $${paid.toLocaleString("en-US")}`}
        />
        <StatsCard
          title="Direct Sales Volume"
          value={`$${totalSalesVolume.toLocaleString("en-US")}`}
          icon={<Building className="h-5 w-5" />}
          description="Approved transactions"
        />
        <StatsCard
          title="My Downline Size"
          value={downlineCount || 0}
          icon={<Users className="h-5 w-5" />}
          description="Direct referrals recruited"
        />
      </div>

      {/* Charts & Actions Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Earnings Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl border border-border/40 bg-card text-foreground shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Commissions Over Time
            </h3>
            <p className="text-xs text-muted-foreground">
              Overview of direct and indirect override payments
            </p>
          </div>
          <div className="mt-4">
            <EarningsChart data={chartData} />
          </div>
        </div>

        {/* Action Panel */}
        <div className="p-6 rounded-3xl border border-border/40 bg-card text-foreground shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Quick Actions
            </h3>
            <p className="text-xs text-muted-foreground">
              Manage operations on the platform
            </p>
          </div>
          <div className="space-y-3.5 my-6">
            <a
              href="/agent/properties"
              className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 hover:bg-muted/40 border border-border/30 hover:border-primary/20 transition-all font-semibold text-sm group"
            >
              <span>Submit Property Sale</span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
            <a
              href="/agent/network"
              className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 hover:bg-muted/40 border border-border/30 hover:border-primary/20 transition-all font-semibold text-sm group"
            >
              <span>View MLM Downline</span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
            <a
              href="/agent/payouts"
              className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 hover:bg-muted/40 border border-border/30 hover:border-primary/20 transition-all font-semibold text-sm group"
            >
              <span>Request Payout</span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
          </div>
          <div className="text-center text-[10px] text-muted-foreground font-medium">
            Subject to platform Row-Level Security policy checks.
          </div>
        </div>
      </div>

      {/* Recent Sales Table */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            Recent Sales Transactions
          </h3>
          <p className="text-sm text-muted-foreground">
            List of recent sales registered for commission review
          </p>
        </div>
        <DataTable
          columns={columns}
          data={recentSales || []}
          emptyTitle="No sales registered"
          emptyDescription="You haven't submitted any property transactions yet. Go to Properties & Sales page to submit a new transaction."
        />
      </div>
    </div>
  );
}

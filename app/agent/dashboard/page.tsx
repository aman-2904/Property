import * as React from "react";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { StatsCard } from "@/components/dashboard/stats-card";
import { EarningsChart } from "@/components/charts/earnings-chart";
import { DataTable } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAgentBalance } from "@/lib/actions/payouts";
import {
  DollarSign,
  TrendingUp,
  Award,
  Users,
  Building,
  ArrowUpRight,
} from "lucide-react";


export default async function AgentDashboardPage() {
  const supabase = createClient();
  const adminSupabase = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch profile details using admin client to bypass RLS recursion
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }


  // 2. Fetch financial balances (using synced wallet)
  const { totalEarned, balance, paid } = await getAgentBalance(user.id);

  // 3. Fetch total sales volume
  const { data: salesData } = await supabase
    .from("sales")
    .select("sale_amount")
    .eq("seller_id", user.id)
    .eq("status", "approved");

  const totalSalesVolume = salesData?.reduce((sum, item) => sum + Number(item.sale_amount), 0) || 0;

  // 4. Fetch downline size (Direct referrals count)
  const { count: downlineCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("upline_id", user.id);

  // 5. Fetch commission history for charts
  const { data: commHistory } = await supabase
    .from("commissions")
    .select("created_at, amount")
    .eq("recipient_id", user.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  const chartData = (commHistory || []).map((comm) => ({
    date: new Date(comm.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    amount: Number(comm.amount),
  }));

  // 6. Fetch recent sales list
  const { data: recentSales } = await supabase
    .from("sales")
    .select("*, properties(title)")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const rankTitles = ["Rookie Agent", "Senior Agent", "Manager", "Director"];
  const currentRankTitle = rankTitles[profile.promotion_level ?? 0] || "Rookie Agent";

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
          ${Number(row.sale_amount).toLocaleString()}
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-8 rounded-3xl border border-border/40 glass-premium">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
            Welcome, {profile.name}
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
          value={`$${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign className="h-5 w-5" />}
          description="Ready for payout request"
        />
        <StatsCard
          title="Total Earnings"
          value={`$${totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<TrendingUp className="h-5 w-5" />}
          description={`Withdrawn: $${paid.toLocaleString()}`}
        />
        <StatsCard
          title="Direct Sales Volume"
          value={`$${totalSalesVolume.toLocaleString()}`}
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
        <div className="lg:col-span-2 p-6 rounded-3xl border border-border/40 glass-premium flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Commissions Over Time
            </h3>
            <p className="text-xs text-muted-foreground">
              Overview of direct and indirect override payments
            </p>
          </div>
          <EarningsChart data={chartData} />
        </div>

        {/* Action Panel */}
        <div className="p-6 rounded-3xl border border-border/40 glass-premium flex flex-col justify-between">
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

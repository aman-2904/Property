import * as React from "react";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getAgentBalance } from "@/lib/actions/payouts";
import { AgentDashboardClient } from "@/components/dashboard/agent-dashboard-client";

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

  return (
    <AgentDashboardClient
      profile={profile}
      balance={balance}
      totalEarned={totalEarned}
      paid={paid}
      totalSalesVolume={totalSalesVolume}
      downlineCount={downlineCount || 0}
      chartData={chartData}
      recentSales={recentSales || []}
      currentRankTitle={currentRankTitle}
    />
  );
}

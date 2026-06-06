import * as React from "react";
import { redirect } from "next/navigation";
import { createClient, createAdminClient, getCachedUser } from "@/lib/supabase/server";
import { getAgentBalance } from "@/lib/actions/payouts";
import { AgentDashboardClient } from "@/components/dashboard/agent-dashboard-client";

export default async function AgentDashboardPage() {
  const supabase = createClient();
  const adminSupabase = createAdminClient();

  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all dashboard data components in parallel to avoid sequential waterfalls
  const [
    profileResponse,
    balanceData,
    salesResponse,
    downlineResponse,
    commHistoryResponse,
    recentSalesResponse,
  ] = await Promise.all([
    adminSupabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single(),
    getAgentBalance(user.id),
    supabase
      .from("sales")
      .select("booking_amount")
      .eq("seller_id", user.id)
      .eq("status", "approved"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("upline_id", user.id),
    supabase
      .from("commissions")
      .select("created_at, amount")
      .eq("recipient_id", user.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true }),
    supabase
      .from("sales")
      .select("*, properties(title)")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const profile = profileResponse.data;
  if (!profile) {
    redirect("/login");
  }

  const { totalEarned, balance, paid } = balanceData;
  const salesData = salesResponse.data;
  const downlineCount = downlineResponse.count;
  const commHistory = commHistoryResponse.data;
  const recentSales = recentSalesResponse.data;

  const totalSalesVolume = salesData?.reduce((sum, item) => sum + Number(item.booking_amount), 0) || 0;

  const chartData = (commHistory || []).map((comm) => ({
    date: new Date(comm.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    amount: Number(comm.amount),
  }));

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


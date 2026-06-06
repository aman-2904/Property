import * as React from "react";
import { redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { AdminDashboardClient } from "@/components/dashboard/admin-dashboard-client";
import {
  getAdminStats,
  getMonthlySalesTrend,
  getCommissionDistribution,
  getPromotionDistribution,
  getAgentGrowthTrend,
  getVisitTrends,
  getRecentSales,
  getRecentWithdrawals,
  getRecentCommissions,
  getActivityLogs,
} from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  // Parallel fetch everything for performance
  const [
    stats,
    monthlySales,
    commissionDist,
    promotionDist,
    agentGrowth,
    visitTrends,
    recentSales,
    recentWithdrawals,
    recentCommissions,
    activityLogs,
    profileRes,
  ] = await Promise.all([
    getAdminStats(),
    getMonthlySalesTrend(),
    getCommissionDistribution(),
    getPromotionDistribution(),
    getAgentGrowthTrend(),
    getVisitTrends(),
    getRecentSales(15),
    getRecentWithdrawals(15),
    getRecentCommissions(15),
    getActivityLogs(40),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
  ]);

  const isSuperAdmin = profileRes.data?.role === "SUPER_ADMIN";

  return (
    <AdminDashboardClient
      stats={stats}
      monthlySales={monthlySales}
      commissionDist={commissionDist}
      promotionDist={promotionDist}
      agentGrowth={agentGrowth}
      visitTrends={visitTrends}
      initialRecentSales={recentSales as any[]}
      initialRecentWithdrawals={recentWithdrawals as any[]}
      initialRecentCommissions={recentCommissions as any[]}
      initialActivityLogs={activityLogs as any[]}
      isSuperAdmin={isSuperAdmin}
    />
  );
}

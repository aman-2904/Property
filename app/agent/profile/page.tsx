import * as React from "react";
import { redirect } from "next/navigation";
import { createClient, createAdminClient, getCachedUser } from "@/lib/supabase/server";
import { getAgentBalance } from "@/lib/actions/payouts";
import { AgentProfileClient } from "@/components/dashboard/agent-profile-client";

export const metadata = {
  title: "My Profile | elitebuildtech",
  description: "View and manage your agent profile, performance stats, and account security.",
};

export default async function AgentProfilePage() {
  const supabase = createClient();
  const adminSupabase = createAdminClient();

  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile, balance, sales count, and downline count in parallel
  const [
    profileResponse,
    balanceData,
    salesCountResponse,
    downlineCountResponse,
    commTotalResponse,
  ] = await Promise.all([
    adminSupabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single(),
    getAgentBalance(user.id),
    supabase
      .from("sales")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .eq("status", "approved"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("upline_id", user.id),
    supabase
      .from("commissions")
      .select("amount")
      .eq("recipient_id", user.id)
      .neq("status", "cancelled"),
  ]);

  const profile = profileResponse.data;
  if (!profile) {
    redirect("/login");
  }

  const { totalEarned, balance } = balanceData;
  const salesCount = salesCountResponse.count ?? 0;
  const downlineCount = downlineCountResponse.count ?? 0;

  const rankTitles = ["Rookie Agent", "Senior Agent", "Manager", "Director"];
  const currentRankTitle = rankTitles[profile.promotion_level ?? 0] || "Rookie Agent";

  return (
    <AgentProfileClient
      profile={profile}
      userEmail={user.email ?? ""}
      totalEarned={totalEarned}
      availableBalance={balance}
      salesCount={salesCount}
      downlineCount={downlineCount}
      currentRankTitle={currentRankTitle}
    />
  );
}

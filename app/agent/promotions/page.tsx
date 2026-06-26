import * as React from "react";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { getAgentPromotionStatus, getAgentPromotionWallet } from "@/lib/actions/promotions";
import { AgentPromotionsClient } from "./client-page";

export default async function AgentPromotionsPage() {
  const { data: { user } } = await getCachedUser();
  if (!user) {
    redirect("/login");
  }

  // Load status progress and wallet transactions parallelly
  const [statusData, walletData] = await Promise.all([
    getAgentPromotionStatus(user.id),
    getAgentPromotionWallet(user.id)
  ]);

  if (!statusData) {
    redirect("/agent/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          My Promotion Income
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your rank promotions, analyze milestones progress, check promotion wallets, and audit your post-income incentive earnings.
        </p>
      </div>

      <AgentPromotionsClient 
        userId={user.id}
        statusData={statusData}
        initialWalletData={walletData}
      />
    </div>
  );
}

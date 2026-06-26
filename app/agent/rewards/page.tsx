import * as React from "react";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { getAgentRewardsSummary, getAgentClaimHistory } from "@/lib/actions/rewards";
import { AgentRewardsClient } from "./client-page";

export default async function AgentRewardsPage() {
  const { data: { user } } = await getCachedUser();
  if (!user) {
    redirect("/login");
  }

  const [summaryData, claimsData] = await Promise.all([
    getAgentRewardsSummary(user.id),
    getAgentClaimHistory(user.id)
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          My Achievements & Rewards
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your sales milestones, evaluate reward eligibility, submit claims, and view history.
        </p>
      </div>

      <AgentRewardsClient
        userId={user.id}
        initialSummary={summaryData}
        initialClaims={claimsData}
      />
    </div>
  );
}

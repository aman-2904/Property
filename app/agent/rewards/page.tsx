import * as React from "react";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { getAgentRewardsSummary, getAgentClaimHistory } from "@/lib/actions/rewards";
import { AgentRewardsClient } from "./client-page";

import { Info } from "lucide-react";

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
            My Achievements & Rewards
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your sales milestones, evaluate reward eligibility, submit claims, and view history.
          </p>
        </div>
        
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold max-w-fit shadow shadow-amber-500/5">
          <Info className="h-4 w-4 shrink-0 text-amber-400" />
          <span>Note: All awards will be distributed on events.</span>
        </div>
      </div>

      <AgentRewardsClient
        userId={user.id}
        initialSummary={summaryData}
        initialClaims={claimsData}
      />
    </div>
  );
}

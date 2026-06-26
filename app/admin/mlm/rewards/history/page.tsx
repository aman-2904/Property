import * as React from "react";
import { getClaimsHistoryAdmin } from "@/lib/actions/rewards";
import { AdminRewardClaimsHistoryClient } from "./client-page";

export default async function AdminRewardClaimsHistoryPage() {
  const claimsHistory = await getClaimsHistoryAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Claims & Rewards History
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View audited records of all approved and rejected reward claims across all agents.
        </p>
      </div>

      <AdminRewardClaimsHistoryClient initialHistory={claimsHistory} />
    </div>
  );
}

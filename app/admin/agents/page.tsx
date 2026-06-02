import * as React from "react";
import { getAgentsWithSponsors } from "@/lib/actions/network";
import { AdminAgentsClient } from "@/components/dashboard/admin-agents-client";

export default async function AdminAgentsPage() {
  const agents = await getAgentsWithSponsors();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Agent Directory
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor platform agents, manually adjust ranks, review statuses, and inspect referral network trees.
        </p>
      </div>

      <AdminAgentsClient initialAgents={agents as any[]} />
    </div>
  );
}

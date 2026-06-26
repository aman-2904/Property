import * as React from "react";
import { getRewardReports } from "@/lib/actions/rewards";
import { AdminRewardReportsClient } from "./client-page";

export default async function AdminRewardReportsPage() {
  const reports = await getRewardReports({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Reward Distribution & Analysis Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor reward distributions, evaluate unlocked claim ratios, track metrics across all agents, and export CSV statement statements.
        </p>
      </div>

      <AdminRewardReportsClient initialReports={reports} />
    </div>
  );
}

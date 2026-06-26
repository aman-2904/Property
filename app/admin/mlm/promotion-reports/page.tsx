import * as React from "react";
import { getPromotionLevels, getPromotionReports } from "@/lib/actions/promotions";
import { getPromotionDistribution } from "@/lib/actions/admin";
import { AdminPromotionReportsClient } from "./client-page";

export default async function AdminPromotionReportsPage() {
  const levels = await getPromotionLevels();
  const reports = await getPromotionReports();
  const distribution = await getPromotionDistribution();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Promotion Income & Distribution Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor agent rank distributions, analyze proximity tracking metrics, and export promotion income statements.
        </p>
      </div>

      <AdminPromotionReportsClient 
        initialLevels={levels as any[]} 
        initialReports={reports as any[]} 
        initialDistribution={distribution as any[]} 
      />
    </div>
  );
}

import * as React from "react";
import { getPromotionHistory } from "@/lib/actions/promotions";
import { AdminPromotionHistoryClient } from "./client-page";

export default async function AdminPromotionHistoryPage() {
  const history = await getPromotionHistory();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Promotion History
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Audit and trace rank advancements, qualification milestones, and historical agent promotions.
        </p>
      </div>

      <AdminPromotionHistoryClient initialHistory={history as any[]} />
    </div>
  );
}

import * as React from "react";
import { getPromotionLevels } from "@/lib/actions/promotions";
import { AdminPromotionLevelsClient } from "./client-page";

export default async function AdminPromotionLevelsPage() {
  const levels = await getPromotionLevels();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Promotion Levels Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure agent ranks, direct and group sales milestones, qualification requirements, and flat incentives.
        </p>
      </div>

      <AdminPromotionLevelsClient initialLevels={levels as any[]} />
    </div>
  );
}

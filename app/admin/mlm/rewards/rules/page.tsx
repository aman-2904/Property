import * as React from "react";
import { getAchievementRules, getRewardCategories } from "@/lib/actions/rewards";
import { getPromotionLevels } from "@/lib/actions/promotions";
import { AdminAchievementRulesClient } from "./client-page";

export default async function AdminAchievementRulesPage() {
  const [rules, categories, levels] = await Promise.all([
    getAchievementRules(),
    getRewardCategories(),
    getPromotionLevels()
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Achievement & Reward Rules
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure physical gifts, vehicle, cash, and luxury rewards tied to direct sales, group sales, and rank milestones.
        </p>
      </div>

      <AdminAchievementRulesClient 
        initialRules={rules} 
        categories={categories} 
        promotionLevels={levels || []} 
      />
    </div>
  );
}

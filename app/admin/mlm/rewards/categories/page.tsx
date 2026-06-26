import * as React from "react";
import { getRewardCategories } from "@/lib/actions/rewards";
import { AdminRewardCategoriesClient } from "./client-page";

export default async function AdminRewardCategoriesPage() {
  const categories = await getRewardCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Reward Categories
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage target categories / groupings for MLM achievement rules (e.g. Associates, Manager, AGM).
        </p>
      </div>

      <AdminRewardCategoriesClient initialCategories={categories} />
    </div>
  );
}

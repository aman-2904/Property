import * as React from "react";
import { getPendingClaims } from "@/lib/actions/rewards";
import { AdminRewardClaimsClient } from "./client-page";

export default async function AdminRewardClaimsPage() {
  const pendingClaims = await getPendingClaims();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Reward Claims Queue
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and process claim requests for unlocked MLM achievements. Approve or reject with custom audit remarks.
        </p>
      </div>

      <AdminRewardClaimsClient initialClaims={pendingClaims} />
    </div>
  );
}

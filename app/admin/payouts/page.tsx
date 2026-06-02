import * as React from "react";
import { getPayouts } from "@/lib/actions/payouts";
import { AdminPayoutsClient } from "@/components/dashboard/admin-payouts-client";

export default async function AdminPayoutsPage() {
  const payouts = await getPayouts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Payouts Requests
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review, approve, and process commission withdrawal requests from agents.
        </p>
      </div>

      <AdminPayoutsClient initialPayouts={payouts as any[]} />
    </div>
  );
}

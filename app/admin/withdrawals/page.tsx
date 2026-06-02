import * as React from "react";
import { getPayouts } from "@/lib/actions/payouts";
import { AdminWithdrawalsClient } from "@/components/dashboard/admin-withdrawals-client";

export default async function AdminWithdrawalsPage() {
  const payouts = await getPayouts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Withdrawals Ledger
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View cashout transaction history, audit agent bank details, and monitor payouts statistics.
        </p>
      </div>

      <AdminWithdrawalsClient initialPayouts={payouts as any[]} />
    </div>
  );
}

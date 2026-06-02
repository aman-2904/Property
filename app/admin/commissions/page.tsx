import * as React from "react";
import { getCommissionsWithDetails } from "@/lib/actions/admin";
import { AdminCommissionsClient } from "@/components/dashboard/admin-commissions-client";

export default async function AdminCommissionsPage() {
  const commissions = await getCommissionsWithDetails();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          MLM Commissions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor direct and indirect override commissions, track system payouts, and approve/reject payouts.
        </p>
      </div>

      <AdminCommissionsClient initialCommissions={commissions as any[]} />
    </div>
  );
}

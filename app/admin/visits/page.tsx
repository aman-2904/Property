import * as React from "react";
import { getVisits, getVisitAnalytics } from "@/lib/actions/visits";
import { AdminVisitsClient } from "@/components/dashboard/admin-visits-client";

export default async function AdminVisitsPage() {
  const visits = await getVisits();
  const analytics = await getVisitAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Customer Visits Tracking
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor agent site visits, review photo proof uploads, and export records for auditing.
        </p>
      </div>

      <AdminVisitsClient initialVisits={visits as any[]} analytics={analytics} />
    </div>
  );
}

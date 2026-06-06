import * as React from "react";
import { redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { getActivityLogs } from "@/lib/actions/admin";
import { ActivityLogsClient } from "@/components/dashboard/activity-logs-client";

export const dynamic = "force-dynamic";

export default async function ActivityLogsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await getCachedUser();

  if (!user) redirect("/login");

  const logs = await getActivityLogs(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Activity Logs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Full audit trail of all platform events — sales, commissions, withdrawals.
        </p>
      </div>
      <ActivityLogsClient initialLogs={logs as any[]} />
    </div>
  );
}

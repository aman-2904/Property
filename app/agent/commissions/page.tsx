import * as React from "react";
import { redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { getAgentCommissions } from "@/lib/actions/sales";
import { AgentCommissionsClient } from "@/components/dashboard/agent-commissions-client";

export const metadata = {
  title: "My Commissions | elitebuildtech Agent Portal",
  description: "Track your direct selling commissions and MLM upline override commissions.",
};

export default async function AgentCommissionsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  const commissions = await getAgentCommissions(user.id);

  return (
    <div className="space-y-6">
      <AgentCommissionsClient initialCommissions={commissions as any[]} />
    </div>
  );
}

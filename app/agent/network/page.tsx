import * as React from "react";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getDownlineTree, getAgentTeamAnalytics } from "@/lib/actions/network";
import { AgentNetworkClient } from "@/components/dashboard/agent-network-client";

export default async function AgentNetworkPage() {
  const supabase = createClient();
  const adminSupabase = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch agent profile using admin client to bypass RLS recursion
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  // 2. Fetch downline tree (Agent is restricted to 3 levels max)
  const downlineTree = await getDownlineTree(user.id, 3);

  // 3. Fetch flat downline members (restricted to 3 levels max)
  const { data: downlineMembers } = await supabase.rpc("get_downline_network", {
    root_id: user.id,
    max_depth: 3,
  });

  // Filter out the agent themselves (depth = 0)
  const downlineList = (downlineMembers || []).filter((d: any) => d.id !== user.id);

  // 4. Fetch team analytics (live calculations)
  const teamStats = await getAgentTeamAnalytics(user.id);

  // 5. Fetch upline sponsor path
  const { data: uplinePath } = await supabase
    .from("upline_sponsor_path")
    .select(`
      sponsor_id,
      step_distance,
      sponsor:sponsor_id (
        name,
        email,
        role,
        promotion_level
      )
    `)
    .eq("agent_id", user.id)
    .order("step_distance", { ascending: true });

  return (
    <AgentNetworkClient
      profile={profile}
      downlineTree={downlineTree}
      downlineList={downlineList}
      teamStats={teamStats}
      uplinePath={uplinePath || []}
    />
  );
}


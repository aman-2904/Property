import * as React from "react";
import { redirect } from "next/navigation";
import { createClient, createAdminClient, getCachedUser } from "@/lib/supabase/server";
import { getAgentTeamAnalytics } from "@/lib/actions/network";
import { AgentNetworkClient } from "@/components/dashboard/agent-network-client";

export default async function AgentNetworkPage() {
  const supabase = createClient();
  const adminSupabase = createAdminClient();

  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile, 3-level flat network, analytics, and upline path in parallel
  const [
    profileResponse,
    downlineMembersResponse,
    teamStats,
    uplinePathResponse,
  ] = await Promise.all([
    adminSupabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single(),
    supabase.rpc("get_downline_network", {
      root_id: user.id,
      max_depth: 3,
    }),
    getAgentTeamAnalytics(user.id),
    supabase
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
      .order("step_distance", { ascending: true }),
  ]);

  const profile = profileResponse.data;
  if (!profile) {
    redirect("/login");
  }

  const downlineMembers = downlineMembersResponse.data || [];
  const uplinePath = uplinePathResponse.data || [];

  // Filter out the agent themselves (depth = 0) for flat downline list
  const downlineList = downlineMembers.filter((d: any) => d.id !== user.id);

  // Build the hierarchical downline tree in-memory to save a redundant database RPC call
  const rankTitles = ["Rookie Agent", "Senior Agent", "Manager", "Director"];
  const nodeMap = new Map<string, any>();
  
  downlineMembers.forEach((node: any) => {
    nodeMap.set(node.id, {
      id: node.id,
      name: node.name,
      email: node.email,
      rank: rankTitles[node.promotion_level] || "Rookie Agent",
      promotion_level: node.promotion_level,
      status: node.is_active ? "active" : "suspended",
      is_active: node.is_active,
      upline_id: node.upline_id,
      level_depth: node.level_depth,
      direct_sales_count: node.direct_sales_count ?? 0,
      group_sales_count: node.group_sales_count ?? 0,
      children: [],
    });
  });

  let downlineTree: any = null;
  downlineMembers.forEach((rawNode: any) => {
    const node = nodeMap.get(rawNode.id);
    if (node) {
      if (rawNode.id === user.id) {
        downlineTree = node;
      } else {
        const parent = nodeMap.get(rawNode.upline_id);
        if (parent) {
          parent.children.push(node);
        }
      }
    }
  });

  return (
    <AgentNetworkClient
      profile={profile}
      downlineTree={downlineTree}
      downlineList={downlineList}
      teamStats={teamStats}
      uplinePath={uplinePath}
    />
  );
}



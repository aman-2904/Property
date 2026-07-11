import * as React from "react";
import { redirect } from "next/navigation";
import { createClient, createAdminClient, getCachedUser } from "@/lib/supabase/server";
import { getAgentTeamAnalytics } from "@/lib/actions/network";
import { AgentNetworkClient } from "@/components/dashboard/agent-network-client";

async function getUplinePath(uplineId: string | null, supabase: any) {
  const path: any[] = [];
  let currentUplineId = uplineId;
  let distance = 1;

  while (currentUplineId) {
    const { data: sponsor, error } = await supabase
      .from("profiles")
      .select("id, name, email, role, promotion_level, upline_id")
      .eq("id", currentUplineId)
      .single();

    if (error || !sponsor) {
      break;
    }

    path.push({
      sponsor_id: sponsor.id,
      step_distance: distance,
      sponsor: {
        name: sponsor.name,
        email: sponsor.email,
        role: sponsor.role,
        promotion_level: sponsor.promotion_level,
      },
    });

    currentUplineId = sponsor.upline_id;
    distance++;
  }

  return path;
}

export default async function AgentNetworkPage() {
  const supabase = createClient();
  const adminSupabase = createAdminClient();

  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile, 3-level flat network, and analytics in parallel
  const [
    profileResponse,
    downlineMembersResponse,
    teamStats,
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
  ]);

  const profile = profileResponse.data;
  if (!profile) {
    redirect("/login");
  }

  const downlineMembers = downlineMembersResponse.data || [];
  
  // Fetch upline path recursively
  const uplinePath = await getUplinePath(profile.upline_id, adminSupabase);

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



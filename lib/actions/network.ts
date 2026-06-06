"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface TreeNode {
  id: string;
  name: string;
  email: string;
  rank: string;
  promotion_level: number;
  status: string;
  is_active: boolean;
  upline_id: string | null;
  level_depth: number;
  direct_sales_count: number;
  group_sales_count: number;
  children: TreeNode[];
}

export interface TeamAnalytics {
  directReferralsCount: number;
  totalTeamCount: number;
  totalTeamSalesAmount: number;
  currentPromotionTitle: string;
}

/**
 * Traverses downline tree recursively up to maxDepth.
 * Leverages the optimized `get_downline_network` SQL RPC.
 */
export async function getDownlineTree(rootAgentId: string, maxDepth?: number): Promise<TreeNode | null> {
  const supabase = createClient();

  const { data: rawNodes, error } = await supabase.rpc("get_downline_network", {
    root_id: rootAgentId,
    max_depth: maxDepth ?? null,
  });

  if (error) {
    console.error("Error executing get_downline_network RPC:", error);
    return null;
  }

  if (!rawNodes || rawNodes.length === 0) {
    return null;
  }

  const rankTitles = ["Rookie Agent", "Senior Agent", "Manager", "Director"];

  // Create tree node wrappers
  const nodeMap = new Map<string, TreeNode>();
  rawNodes.forEach((node: any) => {
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

  let rootNode: TreeNode | null = null;

  // Build hierarchy parent-child links
  rawNodes.forEach((rawNode: any) => {
    const node = nodeMap.get(rawNode.id)!;
    if (rawNode.id === rootAgentId) {
      rootNode = node;
    } else {
      const parent = nodeMap.get(rawNode.upline_id);
      if (parent) {
        parent.children.push(node);
      }
    }
  });

  return rootNode;
}

/**
 * Calculates Team Analytics summary for dashboards.
 */
export async function getAgentTeamAnalytics(agentId: string): Promise<TeamAnalytics> {
  const adminSupabase = createAdminClient();

  // 1. Fetch current profile, direct referrals, and downline list in parallel
  const [profileResult, directResult, downlineResult] = await Promise.all([
    adminSupabase
      .from("profiles")
      .select("promotion_level")
      .eq("id", agentId)
      .single(),
    adminSupabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("upline_id", agentId),
    adminSupabase.rpc("get_downline_network", {
      root_id: agentId,
      max_depth: null,
    }),
  ]);

  const profile = profileResult.data;
  const directCount = directResult.count;
  const downline = downlineResult.data;

  const rankTitles = ["Rookie Agent", "Senior Agent", "Manager", "Director"];
  const currentPromotionTitle = rankTitles[profile?.promotion_level ?? 0] || "Rookie Agent";

  // Calculate team size: total count minus 1 (excluding the root agent themselves)
  const totalTeamCount = Math.max(0, (downline?.length ?? 1) - 1);

  // Collect all team member IDs (including the agent themselves, to sum up team sales)
  const teamMemberIds = downline ? downline.map((d: any) => d.id) : [agentId];

  // 2. Fetch sum of sales from all these team members
  const { data: sales } = await adminSupabase
    .from("sales")
    .select("booking_amount")
    .in("seller_id", teamMemberIds)
    .eq("status", "approved");

  const totalTeamSalesAmount = sales?.reduce((sum, s) => sum + Number(s.booking_amount), 0) || 0;

  return {
    directReferralsCount: directCount || 0,
    totalTeamCount,
    totalTeamSalesAmount,
    currentPromotionTitle,
  };
}

/**
 * Fetches all platform agents with sponsor details.
 */
export async function getAgentsWithSponsors() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*, upline:upline_id(name)")
    .eq("role", "AGENT")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching agents with sponsors:", error);
    return [];
  }
  return data || [];
}

/**
 * Updates agent status and rank level.
 */
export async function updateAgentProfile(
  agentId: string,
  formData: {
    status?: "active" | "suspended";
    rank?: "Rookie Agent" | "Senior Agent" | "Manager" | "Director";
  }
) {
  const supabase = createClient();
  
  const updateData: any = {};
  if (formData.status !== undefined) {
    updateData.is_active = formData.status === "active";
  }
  if (formData.rank !== undefined) {
    const rankTitles = ["Rookie Agent", "Senior Agent", "Manager", "Director"];
    const level = rankTitles.indexOf(formData.rank);
    if (level !== -1) {
      updateData.promotion_level = level;
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", agentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/agents");
  return { success: true };
}

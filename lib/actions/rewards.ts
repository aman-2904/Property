"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Helper to check if the current user is an Admin
async function checkIsAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role?.toUpperCase();
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

// ─── REWARD CATEGORIES CRUD (ADMIN) ──────────────────────────────────────────

export async function getRewardCategories() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reward_categories")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error.message);
    return [];
  }
  return data || [];
}

export async function createRewardCategory(formData: any) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { error: "Unauthorized" };

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("reward_categories")
    .insert([
      {
        name: formData.name,
        display_order: formData.display_order || 0,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating category:", error.message);
    return { error: error.message };
  }

  revalidatePath("/admin/mlm/rewards/categories");
  return { success: true, data };
}

export async function updateRewardCategory(categoryId: string, formData: any) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { error: "Unauthorized" };

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("reward_categories")
    .update({
      name: formData.name,
      display_order: formData.display_order || 0,
    })
    .eq("id", categoryId)
    .select()
    .single();

  if (error) {
    console.error("Error updating category:", error.message);
    return { error: error.message };
  }

  revalidatePath("/admin/mlm/rewards/categories");
  return { success: true, data };
}

export async function deleteRewardCategory(categoryId: string) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { error: "Unauthorized" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("reward_categories")
    .delete()
    .eq("id", categoryId);

  if (error) {
    console.error("Error deleting category:", error.message);
    return { error: error.message };
  }

  revalidatePath("/admin/mlm/rewards/categories");
  return { success: true };
}

// ─── ACHIEVEMENT RULES CRUD (ADMIN) ──────────────────────────────────────────

export async function getAchievementRules() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("achievement_rules")
    .select("*, reward_categories(name)")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching rules:", error.message);
    return [];
  }
  return data || [];
}

export async function createAchievementRule(formData: any) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { error: "Unauthorized" };

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("achievement_rules")
    .insert([
      {
        name: formData.name,
        category_id: formData.category_id === "none" ? null : formData.category_id,
        required_direct_sales: formData.required_direct_sales || 0,
        required_group_sales: formData.required_group_sales || 0,
        min_promotion_level: formData.min_promotion_level === "none" ? null : Number(formData.min_promotion_level),
        reward_type: formData.reward_type,
        reward_value: formData.reward_value,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: formData.status || "active",
        display_order: formData.display_order || 0,
        description: formData.description || "",
        different_legs_required: formData.different_legs_required || false,
        max_claims_per_user: formData.max_claims_per_user || 1,
        image_url: formData.image_url || null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating rule:", error.message);
    return { error: error.message };
  }

  revalidatePath("/admin/mlm/rewards/rules");
  return { success: true, data };
}

export async function updateAchievementRule(ruleId: string, formData: any) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { error: "Unauthorized" };

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("achievement_rules")
    .update({
      name: formData.name,
      category_id: formData.category_id === "none" ? null : formData.category_id,
      required_direct_sales: formData.required_direct_sales || 0,
      required_group_sales: formData.required_group_sales || 0,
      min_promotion_level: formData.min_promotion_level === "none" ? null : Number(formData.min_promotion_level),
      reward_type: formData.reward_type,
      reward_value: formData.reward_value,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      status: formData.status || "active",
      display_order: formData.display_order || 0,
      description: formData.description || "",
      different_legs_required: formData.different_legs_required || false,
      max_claims_per_user: formData.max_claims_per_user || 1,
      image_url: formData.image_url || null,
    })
    .eq("id", ruleId)
    .select()
    .single();

  if (error) {
    console.error("Error updating rule:", error.message);
    return { error: error.message };
  }

  revalidatePath("/admin/mlm/rewards/rules");
  return { success: true, data };
}

export async function deleteAchievementRule(ruleId: string) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { error: "Unauthorized" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("achievement_rules")
    .delete()
    .eq("id", ruleId);

  if (error) {
    console.error("Error deleting rule:", error.message);
    return { error: error.message };
  }

  revalidatePath("/admin/mlm/rewards/rules");
  return { success: true };
}

// ─── AGENT REWARDS SUMMARY & PROGRESS ────────────────────────────────────────

export async function getAgentRewardsSummary(userId: string) {
  const supabase = createClient();

  // Retroactively check/sync eligibility for the agent
  await supabase.rpc("check_reward_eligibility", { target_user_id: userId });

  // 1. Fetch user stats
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("direct_sales_count, group_sales_count, promotion_level")
    .eq("id", userId)
    .single();

  if (profErr || !profile) {
    console.error("Error loading agent profile for rewards:", profErr?.message);
    return {
      stats: { eligible: 0, claimed: 0, pending: 0, upcoming: 0, lifetime: 0 },
      rewards: []
    };
  }

  const currentDirect = profile.direct_sales_count || 0;
  const currentGroup = profile.group_sales_count || 0;
  const currentPromo = profile.promotion_level || 0;

  // 2. Fetch all rules
  const { data: rules, error: rulesErr } = await supabase
    .from("achievement_rules")
    .select("*, reward_categories(name)")
    .eq("status", "active")
    .order("display_order", { ascending: true });

  if (rulesErr || !rules) {
    console.error("Error loading rules:", rulesErr?.message);
    return {
      stats: { eligible: 0, claimed: 0, pending: 0, upcoming: 0, lifetime: 0 },
      rewards: []
    };
  }

  // 3. Fetch user's qualification history
  const { data: history } = await supabase
    .from("reward_history")
    .select("*")
    .eq("user_id", userId);

  const historyMap = new Map();
  history?.forEach((h) => {
    historyMap.set(h.rule_id, h);
  });

  // 4. Fetch user's claims
  const { data: claims } = await supabase
    .from("reward_claims")
    .select("*")
    .eq("user_id", userId);

  const claimsMap = new Map();
  claims?.forEach((c) => {
    claimsMap.set(c.rule_id, c);
  });

  // Calculate statistics
  let eligibleCount = 0;
  let claimedCount = 0;
  let pendingCount = 0;
  let upcomingCount = 0;
  let lifetimeCount = 0;

  // Compile detailed rules progress
  const compiledRewards = rules.map((rule) => {
    const qRecord = historyMap.get(rule.id);
    const claimRecord = claimsMap.get(rule.id);

    let status = "locked"; // locked, eligible, pending, claimed, expired
    let eligibleDate = null;
    let claimDate = null;
    let approvalDate = null;
    let remarks = "";

    if (qRecord) {
      status = "eligible";
      eligibleDate = qRecord.eligible_date;
      eligibleCount++;
      lifetimeCount++;

      if (qRecord.status === "pending") {
        status = "pending";
        pendingCount++;
        eligibleCount--; // separate pending from unclaimed eligible
      } else if (qRecord.status === "claimed") {
        status = "claimed";
        claimedCount++;
        eligibleCount--;
      }
    }

    if (claimRecord) {
      claimDate = claimRecord.request_date;
      approvalDate = claimRecord.approval_date;
      remarks = claimRecord.remarks;
      if (claimRecord.status === "pending") {
        status = "pending";
      } else if (claimRecord.status === "approved") {
        status = "claimed";
      } else if (claimRecord.status === "rejected") {
        status = "eligible"; // reset back to eligible for re-claim
      }
    }

    // Check contest end date to mark expired
    if (status !== "claimed" && rule.end_date && new Date() > new Date(rule.end_date)) {
      status = "expired";
    }

    // Calculate progress ratios
    let directPercent = 100;
    if (rule.required_direct_sales > 0) {
      directPercent = Math.min(100, Math.round((currentDirect / rule.required_direct_sales) * 100));
    }

    let groupPercent = 100;
    if (rule.required_group_sales > 0) {
      groupPercent = Math.min(100, Math.round((currentGroup / rule.required_group_sales) * 100));
    }

    let isPromoSatisfied = true;
    if (rule.min_promotion_level !== null) {
      isPromoSatisfied = currentPromo >= rule.min_promotion_level;
    }

    const overallPercent = Math.min(100, Math.round((directPercent + groupPercent) / 2));

    if (status === "locked") {
      upcomingCount++;
    }

    return {
      ruleId: rule.id,
      name: rule.name,
      categoryName: rule.reward_categories?.name || "Associates",
      requiredDirectSales: rule.required_direct_sales,
      requiredGroupSales: rule.required_group_sales,
      minPromotionLevel: rule.min_promotion_level,
      rewardType: rule.reward_type,
      rewardValue: rule.reward_value,
      description: rule.description,
      differentLegsRequired: rule.different_legs_required,
      endDate: rule.end_date,
      imageUrl: rule.image_url,
      status,
      eligibleDate,
      claimDate,
      approvalDate,
      remarks,
      progress: {
        currentDirect,
        currentGroup,
        directPercent,
        groupPercent,
        overallPercent,
        isPromoSatisfied
      }
    };
  });

  return {
    stats: {
      eligible: eligibleCount,
      claimed: claimedCount,
      pending: pendingCount,
      upcoming: upcomingCount,
      lifetime: lifetimeCount
    },
    rewards: compiledRewards
  };
}

// ─── SUBMIT CLAIMS (AGENT) ───────────────────────────────────────────────────

export async function claimReward(userId: string, ruleId: string) {
  const supabase = createClient();

  // 1. Check if eligible in history
  const { data: qual, error: qualErr } = await supabase
    .from("reward_history")
    .select("id, status")
    .eq("user_id", userId)
    .eq("rule_id", ruleId)
    .single();

  if (qualErr || !qual) {
    return { error: "You are not qualified for this reward yet." };
  }

  if (qual.status !== "unclaimed") {
    return { error: `Reward claim has already been submitted or completed (Status: ${qual.status})` };
  }

  // 2. Insert into reward_claims
  const { data: claim, error: claimErr } = await supabase
    .from("reward_claims")
    .insert([
      {
        user_id: userId,
        rule_id: ruleId,
        history_id: qual.id,
        status: "pending",
        request_date: new Date().toISOString()
      }
    ])
    .select()
    .single();

  if (claimErr) {
    console.error("Error creating claim:", claimErr.message);
    return { error: claimErr.message };
  }

  // 3. Update history status to pending
  await supabase
    .from("reward_history")
    .update({ status: "pending" })
    .eq("id", qual.id);

  // 4. Create admin alert notification
  const { data: agent } = await supabase.from("profiles").select("name").eq("id", userId).single();
  const { data: rule } = await supabase.from("achievement_rules").select("name").eq("id", ruleId).single();

  // Get all admins to notify
  const { data: admins } = await supabase.from("profiles").select("id").in("role", ["ADMIN", "SUPER_ADMIN"]);
  if (admins) {
    const notifs = admins.map(admin => ({
      user_id: admin.id,
      title: "New Reward Claim Request",
      message: JSON.stringify({
        module: "/admin/mlm/rewards/claims",
        text: `${agent?.name || "Agent"} has requested a claim for reward: ${rule?.name || "Gift"}.`
      })
    }));
    await supabase.from("notifications").insert(notifs);
  }

  revalidatePath("/agent/rewards");
  return { success: true, data: claim };
}

export async function getAgentClaimHistory(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reward_claims")
    .select("*, achievement_rules(name, reward_categories(name))")
    .eq("user_id", userId)
    .order("request_date", { ascending: false });

  if (error) {
    console.error("Error fetching claim history:", error.message);
    return [];
  }
  return data || [];
}

// ─── ADMIN CLAIMS QUEUE & APPROVALS (ADMIN) ──────────────────────────────────

export async function getPendingClaims() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("reward_claims")
    .select("*, profiles!user_id(name, email, direct_sales_count, group_sales_count, promotion_levels(title)), achievement_rules(name, reward_type, reward_value)")
    .eq("status", "pending")
    .order("request_date", { ascending: false });

  if (error) {
    console.error("Error fetching pending claims:", error.message);
    return [];
  }
  return data || [];
}

export async function getClaimsHistoryAdmin() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("reward_claims")
    .select("*, profiles!user_id(name, email, direct_sales_count, group_sales_count, promotion_levels(title)), achievement_rules(name, reward_type, reward_value)")
    .neq("status", "pending")
    .order("request_date", { ascending: false });

  if (error) {
    console.error("Error fetching claims history:", error.message);
    return [];
  }
  return data || [];
}

export async function updateClaimStatus(claimId: string, status: "approved" | "rejected", remarks: string) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { error: "Unauthorized" };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Admin auth details not found" };

  const adminClient = createAdminClient();

  // 1. Fetch claim details
  const { data: claim, error: fetchErr } = await adminClient
    .from("reward_claims")
    .select("*")
    .eq("id", claimId)
    .single();

  if (fetchErr || !claim) {
    return { error: "Claim request not found" };
  }

  const userId = claim.user_id;
  const ruleId = claim.rule_id;
  const historyId = claim.history_id;

  // 2. Update claim status
  const { error: updErr } = await adminClient
    .from("reward_claims")
    .update({
      status,
      remarks,
      approval_date: new Date().toISOString(),
      approved_by: user.id
    })
    .eq("id", claimId);

  if (updErr) return { error: updErr.message };

  // 3. Update status in reward_history
  const historyStatus = status === "approved" ? "claimed" : "unclaimed";
  if (historyId) {
    await adminClient
      .from("reward_history")
      .update({ status: historyStatus })
      .eq("id", historyId);
  }

  // 4. Send notification back to user
  const { data: rule } = await adminClient.from("achievement_rules").select("name").eq("id", ruleId).single();
  const title = status === "approved" ? "🏆 Claim Approved!" : "❌ Claim Rejected";
  const messageText = status === "approved" 
    ? `Your claim request for the reward "${rule?.name || "Gift"}" has been approved! Remarks: ${remarks || "None"}.`
    : `Your claim request for the reward "${rule?.name || "Gift"}" was rejected. Remarks: ${remarks || "None"}.`;

  await adminClient.from("notifications").insert({
    user_id: userId,
    title,
    message: JSON.stringify({
      module: "/agent/rewards",
      text: messageText
    }),
    is_read: false
  });

  revalidatePath("/admin/mlm/rewards/claims");
  revalidatePath("/agent/rewards");
  return { success: true };
}

// ─── REWARDS REPORTS (ADMIN) ──────────────────────────────────────────────────

export async function getRewardReports(filters: { search?: string; status?: string }) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return [];

  const supabase = createClient();
  let query = supabase
    .from("reward_claims")
    .select("*, profiles!user_id(name, email, promotion_levels(title)), achievement_rules(name, reward_type, reward_value)");

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data: claims, error } = await query;
  if (error || !claims) {
    console.error("Error loading rewards reports:", error?.message);
    return [];
  }

  let results = claims.map((claim: any) => {
    return {
      claimId: claim.id,
      agentName: claim.profiles?.name || "Unknown Agent",
      agentEmail: claim.profiles?.email || "",
      agentRank: claim.profiles?.promotion_levels?.title || "Agent",
      rewardName: claim.achievement_rules?.name || "Gift",
      rewardType: claim.achievement_rules?.reward_type || "Other",
      rewardValue: claim.achievement_rules?.reward_value || "N/A",
      requestDate: claim.request_date,
      approvalDate: claim.approval_date,
      status: claim.status,
      remarks: claim.remarks || ""
    };
  });

  if (filters.search) {
    const queryStr = filters.search.toLowerCase();
    results = results.filter(r => 
      r.agentName.toLowerCase().includes(queryStr) || 
      r.agentEmail.toLowerCase().includes(queryStr) ||
      r.rewardName.toLowerCase().includes(queryStr)
    );
  }

  return results;
}

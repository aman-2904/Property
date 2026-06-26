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

// ─── PROMOTION LEVELS MANAGEMENT (ADMIN) ─────────────────────────────────────

export async function getPromotionLevels() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("promotion_levels")
    .select("*, parent_level:required_prev_promotion_level(level, title)")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching promotion levels:", error);
    return [];
  }
  return data || [];
}

export async function createPromotionLevel(formData: any) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { error: "Unauthorized" };

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("promotion_levels")
    .insert([
      {
        level: formData.level,
        title: formData.title,
        required_direct_sales: formData.required_direct_sales,
        required_group_sales: formData.required_group_sales,
        reward_amount: formData.reward_amount || 0.00,
        personal_sale_incentive: formData.personal_sale_incentive || 0.00,
        display_order: formData.display_order || 0,
        status: formData.status || "active",
        required_prev_promotion_level: formData.required_prev_promotion_level === "none" ? null : formData.required_prev_promotion_level,
        required_prev_promotion_count: formData.required_prev_promotion_count || 0,
        different_legs_required: formData.different_legs_required || false,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating promotion level:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/mlm/promotion-levels");
  return { success: true, data };
}

export async function updatePromotionLevel(level: number, formData: any) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { error: "Unauthorized" };

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("promotion_levels")
    .update({
      title: formData.title,
      required_direct_sales: formData.required_direct_sales,
      required_group_sales: formData.required_group_sales,
      reward_amount: formData.reward_amount || 0.00,
      personal_sale_incentive: formData.personal_sale_incentive || 0.00,
      display_order: formData.display_order || 0,
      status: formData.status || "active",
      required_prev_promotion_level: formData.required_prev_promotion_level === "none" ? null : formData.required_prev_promotion_level,
      required_prev_promotion_count: formData.required_prev_promotion_count || 0,
      different_legs_required: formData.different_legs_required || false,
    })
    .eq("level", level)
    .select()
    .single();

  if (error) {
    console.error("Error updating promotion level:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/mlm/promotion-levels");
  return { success: true, data };
}

export async function deletePromotionLevel(level: number) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { error: "Unauthorized" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("promotion_levels")
    .delete()
    .eq("level", level);

  if (error) {
    console.error("Error deleting promotion level:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/mlm/promotion-levels");
  return { success: true };
}

// ─── PROMOTION HISTORY (ADMIN & AGENTS) ──────────────────────────────────────

export async function getPromotionHistory(searchAgent?: string) {
  const supabase = createClient();
  let query = supabase
    .from("promotions")
    .select("*, profiles!inner(name, email), prev_lvl:previous_promotion_level(title), new_lvl:promotion_level(title)")
    .order("created_at", { ascending: false });

  if (searchAgent) {
    query = query.or(`name.ilike.%${searchAgent}%,email.ilike.%${searchAgent}%`, { foreignTable: "profiles" });
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching promotion history:", error);
    return [];
  }
  return data || [];
}

// ─── AGENT PROMOTION STATUS & WALLET (AGENT PORTAL) ──────────────────────────

export async function getAgentPromotionStatus(userId: string) {
  const adminClient = createAdminClient();
  const supabase = createClient();

  // 1. Get profile details
  const { data: profile, error: profileErr } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (profileErr || !profile) {
    console.error("Error fetching profile:", profileErr);
    return null;
  }

  // 2. Fetch all active levels
  const { data: levels } = await supabase
    .from("promotion_levels")
    .select("*")
    .order("level", { ascending: true });

  const currentLevel = levels?.find(l => l.level === profile.promotion_level) || { level: 0, title: "Agent", personal_sale_incentive: 0.00 };
  const nextLevel = levels?.find(l => l.level > currentLevel.level && l.status === "active");

  let progress = {
    directSales: { current: profile.direct_sales_count || 0, required: 0, percent: 100, completed: true },
    groupSales: { current: profile.group_sales_count || 0, required: 0, percent: 100, completed: true },
    qualification: { current: 0, required: 0, prevRankTitle: "", percent: 100, completed: true },
    differentLegs: { current: 0, required: 0, percent: 100, completed: true },
    remainingRequirements: [] as string[]
  };

  if (nextLevel) {
    const requiredDirect = nextLevel.required_direct_sales;
    const requiredGroup = nextLevel.required_group_sales;
    const currentDirect = profile.direct_sales_count || 0;
    const currentGroup = profile.group_sales_count || 0;

    progress.directSales = {
      current: currentDirect,
      required: requiredDirect,
      percent: requiredDirect > 0 ? Math.min(100, Math.round((currentDirect / requiredDirect) * 100)) : 100,
      completed: currentDirect >= requiredDirect
    };

    progress.groupSales = {
      current: currentGroup,
      required: requiredGroup,
      percent: requiredGroup > 0 ? Math.min(100, Math.round((currentGroup / requiredGroup) * 100)) : 100,
      completed: currentGroup >= requiredGroup
    };

    if (currentDirect < requiredDirect) {
      progress.remainingRequirements.push(`Need ${requiredDirect - currentDirect} Direct Sales`);
    }
    if (currentGroup < requiredGroup) {
      progress.remainingRequirements.push(`Need ${requiredGroup - currentGroup} Group Sales`);
    }

    // Qualification check
    if (nextLevel.required_prev_promotion_level !== null) {
      const prevLvlRecord = levels?.find(l => l.level === nextLevel.required_prev_promotion_level);
      const prevRankTitle = prevLvlRecord?.title || "Manager";
      const requiredCount = nextLevel.required_prev_promotion_count || 0;

      // Fetch downline nodes
      const { data: rawNodes } = await supabase.rpc("get_downline_network", { root_id: userId });
      const downline = rawNodes || [];

      // Qualified count in entire downline (excluding root)
      const qualifiedMembers = downline.filter((d: any) => d.id !== userId && d.promotion_level >= nextLevel.required_prev_promotion_level);
      const currentQualified = qualifiedMembers.length;

      progress.qualification = {
        current: currentQualified,
        required: requiredCount,
        prevRankTitle,
        percent: requiredCount > 0 ? Math.min(100, Math.round((currentQualified / requiredCount) * 100)) : 100,
        completed: currentQualified >= requiredCount
      };

      if (currentQualified < requiredCount) {
        progress.remainingRequirements.push(`Need ${requiredCount - currentQualified} ${prevRankTitle}`);
      }

      // Leg Check
      if (nextLevel.different_legs_required) {
        // Find direct referrals (first level downlines)
        const { data: directs } = await adminClient
          .from("profiles")
          .select("id")
          .eq("upline_id", userId);

        let qualifiedLegsCount = 0;
        if (directs && directs.length > 0) {
          for (const direct of directs) {
            // Check if this direct's downline (including themselves) contains at least one qualified member
            const { data: legNodes } = await supabase.rpc("get_downline_network", { root_id: direct.id });
            const legList = legNodes || [];
            const hasQualifiedInLeg = legList.some((d: any) => d.promotion_level >= nextLevel.required_prev_promotion_level);
            if (hasQualifiedInLeg) {
              qualifiedLegsCount++;
            }
          }
        }

        progress.differentLegs = {
          current: qualifiedLegsCount,
          required: requiredCount,
          percent: requiredCount > 0 ? Math.min(100, Math.round((qualifiedLegsCount / requiredCount) * 100)) : 100,
          completed: qualifiedLegsCount >= requiredCount
        };

        if (qualifiedLegsCount < requiredCount) {
          progress.remainingRequirements.push(`Need ${requiredCount - qualifiedLegsCount} ${prevRankTitle} in different downline legs`);
        }
      }
    }
  }

  // 3. Fetch latest promotion date from history
  const { data: latestHistory } = await supabase
    .from("promotions")
    .select("created_at")
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1);

  const promotionDate = latestHistory && latestHistory.length > 0 ? latestHistory[0].created_at : profile.created_at;

  // 4. Fetch Promotion Wallet
  let wallet = { balance: 0, lifetime_income: 0, monthly_income: 0, pending_income: 0, paid_income: 0, withdrawn_income: 0 };
  const { data: walletData } = await supabase
    .from("promotion_wallet")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (walletData) {
    wallet = {
      balance: Number(walletData.balance),
      lifetime_income: Number(walletData.lifetime_income),
      monthly_income: Number(walletData.monthly_income),
      pending_income: Number(walletData.pending_income),
      paid_income: Number(walletData.paid_income),
      withdrawn_income: Number(walletData.withdrawn_income)
    };
  }

  return {
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      promotion_level: profile.promotion_level,
    },
    currentLevel: {
      title: currentLevel.title,
      personal_sale_incentive: Number(currentLevel.personal_sale_incentive),
      promotionDate
    },
    nextLevel: nextLevel ? {
      title: nextLevel.title,
      personal_sale_incentive: Number(nextLevel.personal_sale_incentive)
    } : null,
    progress,
    wallet
  };
}

export async function getAgentPromotionWallet(userId: string, filters: { dateRange?: string; search?: string } = {}) {
  const supabase = createClient();

  // Get Wallet Details
  const { data: wallet } = await supabase
    .from("promotion_wallet")
    .select("*")
    .eq("user_id", userId)
    .single();

  // Get Wallet History
  let query = supabase
    .from("promotion_wallet_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // Apply filters
  if (filters.search) {
    query = query.or(`customer_name.ilike.%${filters.search}%,property_title.ilike.%${filters.search}%,id.eq.${filters.search}`);
  }

  const now = new Date();
  if (filters.dateRange === "today") {
    const start = new Date(now.setHours(0,0,0,0)).toISOString();
    query = query.gte("created_at", start);
  } else if (filters.dateRange === "week") {
    const start = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();
    query = query.gte("created_at", start);
  } else if (filters.dateRange === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    query = query.gte("created_at", start);
  } else if (filters.dateRange === "year") {
    const start = new Date(now.getFullYear(), 0, 1).toISOString();
    query = query.gte("created_at", start);
  }

  const { data: transactions, error } = await query;
  if (error) {
    console.error("Error fetching transactions:", error);
  }

  // Fetch all promotions received
  const { data: promHistory } = await supabase
    .from("promotions")
    .select("*, prev_lvl:previous_promotion_level(title), new_lvl:promotion_level(title)")
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  // Fetch notifications
  const { data: notifs } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    wallet: wallet ? {
      balance: Number(wallet.balance),
      lifetime_income: Number(wallet.lifetime_income),
      monthly_income: Number(wallet.monthly_income),
      pending_income: Number(wallet.pending_income),
      paid_income: Number(wallet.paid_income),
      withdrawn_income: Number(wallet.withdrawn_income)
    } : { balance: 0, lifetime_income: 0, monthly_income: 0, pending_income: 0, paid_income: 0, withdrawn_income: 0 },
    transactions: (transactions || []).map(t => ({
      ...t,
      per_sale_incentive: Number(t.per_sale_incentive),
      booking_amount: Number(t.booking_amount),
      earned_amount: Number(t.per_sale_incentive) // Per sale incentive is the earned amount
    })),
    promHistory: promHistory || [],
    notifications: notifs || []
  };
}

// ─── ADMIN PROMOTION REPORTS (ADMIN PORTAL) ──────────────────────────────────

export async function getPromotionReports(filters: { promotionLevel?: string; agentSearch?: string; dateRange?: string; status?: string } = {}) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return [];

  const supabase = createClient();
  let query = supabase
    .from("profiles")
    .select("id, name, email, promotion_level, is_active, promotion_wallet(*), promotion_levels!promotion_level(title, personal_sale_incentive)")
    .eq("role", "AGENT");

  if (filters.agentSearch) {
    query = query.or(`name.ilike.%${filters.agentSearch}%,email.ilike.%${filters.agentSearch}%`);
  }

  if (filters.promotionLevel && filters.promotionLevel !== "all") {
    query = query.eq("promotion_level", Number(filters.promotionLevel));
  }

  const { data: agents, error } = await query;
  if (error || !agents) {
    console.error("Error fetching agents reports:", error);
    return [];
  }

  let filtered = agents.map((agent: any) => {
    const wallet = agent.promotion_wallet?.[0] || { balance: 0, lifetime_income: 0, monthly_income: 0, pending_income: 0, paid_income: 0, withdrawn_income: 0 };
    const levelInfo = agent.promotion_levels || { title: "Agent", personal_sale_incentive: 0.00 };

    return {
      agentId: agent.id,
      name: agent.name,
      email: agent.email,
      currentPromotion: levelInfo.title,
      currentIncentive: Number(levelInfo.personal_sale_incentive),
      walletBalance: Number(wallet.balance),
      pendingIncome: Number(wallet.pending_income),
      paidIncome: Number(wallet.paid_income),
      lifetimeIncome: Number(wallet.lifetime_income)
    };
  });

  return filtered;
}

// ─── ADMIN PAYMENT MANAGEMENT (ADMIN PORTAL) ─────────────────────────────────

export async function getPendingPromotionPayments() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("promotion_wallet_transactions")
    .select("*, profiles(name, email)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching pending payments:", error);
    return [];
  }
  return data || [];
}

export async function getPaymentHistory() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("promotion_wallet_transactions")
    .select("*, profiles(name, email)")
    .neq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching payment history:", error);
    return [];
  }
  return data || [];
}

export async function updatePromotionPaymentStatus(transactionId: string, status: "approved" | "rejected" | "paid") {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { error: "Unauthorized" };

  const adminClient = createAdminClient();

  // Fetch transaction details
  const { data: txn, error: txnErr } = await adminClient
    .from("promotion_wallet_transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (txnErr || !txn) {
    return { error: "Transaction not found" };
  }

  const oldStatus = txn.status;
  const incentive = Number(txn.per_sale_incentive);
  const userId = txn.user_id;

  if (oldStatus === status) {
    return { error: `Transaction is already in status '${status}'` };
  }

  // 1. Transaction is transitioning from pending -> approved
  if (oldStatus === "pending" && status === "approved") {
    // Approve payment: updates transaction, updates promotion_wallet, credits main wallets
    const { error: updErr } = await adminClient
      .from("promotion_wallet_transactions")
      .update({ status: "approved" })
      .eq("id", transactionId);

    if (updErr) return { error: updErr.message };

    // Update promotion_wallet: decrease pending, increase balance, lifetime, monthly
    await adminClient.rpc("update_promotion_wallet_on_approval", {
      target_user_id: userId,
      incentive_amount: incentive
    });

    // Update public.wallets (add to main balance & approved_balance)
    await adminClient.rpc("credit_main_wallet", {
      target_user_id: userId,
      credit_amount: incentive
    });

    // Notify agent
    await adminClient.from("notifications").insert({
      user_id: userId,
      title: "Promotion Income Credited",
      message: JSON.stringify({
        module: "/agent/promotions",
        text: `Promotion Income of ₹${incentive.toLocaleString("en-IN")} has been credited to your wallet.`
      }),
      is_read: false
    });
  }
  // 2. Transaction is transitioning from approved -> paid
  else if (oldStatus === "approved" && status === "paid") {
    const { error: updErr } = await adminClient
      .from("promotion_wallet_transactions")
      .update({ status: "paid" })
      .eq("id", transactionId);

    if (updErr) return { error: updErr.message };

    // Update promotion_wallet: move from balance to paid_income & withdrawn_income
    await adminClient.rpc("update_promotion_wallet_on_paid", {
      target_user_id: userId,
      incentive_amount: incentive
    });

    // Notify agent
    await adminClient.from("notifications").insert({
      user_id: userId,
      title: "Payment Released",
      message: JSON.stringify({
        module: "/agent/promotions",
        text: `Payment of ₹${incentive.toLocaleString("en-IN")} has been marked as paid.`
      }),
      is_read: false
    });
  }
  // 3. Transaction is transitioning from pending -> paid directly (combined)
  else if (oldStatus === "pending" && status === "paid") {
    const { error: updErr } = await adminClient
      .from("promotion_wallet_transactions")
      .update({ status: "paid" })
      .eq("id", transactionId);

    if (updErr) return { error: updErr.message };

    // Update promotion_wallet: decrease pending, increase paid_income, withdrawn_income, lifetime, monthly
    await adminClient.rpc("update_promotion_wallet_on_direct_paid", {
      target_user_id: userId,
      incentive_amount: incentive
    });

    // Update public.wallets (credit to main wallet balance)
    await adminClient.rpc("credit_main_wallet", {
      target_user_id: userId,
      credit_amount: incentive
    });

    // Notify agent
    await adminClient.from("notifications").insert({
      user_id: userId,
      title: "Payment Released",
      message: JSON.stringify({
        module: "/agent/promotions",
        text: `Promotion Income of ₹${incentive.toLocaleString("en-IN")} has been released and paid.`
      }),
      is_read: false
    });
  }
  // 4. Transaction is transitioning to rejected
  else if (status === "rejected") {
    const { error: updErr } = await adminClient
      .from("promotion_wallet_transactions")
      .update({ status: "rejected" })
      .eq("id", transactionId);

    if (updErr) return { error: updErr.message };

    // If it was pending, deduct from pending_income in promotion_wallet
    if (oldStatus === "pending") {
      await adminClient.rpc("update_promotion_wallet_on_rejection", {
        target_user_id: userId,
        incentive_amount: incentive
      });
    }
    // If it was already approved/paid, revert all balances
    else if (oldStatus === "approved" || oldStatus === "paid") {
      await adminClient.rpc("revert_promotion_wallet_on_rejection", {
        target_user_id: userId,
        incentive_amount: incentive,
        was_paid: oldStatus === "paid"
      });

      // Revert from main wallets
      await adminClient.rpc("debit_main_wallet", {
        target_user_id: userId,
        debit_amount: incentive
      });
    }

    // Notify agent
    await adminClient.from("notifications").insert({
      user_id: userId,
      title: "Promotion Income Rejected",
      message: JSON.stringify({
        module: "/agent/promotions",
        text: `Promotion Income of ₹${incentive.toLocaleString("en-IN")} has been rejected.`
      }),
      is_read: false
    });
  }

  revalidatePath("/admin/mlm/promotion-payments");
  revalidatePath("/agent/promotions");
  return { success: true };
}

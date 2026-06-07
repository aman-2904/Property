"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/actions/notifications";

// ─── KPI STATS ──────────────────────────────────────────────────────────────

export async function getAdminStats() {
  const supabase = createClient();

  const [
    { count: totalAgents },
    { count: totalProperties },
    { count: totalSales },
    { data: commData },
    { data: withdrawalData },
    { data: revenueData },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "AGENT"),
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .neq("status", "draft"),
    supabase
      .from("sales")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase
      .from("commissions")
      .select("amount")
      .in("status", ["approved", "paid"]),
    supabase
      .from("withdrawals")
      .select("amount")
      .eq("status", "approved"),
    supabase
      .from("sales")
      .select("booking_amount")
      .eq("status", "approved"),
  ]);

  const totalCommissions = commData?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const totalWithdrawals = withdrawalData?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const totalRevenue = revenueData?.reduce((s, r) => s + Number(r.booking_amount), 0) ?? 0;

  return {
    totalAgents: totalAgents ?? 0,
    totalProperties: totalProperties ?? 0,
    totalSales: totalSales ?? 0,
    totalCommissions,
    totalWithdrawals,
    totalRevenue,
  };
}

// ─── MONTHLY SALES TREND (12 months) ────────────────────────────────────────

export async function getMonthlySalesTrend() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sales")
    .select("booking_amount, created_at, status")
    .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  // Group by month
  const map: Record<string, { month: string; volume: number; count: number }> = {};
  for (const row of data) {
    if (row.status !== "approved") continue;
    const d = new Date(row.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
    if (!map[key]) map[key] = { month: label, volume: 0, count: 0 };
    map[key].volume += Number(row.booking_amount);
    map[key].count += 1;
  }

  return Object.values(map);
}

// ─── COMMISSION DISTRIBUTION ─────────────────────────────────────────────────

export async function getCommissionDistribution() {
  const supabase = createClient();

  const statuses = ["pending", "approved", "paid", "rejected", "cancelled"];
  const results = await Promise.all(
    statuses.map(async (s) => {
      const { data } = await supabase
        .from("commissions")
        .select("amount")
        .eq("status", s);
      return {
        status: s,
        amount: data?.reduce((sum, r) => sum + Number(r.amount), 0) ?? 0,
      };
    })
  );

  return results.filter((r) => r.amount > 0);
}

// ─── PROMOTION LEVEL DISTRIBUTION ────────────────────────────────────────────

export async function getPromotionDistribution() {
  const supabase = createClient();

  const { data: levels } = await supabase
    .from("promotion_levels")
    .select("level, title")
    .order("level", { ascending: true });

  if (!levels) return [];

  const results = await Promise.all(
    levels.map(async (lvl) => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "AGENT")
        .eq("promotion_level", lvl.level);
      return { level: lvl.title, count: count ?? 0 };
    })
  );

  return results;
}

// ─── AGENT GROWTH TREND (12 months) ─────────────────────────────────────────

export async function getAgentGrowthTrend() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("role", "AGENT")
    .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  const map: Record<string, { month: string; newAgents: number; total: number }> = {};
  let running = 0;

  for (const row of data) {
    const d = new Date(row.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
    if (!map[key]) map[key] = { month: label, newAgents: 0, total: 0 };
    map[key].newAgents += 1;
    running += 1;
    map[key].total = running;
  }

  return Object.values(map);
}

// ─── VISIT TRENDS (12 months) ────────────────────────────────────────────────

export async function getVisitTrends() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("visits")
    .select("visit_mode, created_at")
    .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  const map: Record<string, { month: string; physical: number; virtual: number }> = {};
  for (const row of data) {
    const d = new Date(row.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
    if (!map[key]) map[key] = { month: label, physical: 0, virtual: 0 };
    if (row.visit_mode === "physical") map[key].physical += 1;
    else map[key].virtual += 1;
  }

  return Object.values(map);
}

// ─── RECENT TABLES ───────────────────────────────────────────────────────────

export async function getRecentSales(limit = 10) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*, properties(title), profiles:seller_id(name, email)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data || [];
}

export async function getRecentWithdrawals(limit = 10) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("withdrawals")
    .select("*, profiles:user_id(name, email)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data || [];
}

export async function getRecentCommissions(limit = 10) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("commissions")
    .select("*, profiles:recipient_id(name, email), sales(booking_amount, sale_amount, properties(title))")
    .order("approved_at", { ascending: false, nullsFirst: false })
    .order("rowid", { ascending: false, referencedTable: undefined } as any)
    .limit(limit);

  // Fallback if ordering fails
  if (error) {
    const { data: fallback } = await supabase
      .from("commissions")
      .select("*, profiles:recipient_id(name, email), sales(booking_amount, sale_amount, properties(title))")
      .limit(limit);
    return fallback || [];
  }
  return data || [];
}

export async function getCommissionsWithDetails() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("commissions")
    .select("*, profiles:recipient_id(name, email), sales(booking_amount, sale_amount, properties(title))")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching commissions with details:", error);
    return [];
  }
  return data || [];
}

export async function getActivityLogs(limit = 30) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*, profiles:actor_id(name, email, avatar)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data || [];
}

// ─── ROLE MANAGEMENT ─────────────────────────────────────────────────────────

export async function updateAgentRole(agentId: string, role: "AGENT" | "ADMIN") {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthenticated" };

  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!caller || caller.role !== "SUPER_ADMIN") {
    return { error: "Only SUPER_ADMIN can change roles." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", agentId);

  if (error) return { error: error.message };
  revalidatePath("/admin/agents");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function toggleAgentActive(agentId: string, isActive: boolean) {
  const supabase = createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", agentId);

  if (error) return { error: error.message };
  revalidatePath("/admin/agents");
  return { success: true };
}

export async function updateCommissionStatus(
  commissionId: string,
  status: "approved" | "rejected"
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthenticated" };
  }

  const updateData: any = {
    status,
    approved_by: user.id,
    approved_at: new Date().toISOString(),
  };

  const { data: commInfo, error } = await supabase
    .from("commissions")
    .update(updateData)
    .eq("id", commissionId)
    .select("recipient_id, amount")
    .single();

  if (error || !commInfo) {
    return { error: error?.message || "Failed to update commission status" };
  }

  // Trigger agent notification
  try {
    await createNotification(
      commInfo.recipient_id,
      `Commission ${status === "approved" ? "Approved" : "Rejected"}`,
      `Your commission of ₹${Number(commInfo.amount).toLocaleString()} has been ${status}.`,
      "/agent/commissions"
    );
  } catch (err) {
    console.error("Error creating commission notification:", err);
  }

  revalidatePath("/admin/dashboard");
  return { success: true };
}


// ─── GLOBAL SEARCH ───────────────────────────────────────────────────────────

export async function globalSearch(query: string) {
  if (!query || query.length < 2) return { sales: [], agents: [], properties: [] };
  const supabase = createClient();
  const q = `%${query}%`;

  const [{ data: sales }, { data: agents }, { data: properties }] = await Promise.all([
    supabase
      .from("sales")
      .select("id, buyer_name, sale_amount, status, created_at, properties(title), profiles:seller_id(name)")
      .or(`buyer_name.ilike.${q}`)
      .limit(5),
    supabase
      .from("profiles")
      .select("id, name, email, role, promotion_level, is_active")
      .or(`name.ilike.${q},email.ilike.${q}`)
      .eq("role", "AGENT")
      .limit(5),
    supabase
      .from("properties")
      .select("id, title, location, price, status")
      .or(`title.ilike.${q},location.ilike.${q}`)
      .limit(5),
  ]);

  return {
    sales: sales || [],
    agents: agents || [],
    properties: properties || [],
  };
}

export async function updatePaymentStatus(
  paymentId: string,
  status: "approved" | "rejected"
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthenticated" };
  }

  const { data: payment, error } = await supabase
    .from("sale_payments")
    .update({
      status,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .select("amount, sale_id, sales(seller_id, properties(title))")
    .single();

  if (error || !payment) {
    return { error: error?.message || "Failed to update payment status" };
  }

  // Trigger agent notification
  try {
    const sellerId = (payment.sales as any)?.seller_id;
    const propertyTitle = (payment.sales as any)?.properties?.title || "a property";
    if (sellerId) {
      await createNotification(
        sellerId,
        `Payment ${status === "approved" ? "Approved" : "Rejected"}`,
        `Your payment of ₹${Number(payment.amount).toLocaleString()} for "${propertyTitle}" has been ${status}.`,
        "/agent/sales"
      );
    }
  } catch (err) {
    console.error("Error sending additional payment approval notification:", err);
  }

  if (status === "approved") {
    // If approving a payment, the parent sale must be set to approved too
    await supabase
      .from("sales")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", payment.sale_id);
  } else if (status === "rejected") {
    // Check if there are any other approved payments for this sale
    const { data: approvedPayments } = await supabase
      .from("sale_payments")
      .select("id")
      .eq("sale_id", payment.sale_id)
      .eq("status", "approved");

    if (!approvedPayments || approvedPayments.length === 0) {
      // No approved payments left for this sale, reject the parent sale too
      await supabase
        .from("sales")
        .update({
          status: "rejected",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", payment.sale_id);
    }
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/sales");
  revalidatePath("/agent/dashboard");
  revalidatePath("/agent/sales");
  revalidatePath(`/agent/sales/${payment.sale_id}`);
  return { success: true };
}

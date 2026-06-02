"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitSale(formData: {
  propertyId: string;
  buyerName: string;
  buyerPhone?: string;
  salePrice: number;
  documentUrl?: string;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthenticated" };
  }

  const { error } = await supabase.from("sales").insert([
    {
      property_id: formData.propertyId,
      seller_id: user.id,
      buyer_name: formData.buyerName,
      buyer_phone: formData.buyerPhone || "N/A",
      sale_amount: formData.salePrice,
      status: "pending_approval",
    },
  ]);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/agent/properties");
  revalidatePath("/agent/dashboard");
  return { success: true };
}

export async function getAgentSales(agentId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*, properties(title, image_urls)")
    .eq("seller_id", agentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching agent sales:", error);
    return [];
  }
  return data || [];
}

export async function getSalesWithDetails() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*, properties(title), profiles:seller_id(name, email)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching sales with details:", error);
    return [];
  }
  return data || [];
}

export async function updateSaleStatus(
  saleId: string,
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
  };

  updateData.approved_by = user.id;
  updateData.approved_at = new Date().toISOString();

  const { error } = await supabase
    .from("sales")
    .update(updateData)
    .eq("id", saleId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/agent/dashboard");
  return { success: true };
}

/**
 * Returns a summary of an agent's sales for the Sales Management dashboard.
 * Includes counts by status and commission totals.
 */
export async function getAgentSalesSummary(agentId: string) {
  const supabase = createClient();

  const { data: sales, error: salesError } = await supabase
    .from("sales")
    .select("id, status, sale_amount")
    .eq("seller_id", agentId);

  if (salesError || !sales) {
    console.error("Error fetching agent sales summary:", salesError);
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      totalCommission: 0,
      pendingCommission: 0,
    };
  }

  const total = sales.length;
  const pending = sales.filter((s) => s.status === "pending_approval").length;
  const approved = sales.filter((s) => s.status === "approved").length;
  const rejected = sales.filter((s) => s.status === "rejected").length;

  // Fetch commissions for this agent
  const { data: commissions, error: commError } = await supabase
    .from("commissions")
    .select("amount, status")
    .eq("recipient_id", agentId);

  if (commError) {
    console.error("Error fetching agent commissions:", commError);
  }

  const totalCommission = commissions
    ? commissions.reduce((sum, c) => sum + Number(c.amount), 0)
    : 0;
  const pendingCommission = commissions
    ? commissions
        .filter((c) => c.status === "pending")
        .reduce((sum, c) => sum + Number(c.amount), 0)
    : 0;

  return { total, pending, approved, rejected, totalCommission, pendingCommission };
}

/**
 * Fetches a single sale by ID, verifying it belongs to the requesting agent.
 * Returns property details and associated commissions for the detail view.
 */
export async function getAgentSaleById(saleId: string, agentId: string) {
  const supabase = createClient();

  const { data: sale, error } = await supabase
    .from("sales")
    .select(
      `*,
      properties(id, title, location, price, image_urls, status),
      commissions(id, amount, status, level, created_at)`
    )
    .eq("id", saleId)
    .eq("seller_id", agentId)
    .single();

  if (error || !sale) {
    console.error("Error fetching agent sale by ID:", error);
    return null;
  }

  return sale;
}

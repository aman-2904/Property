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

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createAdminNotifications, createNotification } from "@/lib/actions/notifications";

export async function submitSale(formData: {
  propertyId: string;
  buyerName: string;
  buyerPhone?: string;
  salePrice: number;
  bookingAmount: number;
  documentUrl?: string;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthenticated" };
  }

  // Validate booking amount
  if (formData.bookingAmount === undefined || formData.bookingAmount === null || isNaN(formData.bookingAmount) || formData.bookingAmount <= 0) {
    return { error: "Please enter a valid booking amount greater than 0." };
  }

  // Fetch property details to retrieve the admin-defined price
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("price")
    .eq("id", formData.propertyId)
    .single();

  if (propertyError || !property) {
    return { error: "Property not found or invalid property ID." };
  }

  // Enforce booking amount not exceeding sale price
  if (formData.bookingAmount > property.price) {
    return { error: "Booking amount cannot exceed the sale price." };
  }

  // 1. Insert overall sale transaction
  const { data: saleData, error: saleError } = await supabase
    .from("sales")
    .insert([
      {
        property_id: formData.propertyId,
        seller_id: user.id,
        buyer_name: formData.buyerName,
        buyer_phone: formData.buyerPhone || "N/A",
        sale_amount: property.price, // enforce admin price for reference
        booking_amount: formData.bookingAmount, // initial reference
        status: "pending_approval",
      },
    ])
    .select("id")
    .single();

  if (saleError || !saleData) {
    return { error: saleError?.message || "Failed to submit sale record" };
  }

  // 2. Insert initial booking payment record
  const { error: paymentError } = await supabase
    .from("sale_payments")
    .insert([
      {
        sale_id: saleData.id,
        amount: formData.bookingAmount,
        status: "pending_approval",
      },
    ]);

  if (paymentError) {
    // Clean up parent sale record to maintain data integrity
    await supabase.from("sales").delete().eq("id", saleData.id);
    return { error: paymentError.message };
  }

  revalidatePath("/agent/properties");
  revalidatePath("/agent/dashboard");
  revalidatePath("/agent/sales");

  // Trigger admin notification
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();
    const agentName = profile?.name || "An agent";
    await createAdminNotifications(
      "New Sale Submitted",
      `${agentName} has submitted a new sale request for approval.`,
      "/admin/sales"
    );
  } catch (err) {
    console.error("Error creating sale notification:", err);
  }

  return { success: true };
}

export async function getAgentSales(agentId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*, properties(title, image_urls), commissions(amount, status, recipient_id), sale_payments(*)")
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
    .select("*, properties(title), profiles:seller_id(name, email), sale_payments(*)")
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

  // Update sale status
  const updateData: any = {
    status,
    approved_by: user.id,
    approved_at: new Date().toISOString(),
  };

  const { data: saleInfo, error } = await supabase
    .from("sales")
    .update(updateData)
    .eq("id", saleId)
    .select("seller_id, properties(title)")
    .single();

  if (error || !saleInfo) {
    return { error: error?.message || "Failed to update sale status" };
  }

  // Trigger notifications
  try {
    const propertyTitle = (saleInfo.properties as any)?.title || "a property";
    // Notify agent
    await createNotification(
      saleInfo.seller_id,
      `Sale ${status === "approved" ? "Approved" : "Rejected"}`,
      `Your sale request for "${propertyTitle}" has been ${status}.`,
      "/agent/sales"
    );

    if (status === "approved") {
      // Notify admins that new pending commissions are generated and need approval
      await createAdminNotifications(
        "Commissions Pending Review",
        "New commissions have been generated and are pending approval.",
        "/admin/commissions"
      );
    }
  } catch (err) {
    console.error("Error sending sale status update notifications:", err);
  }

  // Sync with sale_payments: Find payments and set their status accordingly
  const { data: payments } = await supabase
    .from("sale_payments")
    .select("id, status, created_at")
    .eq("sale_id", saleId);

  if (payments && payments.length > 0) {
    let paymentIdsToUpdate: string[] = [];
    if (status === "rejected") {
      paymentIdsToUpdate = payments.filter((p: any) => p.status !== "rejected").map((p: any) => p.id);
    } else {
      // Approve pending payments
      paymentIdsToUpdate = payments.filter((p: any) => p.status === "pending_approval").map((p: any) => p.id);
      
      // If there are no approved payments at all, approve the first payment (booking payment)
      const hasApproved = payments.some((p: any) => p.status === "approved");
      if (!hasApproved) {
        // Find the oldest payment (booking payment)
        const sorted = [...payments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        if (sorted.length > 0 && !paymentIdsToUpdate.includes(sorted[0].id)) {
          paymentIdsToUpdate.push(sorted[0].id);
        }
      }
    }

    if (paymentIdsToUpdate.length > 0) {
      await supabase
        .from("sale_payments")
        .update({
          status: status,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .in("id", paymentIdsToUpdate);
    }
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/sales");
  revalidatePath("/agent/dashboard");
  revalidatePath("/agent/sales");
  revalidatePath(`/agent/sales/${saleId}`);
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
    .select("id, status, sale_amount, booking_amount")
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
      commissions(id, amount, status, level, created_at),
      sale_payments(*)`
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

export async function submitAdditionalPayment(saleId: string, amount: number) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthenticated" };
  }

  if (amount === undefined || amount === null || isNaN(amount) || amount <= 0) {
    return { error: "Please enter a valid payment amount greater than 0." };
  }

  // Fetch parent sale and its payments
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select("*, properties(price), sale_payments(amount, status)")
    .eq("id", saleId)
    .single();

  if (saleError || !sale) {
    return { error: "Sale record not found." };
  }

  // Calculate total paid (approved) and remaining balance
  const payments = sale.sale_payments || [];
  const totalPaid = payments
    .filter((p: any) => p.status === "approved")
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  
  const remainingBalance = Number(sale.sale_amount) - totalPaid;

  if (amount > remainingBalance) {
    return { error: `Payment amount exceeds the remaining balance of ₹${remainingBalance.toLocaleString()}.` };
  }

  // Insert additional payment record
  const { error: paymentError } = await supabase
    .from("sale_payments")
    .insert([
      {
        sale_id: saleId,
        amount: amount,
        status: "pending_approval",
      },
    ]);

  if (paymentError) {
    return { error: paymentError.message };
  }

  revalidatePath("/agent/sales");
  revalidatePath(`/agent/sales/${saleId}`);

  // Trigger admin notification
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();
    const agentName = profile?.name || "An agent";
    await createAdminNotifications(
      "Additional Payment Submitted",
      `${agentName} has submitted an additional payment for approval.`,
      "/admin/sales"
    );
  } catch (err) {
    console.error("Error creating additional payment notification:", err);
  }

  return { success: true };
}

/**
 * Fetches all commissions distributed to a specific agent.
 * Includes related sale price/booking amount and property title details.
 * Uses admin client to bypass RLS so that upline override commissions
 * (where the sale was made by a different agent) can still resolve
 * the property name via the sales → properties join.
 */
export async function getAgentCommissions(agentId: string) {
  const { createAdminClient } = await import("@/lib/supabase/server");
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("commissions")
    .select("*, sales(booking_amount, sale_amount, properties(title))")
    .eq("recipient_id", agentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching agent commissions:", error);
    return [];
  }
  return data || [];
}

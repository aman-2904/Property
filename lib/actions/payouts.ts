"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getPayouts(agentId?: string) {
  const supabase = createClient();
  let query = supabase
    .from("withdrawals")
    .select("*, profiles:user_id(name, email)")
    .order("created_at", { ascending: false });

  if (agentId) {
    query = query.eq("user_id", agentId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching withdrawals:", error);
    return [];
  }
  return data || [];
}

export async function getAgentBalance(agentId: string) {
  const supabase = createClient();

  // 1. Fetch wallet directly (synced automatically by database triggers)
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", agentId)
    .single();

  if (walletError || !wallet) {
    console.error("Error fetching wallet for balance:", walletError);
    return { totalEarned: 0, balance: 0, pendingHold: 0, paid: 0 };
  }

  // 2. Fetch total approved withdrawals to show paid amount
  const { data: withdrawalData, error: withdrawalError } = await supabase
    .from("withdrawals")
    .select("amount")
    .eq("user_id", agentId)
    .eq("status", "approved");

  if (withdrawalError) {
    console.error("Error fetching approved withdrawals:", withdrawalError);
  }

  const paid = withdrawalData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

  // 3. Fetch total pending withdrawals (held balance)
  const { data: pendingWithdrawalData } = await supabase
    .from("withdrawals")
    .select("amount")
    .eq("user_id", agentId)
    .eq("status", "pending");

  const pendingHold = pendingWithdrawalData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

  return {
    totalEarned: Number(wallet.approved_balance),
    balance: Number(wallet.balance),
    pendingHold,
    paid,
  };
}

export async function requestPayout(formData: {
  amount: number;
  paymentMethod?: string;
}) {
  const supabase = createClient();
  const adminSupabase = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthenticated" };

  // 1. Validate bank details are present on profile using admin client to bypass RLS recursion
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("bank_name, account_number, ifsc_code")
    .eq("id", user.id)
    .single();


  if (!profile || !profile.bank_name || !profile.account_number || !profile.ifsc_code) {
    return { error: "Bank details (Bank Name, Account Number, and IFSC Code) are mandatory for withdrawals. Please update them in Settings." };
  }

  // 2. Validate balance
  const { balance } = await getAgentBalance(user.id);
  if (formData.amount > balance) {
    return { error: "Requested amount exceeds your current available balance." };
  }

  const { error } = await supabase.from("withdrawals").insert([
    {
      user_id: user.id,
      amount: formData.amount,
      status: "pending",
    },
  ]);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/agent/payouts");
  revalidatePath("/agent/dashboard");
  return { success: true };
}

export async function updatePayoutStatus(formData: {
  payoutId: string;
  status: "approved" | "rejected";
  remarks?: string;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthenticated" };

  const updateData: any = {
    status: formData.status,
    processed_by: user.id,
    processed_at: new Date().toISOString(),
    remarks: formData.remarks || null,
  };

  const { error } = await supabase
    .from("withdrawals")
    .update(updateData)
    .eq("id", formData.payoutId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/payouts");
  revalidatePath("/admin/dashboard");
  revalidatePath("/agent/payouts");
  return { success: true };
}

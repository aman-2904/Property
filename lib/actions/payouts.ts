"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getPayouts(agentId?: string) {
  const supabase = createClient();
  let query = supabase
    .from("withdrawals")
    .select("*, profiles:user_id(name, email, account_holder_name, bank_name, account_number, ifsc_code)")
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

  // Fetch wallet, approved withdrawals, and pending withdrawals in parallel
  const [walletResult, withdrawalsResult, pendingResult] = await Promise.all([
    supabase
      .from("wallets")
      .select("*")
      .eq("user_id", agentId)
      .single(),
    supabase
      .from("withdrawals")
      .select("amount")
      .eq("user_id", agentId)
      .eq("status", "approved"),
    supabase
      .from("withdrawals")
      .select("amount")
      .eq("user_id", agentId)
      .eq("status", "pending"),
  ]);

  const wallet = walletResult.data;
  const walletError = walletResult.error;
  const withdrawalData = withdrawalsResult.data;
  const pendingWithdrawalData = pendingResult.data;

  if (walletError || !wallet) {
    console.error("Error fetching wallet for balance:", walletError);
    return { totalEarned: 0, balance: 0, pendingHold: 0, paid: 0 };
  }

  const paid = withdrawalData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
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
  bankAccountId: string;
}) {
  const supabase = createClient();
  const adminSupabase = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthenticated" };

  // 1. Fetch bank account details from profiles.bank_accounts
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("bank_accounts, bank_name, account_number, ifsc_code, account_holder_name")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profile not found" };

  let accounts: any[] = Array.isArray(profile.bank_accounts) ? profile.bank_accounts : [];
  
  // Migration helper: if empty but legacy columns are set
  if (accounts.length === 0 && profile.bank_name && profile.account_number) {
    accounts.push({
      id: "legacy",
      account_holder_name: profile.account_holder_name || "",
      bank_name: profile.bank_name,
      account_number: profile.account_number,
      ifsc_code: profile.ifsc_code,
      is_default: true
    });
  }

  const selectedAccount = accounts.find(a => a.id === formData.bankAccountId);
  if (!selectedAccount) {
    return { error: "Selected bank account was not found. Please select a valid bank account." };
  }

  // Validate fields in selected account
  if (!selectedAccount.account_holder_name || !selectedAccount.bank_name || !selectedAccount.account_number || !selectedAccount.ifsc_code) {
    return { error: "The selected bank account is incomplete. Please edit and complete its details." };
  }

  // 2. Validate balance
  const { balance } = await getAgentBalance(user.id);
  if (formData.amount > balance) {
    return { error: "Requested amount exceeds your current available balance." };
  }

  // 3. Insert withdrawal with snapshot in bank_details
  const { error } = await supabase.from("withdrawals").insert([
    {
      user_id: user.id,
      amount: formData.amount,
      status: "pending",
      method: "Bank Transfer",
      bank_details: {
        account_holder_name: selectedAccount.account_holder_name,
        bank_name: selectedAccount.bank_name,
        account_number: selectedAccount.account_number,
        ifsc_code: selectedAccount.ifsc_code,
      }
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
    hash: formData.remarks || null,
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

export async function saveBankAccount(formData: {
  id?: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthenticated" };

  // Fetch current profile to get bank_accounts
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("bank_accounts, bank_name, account_number, ifsc_code, account_holder_name, name")
    .eq("id", user.id)
    .single();

  if (fetchError || !profile) {
    return { error: fetchError?.message || "Profile not found" };
  }

  let accounts: any[] = Array.isArray(profile.bank_accounts) ? [...profile.bank_accounts] : [];

  // Migration helper
  if (accounts.length === 0 && profile.bank_name && profile.account_number) {
    accounts.push({
      id: "legacy",
      account_holder_name: profile.account_holder_name || profile.name || "",
      bank_name: profile.bank_name,
      account_number: profile.account_number,
      ifsc_code: profile.ifsc_code,
      is_default: true
    });
  }

  const accountId = formData.id || Math.random().toString(36).substring(2, 9);
  const isDefault = accounts.length === 0;

  const newAccount = {
    id: accountId,
    account_holder_name: formData.accountHolderName.trim(),
    bank_name: formData.bankName.trim(),
    account_number: formData.accountNumber.trim(),
    ifsc_code: formData.ifscCode.trim(),
    is_default: formData.id ? (accounts.find(a => a.id === formData.id)?.is_default ?? isDefault) : isDefault
  };

  if (formData.id) {
    accounts = accounts.map(a => a.id === formData.id ? { ...a, ...newAccount } : a);
  } else {
    accounts.push(newAccount);
  }

  const defaultAccount = accounts.find(a => a.is_default) || accounts[0] || newAccount;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      bank_accounts: accounts,
      account_holder_name: defaultAccount.account_holder_name,
      bank_name: defaultAccount.bank_name,
      account_number: defaultAccount.account_number,
      ifsc_code: defaultAccount.ifsc_code,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/agent/payouts");
  return { success: true };
}

export async function deleteBankAccount(accountId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthenticated" };

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("bank_accounts")
    .eq("id", user.id)
    .single();

  if (fetchError || !profile) {
    return { error: fetchError?.message || "Profile not found" };
  }

  let accounts: any[] = Array.isArray(profile.bank_accounts) ? [...profile.bank_accounts] : [];
  const accountToDelete = accounts.find(a => a.id === accountId);
  const wasDefault = accountToDelete?.is_default;

  accounts = accounts.filter(a => a.id !== accountId);

  if (wasDefault && accounts.length > 0) {
    accounts[0].is_default = true;
  }

  const defaultAccount = accounts.find(a => a.is_default) || accounts[0] || null;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      bank_accounts: accounts,
      account_holder_name: defaultAccount ? defaultAccount.account_holder_name : null,
      bank_name: defaultAccount ? defaultAccount.bank_name : null,
      account_number: defaultAccount ? defaultAccount.account_number : null,
      ifsc_code: defaultAccount ? defaultAccount.ifsc_code : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/agent/payouts");
  return { success: true };
}

export async function setDefaultBankAccount(accountId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthenticated" };

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("bank_accounts")
    .eq("id", user.id)
    .single();

  if (fetchError || !profile) {
    return { error: fetchError?.message || "Profile not found" };
  }

  let accounts: any[] = Array.isArray(profile.bank_accounts) ? [...profile.bank_accounts] : [];
  accounts = accounts.map(a => ({
    ...a,
    is_default: a.id === accountId
  }));

  const defaultAccount = accounts.find(a => a.is_default);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      bank_accounts: accounts,
      account_holder_name: defaultAccount ? defaultAccount.account_holder_name : null,
      bank_name: defaultAccount ? defaultAccount.bank_name : null,
      account_number: defaultAccount ? defaultAccount.account_number : null,
      ifsc_code: defaultAccount ? defaultAccount.ifsc_code : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/agent/payouts");
  return { success: true };
}

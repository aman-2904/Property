import * as React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAgentBalance, getPayouts } from "@/lib/actions/payouts";
import { AgentPayoutsClient } from "@/components/dashboard/agent-payouts-client";

export default async function AgentPayoutsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch profile to check bank details
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_holder_name, bank_name, account_number, ifsc_code, bank_accounts, name")
    .eq("id", user.id)
    .single();

  let bankAccounts: any[] = Array.isArray(profile?.bank_accounts) ? profile.bank_accounts : [];

  if (bankAccounts.length === 0 && profile?.bank_name && profile?.account_number) {
    bankAccounts.push({
      id: "legacy",
      account_holder_name: profile.account_holder_name || profile.name || "",
      bank_name: profile.bank_name,
      account_number: profile.account_number,
      ifsc_code: profile.ifsc_code,
      is_default: true
    });
  }

  const hasBankDetails = bankAccounts.length > 0;

  // 2. Fetch balance metrics
  const { totalEarned, balance, paid, pendingHold } = await getAgentBalance(user.id);

  // 3. Fetch withdrawal requests
  const payouts = await getPayouts(user.id);

  return (
    <AgentPayoutsClient
      balance={balance}
      pendingHold={pendingHold ?? 0}
      paid={paid}
      totalEarned={totalEarned}
      hasBankDetails={hasBankDetails}
      bankAccounts={bankAccounts}
      payouts={payouts as any[]}
    />
  );
}

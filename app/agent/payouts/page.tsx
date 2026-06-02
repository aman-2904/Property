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
    .select("bank_name, account_number, ifsc_code")
    .eq("id", user.id)
    .single();

  const hasBankDetails = !!(
    profile?.bank_name &&
    profile?.account_number &&
    profile?.ifsc_code
  );

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
      payouts={payouts as any[]}
    />
  );
}

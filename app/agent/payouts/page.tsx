import * as React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAgentBalance, getPayouts } from "@/lib/actions/payouts";
import { PayoutForm } from "@/components/forms/payout-form";
import { StatsCard } from "@/components/dashboard/stats-card";
import { DataTable } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Wallet, Coins, ArrowUpRight } from "lucide-react";

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

  const columns = [
    {
      header: "Request Date",
      accessorKey: "created_at",
      render: (row: any) => (
        <span>{new Date(row.created_at).toLocaleDateString()}</span>
      ),
    },
    {
      header: "Amount",
      accessorKey: "amount",
      render: (row: any) => (
        <span className="font-bold text-foreground">
          ${Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: "Method",
      accessorKey: "payment_method",
    },
    {
      header: "Status",
      accessorKey: "status",
      render: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      header: "Tx Hash / Reference",
      accessorKey: "transaction_hash",
      render: (row: any) => (
        <span className="font-mono text-xs text-muted-foreground break-all">
          {row.transaction_hash || "Processing..."}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Payouts & Wallet
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor your earnings ledger and request commission cashouts.
        </p>
      </div>

      {/* Mini Stats Card Summary */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatsCard
          title="Withdrawable Balance"
          value={`$${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<Wallet className="h-5 w-5" />}
          description="Available for immediate withdrawal"
        />
        <StatsCard
          title="Pending Cashouts"
          value={`$${(pendingHold ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<ArrowUpRight className="h-5 w-5" />}
          description="Awaiting admin processing"
        />
        <StatsCard
          title="Total Withdrawn"
          value={`$${paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<Coins className="h-5 w-5" />}
          description={`Accumulated earnings: $${totalEarned.toLocaleString()}`}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Side: Submit payout */}
        <div className="lg:col-span-1 p-6 rounded-3xl border border-border/40 glass-premium h-fit">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-foreground">
              Request Withdrawal
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Submit a request to transfer commissions to your account
            </p>
          </div>
          <PayoutForm balance={balance} hasBankDetails={hasBankDetails} />
        </div>

        {/* Right Side: Ledger history */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Withdrawal Transaction History
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              History of withdrawal requests and status records
            </p>
          </div>
          <DataTable
            columns={columns}
            data={payouts as any[]}
            emptyTitle="No payout records"
            emptyDescription="You haven't requested any payouts yet. Once you accumulate $10.00 in commissions, you can submit withdrawal requests."
          />
        </div>
      </div>
    </div>
  );
}

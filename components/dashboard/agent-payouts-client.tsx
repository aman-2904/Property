"use client";

import * as React from "react";
import { PayoutForm } from "@/components/forms/payout-form";
import { BankDetailsForm } from "@/components/forms/bank-details-form";
import { StatsCard } from "@/components/dashboard/stats-card";
import { DataTable } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Wallet, Coins, ArrowUpRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-states";


interface AgentPayoutsClientProps {
  balance: number;
  pendingHold: number;
  paid: number;
  totalEarned: number;
  hasBankDetails: boolean;
  payouts: any[];
}

export function AgentPayoutsClient({
  balance,
  pendingHold,
  paid,
  totalEarned,
  hasBankDetails,
  payouts,
}: AgentPayoutsClientProps) {
  const [isEditingBank, setIsEditingBank] = React.useState(!hasBankDetails);

  React.useEffect(() => {
    setIsEditingBank(!hasBankDetails);
  }, [hasBankDetails]);

  const columns = [
    {
      header: "Request Date",
      accessorKey: "created_at",
      render: (row: any) => (
        <span suppressHydrationWarning>{new Date(row.created_at).toLocaleDateString()}</span>
      ),
    },
    {
      header: "Amount",
      accessorKey: "amount",
      render: (row: any) => (
        <span className="font-bold text-foreground">
          ₹{Number(row.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: "Method",
      accessorKey: "method",
    },
    {
      header: "Status",
      accessorKey: "status",
      render: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      header: "Tx Hash / Reference",
      accessorKey: "hash",
      render: (row: any) => (
        <span className="font-mono text-xs text-muted-foreground break-all">
          {row.hash || "Processing..."}
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
          value={`₹${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          icon={<Wallet className="h-5 w-5" />}
          description="Available for immediate withdrawal"
        />
        <StatsCard
          title="Pending Cashouts"
          value={`₹${(pendingHold ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          icon={<ArrowUpRight className="h-5 w-5" />}
          description="Awaiting admin processing"
        />
        <StatsCard
          title="Total Withdrawn"
          value={`₹${paid.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          icon={<Coins className="h-5 w-5" />}
          description={`Accumulated earnings: ₹${totalEarned.toLocaleString("en-US")}`}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Side: Submit payout */}
        <div className="lg:col-span-1 p-6 rounded-3xl border border-border/40 bg-card text-foreground shadow-lg h-fit">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {isEditingBank ? "Bank Account Details" : "Request Withdrawal"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEditingBank 
                  ? "Configure where your cashouts are sent" 
                  : "Submit a request to transfer commissions"}
              </p>
            </div>
            {hasBankDetails && (
              <button
                onClick={() => setIsEditingBank(!isEditingBank)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {isEditingBank ? "Back to Payout" : "Edit Bank"}
              </button>
            )}
          </div>
          
          {isEditingBank ? (
            <BankDetailsForm onSuccessCallback={() => setIsEditingBank(false)} />
          ) : (
            <PayoutForm balance={balance} hasBankDetails={hasBankDetails} />
          )}
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
          {payouts.length === 0 ? (
            <EmptyState
              title="No payout records"
              description="You haven't requested any payouts yet. Once you accumulate ₹10.00 in commissions, you can submit withdrawal requests."
            />
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  columns={columns}
                  data={payouts}
                  emptyTitle="No payout records"
                  emptyDescription="You haven't requested any payouts yet. Once you accumulate ₹10.00 in commissions, you can submit withdrawal requests."
                />
              </div>

              <div className="block md:hidden space-y-4">
                {payouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="p-5 rounded-2xl border border-border/40 bg-zinc-950/20 glass-premium space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Amount</span>
                        <span className="font-bold text-foreground text-base">
                          ₹{Number(payout.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <StatusBadge status={payout.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs border-t border-border/20 pt-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[9px] uppercase tracking-wider font-semibold">Request Date</span>
                        <span className="text-foreground/80 font-medium" suppressHydrationWarning>
                          {new Date(payout.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[9px] uppercase tracking-wider font-semibold">Method</span>
                        <span className="text-foreground/80 font-medium">{payout.method}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5 border-t border-border/20 pt-3">
                      <span className="text-muted-foreground text-[9px] uppercase tracking-wider font-semibold">Tx Hash / Reference</span>
                      <span className="font-mono text-[10px] text-muted-foreground break-all">
                        {payout.hash || "Processing..."}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

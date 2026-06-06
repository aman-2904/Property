"use client";

import * as React from "react";
import { PayoutForm } from "@/components/forms/payout-form";
import { BankDetailsForm } from "@/components/forms/bank-details-form";
import { StatsCard } from "@/components/dashboard/stats-card";
import { DataTable } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Wallet, Coins, ArrowUpRight, Landmark, AlertCircle, Trash2, CheckCircle2, Plus, Edit, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-states";
import { Modal, ModalPortal, ModalOverlay, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal-system";
import { deleteBankAccount, setDefaultBankAccount } from "@/lib/actions/payouts";
import { cn } from "@/lib/utils";



interface AgentPayoutsClientProps {
  balance: number;
  pendingHold: number;
  paid: number;
  totalEarned: number;
  hasBankDetails: boolean;
  bankAccounts: any[];
  payouts: any[];
}

export function AgentPayoutsClient({
  balance,
  pendingHold,
  paid,
  totalEarned,
  hasBankDetails,
  bankAccounts,
  payouts,
}: AgentPayoutsClientProps) {
  const [isBankModalOpen, setIsBankModalOpen] = React.useState(false);
  const [selectedAccountToEdit, setSelectedAccountToEdit] = React.useState<any>(null);
  const [isDeletingId, setIsDeletingId] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const handleSetDefault = (accountId: string) => {
    startTransition(async () => {
      await setDefaultBankAccount(accountId);
    });
  };

  const handleDelete = (accountId: string) => {
    if (confirm("Are you sure you want to delete this bank account?")) {
      setIsDeletingId(accountId);
      startTransition(async () => {
        await deleteBankAccount(accountId);
        setIsDeletingId(null);
      });
    }
  };

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
        {/* Left Side: Bank Details & Submit payout */}
        <div className="lg:col-span-1 space-y-6">
          {/* Card 1: Bank Details Management */}
          <div className="p-6 rounded-3xl border border-border/40 bg-card text-foreground shadow-lg h-fit">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-foreground">Bank Details</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your configured payout destination
                </p>
              </div>
              {hasBankDetails && (
                <button
                  onClick={() => {
                    setSelectedAccountToEdit(null);
                    setIsBankModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              )}
            </div>

            <div className="space-y-4">
              {hasBankDetails ? (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {bankAccounts.map((account) => (
                    <div
                      key={account.id}
                      className={cn(
                        "p-4 rounded-2xl bg-zinc-950/20 glass-premium border space-y-3 transition-all relative group",
                        account.is_default ? "border-primary/50" : "border-border/20"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Account Holder</p>
                            {account.is_default && (
                              <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-foreground">{account.account_holder_name || "—"}</p>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-85 group-hover:opacity-100 transition-opacity">
                          {!account.is_default && (
                            <button
                              onClick={() => handleSetDefault(account.id)}
                              disabled={isPending}
                              className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors text-muted-foreground text-xs font-semibold"
                              title="Set as Default"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedAccountToEdit(account);
                              setIsBankModalOpen(true);
                            }}
                            disabled={isPending}
                            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
                            title="Edit Account"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(account.id)}
                            disabled={isPending || isDeletingId === account.id}
                            className="p-1.5 hover:bg-destructive/15 hover:text-destructive rounded-lg transition-colors text-muted-foreground"
                            title="Delete Account"
                          >
                            {isDeletingId === account.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/10 pt-2.5">
                        <div>
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold block">Bank Name</span>
                          <span className="font-semibold text-foreground/90 truncate block">{account.bank_name || "—"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold block">IFSC Code</span>
                          <span className="font-mono font-semibold text-foreground/90">{account.ifsc_code || "—"}</span>
                        </div>
                      </div>

                      <div className="border-t border-border/10 pt-2.5">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold block">Account Number</span>
                        <span className="font-mono text-xs font-bold tracking-widest text-foreground/90">
                          {account.account_number
                            ? account.account_number.length > 4
                              ? `•••• •••• ${account.account_number.slice(-4)}`
                              : `•••• ${account.account_number}`
                            : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-500 text-sm flex items-start gap-2.5">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>No bank account added yet. Please configure your details to enable payouts.</span>
                </div>
              )}
              
              {!hasBankDetails && (
                <button
                  onClick={() => {
                    setSelectedAccountToEdit(null);
                    setIsBankModalOpen(true);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-primary to-violet-500 text-white rounded-xl text-xs font-bold transition-all text-center hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-primary/20"
                >
                  Add Bank Account
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Request Withdrawal */}
          <div className="p-6 rounded-3xl border border-border/40 bg-card text-foreground shadow-lg h-fit">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-foreground">Request Withdrawal</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Submit a request to transfer commissions
              </p>
            </div>

            {hasBankDetails ? (
              <PayoutForm balance={balance} bankAccounts={bankAccounts} />
            ) : (
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 text-center space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Withdrawal Disabled</p>
                <p className="text-xs text-muted-foreground/80">
                  Please add a bank account first to request withdrawals.
                </p>
              </div>
            )}
          </div>
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
      <Modal
        open={isBankModalOpen}
        onOpenChange={(open) => {
          setIsBankModalOpen(open);
          if (!open) setSelectedAccountToEdit(null);
        }}
      >
        <ModalPortal>
          <ModalOverlay />
          <ModalContent isOpen={isBankModalOpen} className="max-w-md border border-border/50">
            <ModalHeader>
              <ModalTitle>{selectedAccountToEdit ? "Edit Bank Details" : "Add Bank Account"}</ModalTitle>
            </ModalHeader>
            <div className="mt-4">
              <BankDetailsForm
                onSuccessCallback={() => {
                  setIsBankModalOpen(false);
                  setSelectedAccountToEdit(null);
                }}
                defaultValues={selectedAccountToEdit ? {
                  id: selectedAccountToEdit.id,
                  account_holder_name: selectedAccountToEdit.account_holder_name,
                  bank_name: selectedAccountToEdit.bank_name,
                  account_number: selectedAccountToEdit.account_number,
                  ifsc_code: selectedAccountToEdit.ifsc_code,
                } : undefined}
              />
            </div>
          </ModalContent>
        </ModalPortal>
      </Modal>
    </div>
  );
}

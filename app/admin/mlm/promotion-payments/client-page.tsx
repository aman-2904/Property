"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/tables/data-table";
import { SearchFilter } from "@/components/tables/search-filter";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { updatePromotionPaymentStatus } from "@/lib/actions/promotions";
import { Check, X, Coins, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  wallet_id: string;
  user_id: string;
  sale_id: string | null;
  customer_name: string;
  property_title: string;
  booking_amount: number;
  promotion_title: string;
  per_sale_incentive: number;
  status: "pending" | "approved" | "paid" | "rejected";
  created_at: string;
  profiles?: {
    name: string;
    email: string;
  } | null;
}

interface ClientProps {
  initialPending: Transaction[];
  initialHistory: Transaction[];
}

export function AdminPromotionPaymentsClient({ initialPending, initialHistory }: ClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"pending" | "history">("pending");
  const [pending, setPending] = React.useState(initialPending);
  const [history, setHistory] = React.useState(initialHistory);
  
  // Search state
  const [search, setSearch] = React.useState("");

  // Confirmation dialogs state
  const [selectedTxn, setSelectedTxn] = React.useState<Transaction | null>(null);
  const [isApproveOpen, setIsApproveOpen] = React.useState(false);
  const [isRejectOpen, setIsRejectOpen] = React.useState(false);
  const [isPaidOpen, setIsPaidOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    setPending(initialPending);
    setHistory(initialHistory);
  }, [initialPending, initialHistory]);

  const filteredPending = pending.filter((t) => {
    const term = search.toLowerCase();
    return (
      (t.profiles?.name || "").toLowerCase().includes(term) ||
      (t.profiles?.email || "").toLowerCase().includes(term) ||
      (t.customer_name || "").toLowerCase().includes(term) ||
      (t.property_title || "").toLowerCase().includes(term) ||
      t.id.includes(term)
    );
  });

  const filteredHistory = history.filter((t) => {
    const term = search.toLowerCase();
    return (
      (t.profiles?.name || "").toLowerCase().includes(term) ||
      (t.profiles?.email || "").toLowerCase().includes(term) ||
      (t.customer_name || "").toLowerCase().includes(term) ||
      (t.property_title || "").toLowerCase().includes(term) ||
      t.id.includes(term)
    );
  });

  const handleApproveConfirm = async () => {
    if (!selectedTxn) return;
    setIsLoading(true);
    const res = await updatePromotionPaymentStatus(selectedTxn.id, "approved");
    setIsLoading(false);
    if (res && res.error) {
      alert(`Error approving payment: ${res.error}`);
    } else {
      setIsApproveOpen(false);
      router.refresh();
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedTxn) return;
    setIsLoading(true);
    const res = await updatePromotionPaymentStatus(selectedTxn.id, "rejected");
    setIsLoading(false);
    if (res && res.error) {
      alert(`Error rejecting payment: ${res.error}`);
    } else {
      setIsRejectOpen(false);
      router.refresh();
    }
  };

  const handlePaidConfirm = async () => {
    if (!selectedTxn) return;
    setIsLoading(true);
    const res = await updatePromotionPaymentStatus(selectedTxn.id, "paid");
    setIsLoading(false);
    if (res && res.error) {
      alert(`Error marking payment as paid: ${res.error}`);
    } else {
      setIsPaidOpen(false);
      router.refresh();
    }
  };

  const pendingColumns = [
    {
      header: "Agent",
      accessorKey: "profiles.name",
      render: (row: Transaction) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{row.profiles?.name || "Unknown Agent"}</span>
          <span className="text-[10px] text-muted-foreground">{row.profiles?.email || ""}</span>
        </div>
      )
    },
    {
      header: "Customer & Property",
      accessorKey: "customer_name",
      render: (row: Transaction) => (
        <div className="flex flex-col text-xs space-y-0.5">
          <div>Cust: <span className="font-semibold text-foreground">{row.customer_name}</span></div>
          <div>Prop: <span className="font-semibold text-foreground">{row.property_title}</span></div>
        </div>
      )
    },
    {
      header: "Booking Amount",
      accessorKey: "booking_amount",
      render: (row: Transaction) => (
        <span className="text-xs text-muted-foreground">
          ₹{Number(row.booking_amount).toLocaleString("en-IN")}
        </span>
      )
    },
    {
      header: "Promotion Rank",
      accessorKey: "promotion_title",
      render: (row: Transaction) => (
        <span className="inline-flex px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 text-xs font-semibold">
          {row.promotion_title}
        </span>
      )
    },
    {
      header: "Incentive Amount",
      accessorKey: "per_sale_incentive",
      render: (row: Transaction) => (
        <span className="font-extrabold text-emerald-500">
          ₹{Number(row.per_sale_incentive).toLocaleString("en-IN")}
        </span>
      )
    },
    {
      header: "Date Generated",
      accessorKey: "created_at",
      render: (row: Transaction) => (
        <span suppressHydrationWarning className="text-xs text-muted-foreground">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      header: "Actions",
      accessorKey: "actions",
      render: (row: Transaction) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedTxn(row);
              setIsApproveOpen(true);
            }}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-black hover:bg-emerald-600 transition-all shadow-sm"
          >
            <Check className="h-3.5 w-3.5" />
            Approve
          </button>
          <button
            onClick={() => {
              setSelectedTxn(row);
              setIsPaidOpen(true);
            }}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
          >
            <Coins className="h-3.5 w-3.5" />
            Mark Paid
          </button>
          <button
            onClick={() => {
              setSelectedTxn(row);
              setIsRejectOpen(true);
            }}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 text-rose-500 px-3 text-xs font-semibold transition-all"
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      )
    }
  ];

  const historyColumns = [
    {
      header: "Transaction ID",
      accessorKey: "id",
      render: (row: Transaction) => (
        <span className="font-mono text-[10px] text-muted-foreground uppercase">{row.id.slice(0, 8)}...</span>
      )
    },
    {
      header: "Agent",
      accessorKey: "profiles.name",
      render: (row: Transaction) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{row.profiles?.name || "Unknown Agent"}</span>
          <span className="text-[10px] text-muted-foreground">{row.profiles?.email || ""}</span>
        </div>
      )
    },
    {
      header: "Customer & Property",
      accessorKey: "customer_name",
      render: (row: Transaction) => (
        <div className="flex flex-col text-xs">
          <span className="font-semibold text-foreground">{row.customer_name}</span>
          <span className="text-muted-foreground">{row.property_title}</span>
        </div>
      )
    },
    {
      header: "Promotion Rank",
      accessorKey: "promotion_title",
      render: (row: Transaction) => (
        <span className="inline-flex px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 text-xs font-semibold">
          {row.promotion_title}
        </span>
      )
    },
    {
      header: "Incentive Earned",
      accessorKey: "per_sale_incentive",
      render: (row: Transaction) => (
        <span className="font-extrabold text-foreground">
          ₹{Number(row.per_sale_incentive).toLocaleString("en-IN")}
        </span>
      )
    },
    {
      header: "Date Processed",
      accessorKey: "created_at",
      render: (row: Transaction) => (
        <span suppressHydrationWarning className="text-xs text-muted-foreground">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      header: "Payment Status",
      accessorKey: "status",
      render: (row: Transaction) => {
        let label = "Pending";
        if (row.status === "approved") label = "Approved (Credited)";
        else if (row.status === "paid") label = "Paid";
        else if (row.status === "rejected") label = "Rejected";

        return (
          <StatusBadge 
            status={
              row.status === "approved" ? "approved" : 
              row.status === "paid" ? "approved" : 
              row.status === "rejected" ? "rejected" : "pending"
            } 
            label={label} 
          />
        );
      }
    },
    {
      header: "Action Link",
      accessorKey: "id",
      render: (row: Transaction) => {
        if (row.status === "approved") {
          return (
            <button
              onClick={() => {
                setSelectedTxn(row);
                setIsPaidOpen(true);
              }}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              Mark Paid
            </button>
          );
        }
        if (row.status === "pending") {
          return (
            <button
              onClick={() => {
                setSelectedTxn(row);
                setIsRejectOpen(true);
              }}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 text-rose-500 px-3 text-xs font-semibold transition-all"
            >
              Reject
            </button>
          );
        }
        return <span className="text-xs text-muted-foreground">-</span>;
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Navigation tabs */}
      <div className="flex border-b border-border/40 pb-px">
        {(["pending", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSearch("");
            }}
            className={cn(
              "px-6 py-3 text-sm font-bold border-b-2 transition-all capitalize -mb-px",
              activeTab === tab
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "pending" ? `Pending Payments (${pending.length})` : "Payment History"}
          </button>
        ))}
      </div>

      {/* Top Search filter panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-border/40 bg-card text-foreground shadow-lg">
        <div className="w-full md:max-w-md">
          <SearchFilter
            searchPlaceholder="Search by Agent, Customer, or Property..."
            searchValue={search}
            onSearchChange={setSearch}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {activeTab === "pending" ? (
            <>
              <Clock className="h-4 w-4 text-amber-500" />
              <span>Approving a payment credits the incentive immediately to the Agent's main wallet.</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Audit logs of all processed promotion incentives.</span>
            </>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-border/40 bg-card shadow-lg overflow-hidden">
        {activeTab === "pending" ? (
          <DataTable
            columns={pendingColumns}
            data={filteredPending}
            emptyTitle="No pending payments found"
            emptyDescription="All promotion incentives are fully processed."
          />
        ) : (
          <DataTable
            columns={historyColumns}
            data={filteredHistory}
            emptyTitle="No processed payments found"
            emptyDescription="Review pending payments to process them."
          />
        )}
      </div>

      {/* Approve Payment Dialog */}
      <ConfirmationDialog
        isOpen={isApproveOpen}
        onOpenChange={setIsApproveOpen}
        onConfirm={handleApproveConfirm}
        title="Approve Promotion Payment?"
        description={`Are you sure you want to approve the promotion incentive of ₹${Number(selectedTxn?.per_sale_incentive).toLocaleString()} for agent "${selectedTxn?.profiles?.name}"? This will automatically credit their main wallet.`}
        confirmText="Approve Payment"
        cancelText="Cancel"
        variant="info"
        isLoading={isLoading}
      />

      {/* Mark Paid Dialog */}
      <ConfirmationDialog
        isOpen={isPaidOpen}
        onOpenChange={setIsPaidOpen}
        onConfirm={handlePaidConfirm}
        title="Mark Promotion Payment as Paid?"
        description={`Are you sure you want to mark the promotion incentive of ₹${Number(selectedTxn?.per_sale_incentive).toLocaleString()} for agent "${selectedTxn?.profiles?.name}" as PAID? This indicates that the cash has been released.`}
        confirmText="Mark Paid"
        cancelText="Cancel"
        variant="info"
        isLoading={isLoading}
      />

      {/* Reject Payment Dialog */}
      <ConfirmationDialog
        isOpen={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        onConfirm={handleRejectConfirm}
        title="Reject Promotion Payment?"
        description={`Are you sure you want to REJECT the promotion incentive of ₹${Number(selectedTxn?.per_sale_incentive).toLocaleString()} for agent "${selectedTxn?.profiles?.name}"? If this was already approved, it will revert wallet balances.`}
        confirmText="Reject Payment"
        cancelText="Cancel"
        variant="danger"
        isLoading={isLoading}
      />
    </div>
  );
}

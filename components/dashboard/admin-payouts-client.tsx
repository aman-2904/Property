"use client";

import * as React from "react";
import { DataTable } from "@/components/tables/data-table";
import { SearchFilter } from "@/components/tables/search-filter";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal, ModalPortal, ModalOverlay, ModalContent, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal-system";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { updatePayoutStatus } from "@/lib/actions/payouts";
import { Check, X, CheckCircle, Loader2, Landmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Payout {
  id: string;
  amount: number;
  status: string;
  remarks: string | null;
  created_at: string;
  profiles: {
    name: string;
    email: string;
    bank_name: string | null;
    account_number: string | null;
    ifsc_code: string | null;
  };
}

interface AdminPayoutsClientProps {
  initialPayouts: Payout[];
}

export function AdminPayoutsClient({ initialPayouts }: AdminPayoutsClientProps) {
  const router = useRouter();
  const [payouts, setPayouts] = React.useState(initialPayouts);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("");
  const [selectedPayout, setSelectedPayout] = React.useState<Payout | null>(null);
  const [isApproveOpen, setIsApproveOpen] = React.useState(false);
  const [isRejectOpen, setIsRejectOpen] = React.useState(false);
  const [remarksInput, setRemarksInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [showToast, setShowToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPayouts(initialPayouts);
  }, [initialPayouts]);

  const filteredPayouts = payouts.filter((pay) => {
    const matchesSearch =
      pay.profiles?.name.toLowerCase().includes(search.toLowerCase()) ||
      pay.profiles?.email.toLowerCase().includes(search.toLowerCase()) ||
      (pay.profiles?.bank_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "" ? true : pay.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleApprove = async () => {
    if (!selectedPayout) return;
    setIsLoading(true);
    const res = await updatePayoutStatus({
      payoutId: selectedPayout.id,
      status: "approved",
      remarks: remarksInput,
    });
    setIsLoading(false);

    if (res && res.error) {
      alert(`Error approving payout: ${res.error}`);
    } else {
      setIsApproveOpen(false);
      setRemarksInput("");
      triggerToast("Payout request approved successfully!");
      router.refresh();
    }
  };

  const handleReject = async () => {
    if (!selectedPayout) return;
    setIsLoading(true);
    const res = await updatePayoutStatus({
      payoutId: selectedPayout.id,
      status: "rejected",
      remarks: remarksInput,
    });
    setIsLoading(false);

    if (res && res.error) {
      alert(`Error rejecting payout: ${res.error}`);
    } else {
      setIsRejectOpen(false);
      triggerToast("Payout request rejected.");
      router.refresh();
    }
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 4000);
  };

  const columns = [
    {
      header: "Agent Details",
      accessorKey: "profiles.name",
      render: (row: Payout) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{row.profiles?.name}</span>
          <span className="text-xs text-muted-foreground">{row.profiles?.email}</span>
        </div>
      ),
    },
    {
      header: "Amount Requested",
      accessorKey: "amount",
      render: (row: Payout) => (
        <span className="font-bold text-foreground">
          ${Number(row.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: "Bank Details",
      accessorKey: "profiles.bank_name",
      render: (row: Payout) => (
        <div className="flex flex-col text-xs text-muted-foreground">
          <span className="font-semibold text-foreground/80 flex items-center gap-1">
            <Landmark className="h-3 w-3 shrink-0" />
            {row.profiles?.bank_name || "N/A"}
          </span>
          {row.profiles?.account_number && (
            <span>A/C: {row.profiles.account_number}</span>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      render: (row: Payout) => <StatusBadge status={row.status} />,
    },
    {
      header: "Request Date",
      accessorKey: "created_at",
      render: (row: Payout) => (
        <span>{new Date(row.created_at).toLocaleDateString()}</span>
      ),
    },
    {
      header: "Remarks / Audit Notes",
      accessorKey: "remarks",
      render: (row: Payout) => (
        <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px] block">
          {row.remarks || "-"}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (row: Payout) => {
        if (row.status !== "pending") return <span className="text-muted-foreground text-xs">Processed</span>;

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedPayout(row);
                setIsApproveOpen(true);
              }}
              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 transition-all"
              title="Approve Payout"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setSelectedPayout(row);
                setIsRejectOpen(true);
              }}
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 transition-all"
              title="Reject Payout"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      },
      className: "w-28 text-center",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search payouts by agent name, email or bank..."
        filterValue={filter}
        onFilterChange={setFilter}
        filterOptions={[
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
        ]}
        filterPlaceholder="All Payouts"
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredPayouts}
        emptyTitle="No payout requests found"
        emptyDescription="There are no payout requests matching your filters."
      />

      {/* Approve Modal */}
      <Modal open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <ModalPortal>
          <ModalOverlay />
          <ModalContent isOpen={isApproveOpen} className="max-w-md">
            <ModalHeader>
              <ModalTitle>Approve Withdrawal Request</ModalTitle>
            </ModalHeader>
            <div className="mt-4 space-y-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-1.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Transfer Details
                </span>
                <p className="font-bold text-foreground mt-0.5">
                  Amount: ${Number(selectedPayout?.amount).toLocaleString("en-US")}
                </p>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>Recipient: {selectedPayout?.profiles?.name}</p>
                  <p>Bank: {selectedPayout?.profiles?.bank_name || "N/A"}</p>
                  <p>Account Number: {selectedPayout?.profiles?.account_number || "N/A"}</p>
                  <p>IFSC Code: {selectedPayout?.profiles?.ifsc_code || "N/A"}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                  Reference Code / Remarks
                </label>
                <input
                  type="text"
                  value={remarksInput}
                  onChange={(e) => setRemarksInput(e.target.value)}
                  placeholder="Enter Bank transaction reference or internal notes..."
                  className="w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all"
                />
              </div>
            </div>
            <ModalFooter className="mt-6 flex gap-2">
              <button
                disabled={isLoading}
                onClick={() => setIsApproveOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                disabled={isLoading}
                onClick={handleApprove}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Approval"}
              </button>
            </ModalFooter>
          </ModalContent>
        </ModalPortal>
      </Modal>

      {/* Reject Confirmation */}
      <ConfirmationDialog
        isOpen={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        onConfirm={handleReject}
        title="Reject Withdrawal Request"
        description={`Are you sure you want to reject the withdrawal request of $${Number(selectedPayout?.amount).toLocaleString("en-US")} for ${selectedPayout?.profiles?.name}?`}
        confirmText="Reject Request"
        variant="danger"
        isLoading={isLoading}
      />

      {/* Toast Alert */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl bg-zinc-900 border border-border/50 text-white font-semibold text-sm shadow-2xl"
          >
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
            <span>{showToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

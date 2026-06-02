"use client";

import * as React from "react";
import { DataTable } from "@/components/tables/data-table";
import { SearchFilter } from "@/components/tables/search-filter";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Modal, ModalPortal, ModalOverlay, ModalContent, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal-system";
import { updatePayoutStatus } from "@/lib/actions/payouts";
import { Check, X, CheckCircle, Loader2, Landmark, ArrowUpRight, Clock, Ban, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
  } | null;
}

interface AdminWithdrawalsClientProps {
  initialPayouts: Payout[];
}

function KpiCard({
  title,
  value,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border/40 p-5 glass-premium flex flex-col justify-between hover:scale-[1.015] hover:border-primary/25 transition-all duration-300 shadow-xl group"
    >
      <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20", color)} />
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border border-border/40 text-foreground/70 transition-colors group-hover:text-foreground", color, "bg-opacity-10")}>
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{value}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </motion.div>
  );
}

export function AdminWithdrawalsClient({ initialPayouts }: AdminWithdrawalsClientProps) {
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
      (pay.profiles?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (pay.profiles?.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (pay.profiles?.bank_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "" ? true : pay.status === filter;
    return matchesSearch && matchesFilter;
  });

  // Calculate statistics
  const totalWithdrawn = payouts
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingVolume = payouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const rejectedVolume = payouts
    .filter((p) => p.status === "rejected")
    .reduce((sum, p) => sum + Number(p.amount), 0);

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
      triggerToast(`Error: ${res.error}`, false);
    } else {
      setIsApproveOpen(false);
      setRemarksInput("");
      triggerToast("Withdrawal request approved successfully!");
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
      triggerToast(`Error: ${res.error}`, false);
    } else {
      setIsRejectOpen(false);
      setRemarksInput("");
      triggerToast("Withdrawal request rejected.");
      router.refresh();
    }
  };

  const triggerToast = (msg: string, success = true) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 4000);
  };

  const exportCSV = () => {
    const headers = ["Agent", "Email", "Amount", "Bank Name", "Account Number", "IFSC Code", "Status", "Remarks", "Date"];
    const lines = [
      headers.join(","),
      ...filteredPayouts.map((w) => [
        `"${String(w.profiles?.name ?? "").replace(/"/g, '""')}"`,
        `"${String(w.profiles?.email ?? "").replace(/"/g, '""')}"`,
        w.amount,
        `"${String(w.profiles?.bank_name ?? "").replace(/"/g, '""')}"`,
        `"${String(w.profiles?.account_number ?? "").replace(/"/g, '""')}"`,
        `"${String(w.profiles?.ifsc_code ?? "").replace(/"/g, '""')}"`,
        w.status,
        `"${String(w.remarks ?? "").replace(/"/g, '""')}"`,
        new Date(w.created_at).toISOString().split("T")[0]
      ].join(","))
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `withdrawals-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      header: "Agent Details",
      accessorKey: "profiles.name",
      render: (row: Payout) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{row.profiles?.name || "—"}</span>
          <span className="text-xs text-muted-foreground">{row.profiles?.email || ""}</span>
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
        <span suppressHydrationWarning>{new Date(row.created_at).toLocaleDateString()}</span>
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
        if (row.status !== "pending") return <span className="text-muted-foreground text-xs font-semibold">Processed</span>;

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedPayout(row);
                setIsApproveOpen(true);
              }}
              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 transition-all"
              title="Approve Withdrawal"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setSelectedPayout(row);
                setIsRejectOpen(true);
              }}
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 transition-all"
              title="Reject Withdrawal"
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
      {/* KPI Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          title="Total Paid Out"
          value={`$${totalWithdrawn.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
          icon={<ArrowUpRight className="h-4 w-4 text-emerald-500" />}
          color="bg-emerald-500"
          subtitle="Approved withdrawals"
        />
        <KpiCard
          title="Pending Cashouts"
          value={`$${pendingVolume.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          color="bg-amber-500"
          subtitle="Pending cashouts"
        />
        <KpiCard
          title="Rejected Withdrawals"
          value={`$${rejectedVolume.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
          icon={<Ban className="h-4 w-4 text-rose-500" />}
          color="bg-rose-500"
          subtitle="Rejected payout requests"
        />
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between w-full">
        <div className="w-full sm:max-w-xs">
          <SearchFilter
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by agent name, email, bank..."
            filterValue={filter}
            onFilterChange={setFilter}
            filterOptions={[
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
            filterPlaceholder="All Withdrawals"
          />
        </div>
        <button
          onClick={exportCSV}
          className="w-full sm:w-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border/40 bg-muted/20 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all active:scale-[0.98]"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Withdrawals Table */}
      <DataTable
        columns={columns}
        data={filteredPayouts}
        emptyTitle="No withdrawals records found"
        emptyDescription="There are no withdrawals matching your search criteria or filters."
      />

      {/* Approve Modal */}
      <Modal open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <ModalPortal>
          <ModalOverlay />
          <ModalContent isOpen={isApproveOpen} className="max-w-md border border-border/50">
            <ModalHeader>
              <ModalTitle>Approve Withdrawal Request</ModalTitle>
            </ModalHeader>
            <div className="mt-4 space-y-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-1.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Transfer Details
                </span>
                <p className="font-bold text-foreground mt-0.5">
                  Amount: ${Number(selectedPayout?.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
                  className="w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all text-foreground"
                />
              </div>
            </div>
            <ModalFooter className="mt-6 flex gap-2">
              <button
                disabled={isLoading}
                onClick={() => setIsApproveOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-input bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-muted text-foreground"
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
        description={`Are you sure you want to reject the withdrawal request of $${Number(selectedPayout?.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} for ${selectedPayout?.profiles?.name}?`}
        confirmText="Reject Request"
        variant="danger"
        isLoading={isLoading}
      />

      {/* Toast Notification */}
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

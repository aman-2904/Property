"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal-system";
import { updateClaimStatus } from "@/lib/actions/rewards";
import { CheckCircle2, XCircle, FileText, AlertCircle, Clock } from "lucide-react";

interface PendingClaim {
  id: string;
  request_date: string;
  profiles: {
    name: string | null;
    email: string;
    direct_sales_count: number;
    group_sales_count: number;
    promotion_levels: { title: string } | null;
  } | null;
  achievement_rules: {
    name: string;
    reward_type: string;
    reward_value: string;
  } | null;
}

interface ClientProps {
  initialClaims: PendingClaim[];
}

export function AdminRewardClaimsClient({ initialClaims }: ClientProps) {
  const router = useRouter();
  const [claims, setClaims] = React.useState(initialClaims);
  const [selectedClaim, setSelectedClaim] = React.useState<PendingClaim | null>(null);
  
  // Modals/Actions state
  const [isProcessOpen, setIsProcessOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  
  // Form input
  const [remarks, setRemarks] = React.useState("");

  React.useEffect(() => {
    setClaims(initialClaims);
  }, [initialClaims]);

  const handleProcessSubmit = async (status: "approved" | "rejected") => {
    if (!selectedClaim) return;

    setIsLoading(true);
    setErrorMsg(null);
    const res = await updateClaimStatus(selectedClaim.id, status, remarks);
    setIsLoading(false);

    if (res && res.error) {
      setErrorMsg(res.error);
    } else {
      setIsProcessOpen(false);
      setRemarks("");
      router.refresh();
    }
  };

  const columns = [
    {
      header: "Agent",
      accessorKey: "profiles.name",
      render: (row: PendingClaim) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{row.profiles?.name || "Unknown Agent"}</span>
          <span className="text-[10px] text-muted-foreground">{row.profiles?.email}</span>
        </div>
      )
    },
    {
      header: "Agent Rank",
      accessorKey: "profiles.promotion_levels.title",
      render: (row: PendingClaim) => (
        <span className="text-xs font-semibold text-foreground">
          {row.profiles?.promotion_levels?.title || "Agent"}
        </span>
      )
    },
    {
      header: "Sales Stats",
      accessorKey: "sales_stats",
      render: (row: PendingClaim) => (
        <div className="text-[11px] space-y-0.5">
          <div className="flex justify-between w-28">
            <span className="text-muted-foreground">Direct Sales:</span>
            <span className="font-semibold text-foreground">{row.profiles?.direct_sales_count || 0}</span>
          </div>
          <div className="flex justify-between w-28">
            <span className="text-muted-foreground">Group Sales:</span>
            <span className="font-semibold text-foreground">{row.profiles?.group_sales_count || 0}</span>
          </div>
        </div>
      )
    },
    {
      header: "Claimed Reward",
      accessorKey: "achievement_rules.name",
      render: (row: PendingClaim) => (
        <div className="flex flex-col">
          <span className="font-bold text-primary">{row.achievement_rules?.name}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            {row.achievement_rules?.reward_type} • {row.achievement_rules?.reward_value}
          </span>
        </div>
      )
    },
    {
      header: "Request Date",
      accessorKey: "request_date",
      render: (row: PendingClaim) => (
        <span suppressHydrationWarning className="text-xs text-muted-foreground">
          {new Date(row.request_date).toLocaleString()}
        </span>
      )
    },
    {
      header: "Actions",
      accessorKey: "actions",
      render: (row: PendingClaim) => (
        <button
          onClick={() => {
            setSelectedClaim(row);
            setRemarks("");
            setErrorMsg(null);
            setIsProcessOpen(true);
          }}
          className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 hover:bg-primary hover:text-primary-foreground text-primary font-bold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
        >
          <Clock className="h-3.5 w-3.5" />
          Review Claim
        </button>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
        <DataTable
          columns={columns}
          data={claims}
          emptyTitle="All Clear! No Pending Claims"
          emptyDescription="There are currently no active reward claim requests waiting for approval."
        />
      </div>

      {/* PROCESS CLAIM MODAL */}
      {isProcessOpen && selectedClaim && (
        <Modal open={isProcessOpen} onOpenChange={setIsProcessOpen}>
          <ModalContent className="sm:max-w-[500px]">
            <ModalHeader>
              <ModalTitle>Process Reward Claim</ModalTitle>
            </ModalHeader>
            <div className="space-y-4 py-4">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Summary Details */}
              <div className="p-4 rounded-xl border border-border/30 bg-muted/10 space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-y-2">
                  <div>
                    <span className="text-muted-foreground block">Agent Name</span>
                    <span className="font-bold text-foreground">{selectedClaim.profiles?.name || "Unknown"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Agent Email</span>
                    <span className="font-bold text-foreground truncate block max-w-[180px]">{selectedClaim.profiles?.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Requested Reward</span>
                    <span className="font-bold text-primary">{selectedClaim.achievement_rules?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Reward Value</span>
                    <span className="font-bold text-foreground">{selectedClaim.achievement_rules?.reward_value}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Direct Sales</span>
                    <span className="font-bold text-foreground">{selectedClaim.profiles?.direct_sales_count || 0} approved</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Group Sales</span>
                    <span className="font-bold text-foreground">{selectedClaim.profiles?.group_sales_count || 0} approved</span>
                  </div>
                </div>
              </div>

              {/* Remarks/Audit text area */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Admin Review Remarks</label>
                <textarea
                  placeholder="Provide audit comments or reason for approval/rejection..."
                  className="w-full h-24 p-3 rounded-xl border border-border/50 bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary transition-all resize-none"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <ModalFooter className="pt-2 flex justify-between sm:justify-between">
                <button
                  type="button"
                  onClick={() => setIsProcessOpen(false)}
                  className="h-10 px-4 rounded-xl border border-border/50 hover:bg-muted text-muted-foreground text-sm font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleProcessSubmit("rejected")}
                    className="h-10 px-4 inline-flex items-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 text-sm font-semibold transition-all cursor-pointer"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Claim
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleProcessSubmit("approved")}
                    className="h-10 px-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-500/50 text-emerald-foreground text-sm font-bold shadow-md shadow-emerald-500/10 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isLoading ? "Processing..." : "Approve Claim"}
                  </button>
                </div>
              </ModalFooter>
            </div>
          </ModalContent>
        </Modal>
      )}
    </div>
  );
}

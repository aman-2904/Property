"use client";

import * as React from "react";
import { DataTable } from "@/components/tables/data-table";
import { SearchFilter } from "@/components/tables/search-filter";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { updateCommissionStatus } from "@/lib/actions/admin";
import { Check, X, CheckCircle, Loader2, Coins, CoinsIcon, Percent, Clock, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Commission {
  id: string;
  level: number;
  percent: number;
  amount: number;
  status: string;
  created_at: string;
  sales: {
    sale_amount: number;
    properties: {
      title: string;
    } | null;
  } | null;
  profiles: {
    name: string;
    email: string;
  } | null;
}

interface AdminCommissionsClientProps {
  initialCommissions: Commission[];
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

export function AdminCommissionsClient({ initialCommissions }: AdminCommissionsClientProps) {
  const router = useRouter();
  const [commissions, setCommissions] = React.useState(initialCommissions);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("");
  const [selectedCommission, setSelectedCommission] = React.useState<Commission | null>(null);
  const [isApproveOpen, setIsApproveOpen] = React.useState(false);
  const [isRejectOpen, setIsRejectOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showToast, setShowToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCommissions(initialCommissions);
  }, [initialCommissions]);

  const filteredCommissions = commissions.filter((comm) => {
    const matchesSearch =
      (comm.profiles?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (comm.profiles?.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (comm.sales?.properties?.title || "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "" ? true : comm.status === filter;
    return matchesSearch && matchesFilter;
  });

  // Calculate statistics
  const totalDistributed = commissions
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const approvedVolume = commissions
    .filter((c) => c.status === "approved" || c.status === "paid")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const pendingVolume = commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const handleApprove = async () => {
    if (!selectedCommission) return;
    setIsLoading(true);
    const res = await updateCommissionStatus(selectedCommission.id, "approved");
    setIsLoading(false);

    if (res && res.error) {
      triggerToast(`Error: ${res.error}`, false);
    } else {
      setIsApproveOpen(false);
      triggerToast("Commission approved and credited successfully!");
      router.refresh();
    }
  };

  const handleReject = async () => {
    if (!selectedCommission) return;
    setIsLoading(true);
    const res = await updateCommissionStatus(selectedCommission.id, "rejected");
    setIsLoading(false);

    if (res && res.error) {
      triggerToast(`Error: ${res.error}`, false);
    } else {
      setIsRejectOpen(false);
      triggerToast("Commission rejected successfully.");
      router.refresh();
    }
  };

  const triggerToast = (msg: string, success = true) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 4000);
  };

  const exportCSV = () => {
    const headers = ["Recipient", "Email", "Property", "Level", "Percentage", "Amount", "Status", "Date"];
    const lines = [
      headers.join(","),
      ...filteredCommissions.map((c) => [
        `"${String(c.profiles?.name ?? "").replace(/"/g, '""')}"`,
        `"${String(c.profiles?.email ?? "").replace(/"/g, '""')}"`,
        `"${String(c.sales?.properties?.title ?? "").replace(/"/g, '""')}"`,
        `"L${c.level}"`,
        `${c.percent}%`,
        c.amount,
        c.status,
        new Date(c.created_at).toISOString().split("T")[0]
      ].join(","))
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commissions-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      header: "Recipient Agent",
      accessorKey: "profiles.name",
      render: (row: Commission) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{row.profiles?.name || "—"}</span>
          <span className="text-xs text-muted-foreground">{row.profiles?.email || ""}</span>
        </div>
      ),
    },
    {
      header: "Property / Sale Info",
      accessorKey: "sales.properties.title",
      render: (row: Commission) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground/80">{row.sales?.properties?.title || "—"}</span>
          {row.sales?.sale_amount && (
            <span className="text-[10px] text-muted-foreground">Sale Vol: ${Number(row.sales.sale_amount).toLocaleString("en-US")}</span>
          )}
        </div>
      ),
    },
    {
      header: "MLM Level",
      accessorKey: "level",
      render: (row: Commission) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-violet-500/20 bg-violet-500/10 text-xs font-bold text-violet-400">
          {row.level === 0 ? "Direct (L0)" : `Upline (L${row.level})`}
        </span>
      ),
    },
    {
      header: "Payout rate",
      accessorKey: "percent",
      render: (row: Commission) => (
        <span className="text-foreground/80 font-semibold">{row.percent}%</span>
      ),
    },
    {
      header: "Commission Amount",
      accessorKey: "amount",
      render: (row: Commission) => (
        <span className="font-bold text-foreground">
          ${Number(row.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      render: (row: Commission) => <StatusBadge status={row.status} />,
    },
    {
      header: "Actions",
      render: (row: Commission) => {
        if (row.status !== "pending") return <span className="text-muted-foreground text-xs font-semibold">Processed</span>;

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedCommission(row);
                setIsApproveOpen(true);
              }}
              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 transition-all"
              title="Approve Commission"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setSelectedCommission(row);
                setIsRejectOpen(true);
              }}
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 transition-all"
              title="Reject Commission"
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
          title="Total Commissions Pool"
          value={`$${totalDistributed.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
          icon={<CoinsIcon className="h-4 w-4 text-violet-500" />}
          color="bg-violet-500"
          subtitle="Overall distributed commissions"
        />
        <KpiCard
          title="Approved Commissions"
          value={`$${approvedVolume.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
          icon={<CheckCircle className="h-4 w-4 text-emerald-500" />}
          color="bg-emerald-500"
          subtitle="Commission balance credited"
        />
        <KpiCard
          title="Pending Audits"
          value={`$${pendingVolume.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          color="bg-amber-500"
          subtitle="Commissions awaiting review"
        />
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between w-full">
        <div className="w-full sm:max-w-xs">
          <SearchFilter
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by recipient or property..."
            filterValue={filter}
            onFilterChange={setFilter}
            filterOptions={[
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "paid", label: "Paid" },
              { value: "rejected", label: "Rejected" },
              { value: "cancelled", label: "Cancelled" },
            ]}
            filterPlaceholder="All Commissions"
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

      {/* Commissions Table */}
      <DataTable
        columns={columns}
        data={filteredCommissions}
        emptyTitle="No commissions records found"
        emptyDescription="There are no commissions matching your search criteria or filters."
      />

      {/* Approve Confirmation */}
      <ConfirmationDialog
        isOpen={isApproveOpen}
        onOpenChange={setIsApproveOpen}
        onConfirm={handleApprove}
        title="Approve Commission"
        description={`Are you sure you want to approve and release the commission of $${Number(selectedCommission?.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} to ${selectedCommission?.profiles?.name}?`}
        confirmText="Approve & Release"
        variant="info"
        isLoading={isLoading}
      />

      {/* Reject Confirmation */}
      <ConfirmationDialog
        isOpen={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        onConfirm={handleReject}
        title="Reject Commission"
        description={`Are you sure you want to reject the commission of $${Number(selectedCommission?.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} for ${selectedCommission?.profiles?.name}?`}
        confirmText="Reject Commission"
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

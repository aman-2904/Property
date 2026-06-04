"use client";

import * as React from "react";
import { DataTable } from "@/components/tables/data-table";
import { SearchFilter } from "@/components/tables/search-filter";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { updateSaleStatus } from "@/lib/actions/sales";
import { updatePaymentStatus } from "@/lib/actions/admin";
import { Check, X, CheckCircle, Loader2, IndianRupee, TrendingUp, Clock, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Sale {
  id: string;
  buyer_name: string;
  buyer_phone: string;
  sale_amount: number;
  booking_amount: number;
  status: string;
  created_at: string;
  properties: {
    title: string;
  } | null;
  profiles: {
    name: string;
    email: string;
  } | null;
  sale_payments?: {
    id: string;
    amount: number;
    status: string;
    created_at: string;
  }[];
}

interface AdminSalesClientProps {
  initialSales: Sale[];
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

export function AdminSalesClient({ initialSales }: AdminSalesClientProps) {
  const router = useRouter();
  const [sales, setSales] = React.useState(initialSales);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("");
  const [selectedSale, setSelectedSale] = React.useState<Sale | null>(null);
  const [selectedPayment, setSelectedPayment] = React.useState<{ id: string; amount: number; buyerName: string; propertyTitle: string } | null>(null);
  const [isApproveOpen, setIsApproveOpen] = React.useState(false);
  const [isRejectOpen, setIsRejectOpen] = React.useState(false);
  const [isApprovePaymentOpen, setIsApprovePaymentOpen] = React.useState(false);
  const [isRejectPaymentOpen, setIsRejectPaymentOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showToast, setShowToast] = React.useState<string | null>(null);

  const handleApprovePayment = async () => {
    if (!selectedPayment) return;
    setIsLoading(true);
    const res = await updatePaymentStatus(selectedPayment.id, "approved");
    setIsLoading(false);

    if (res && res.error) {
      triggerToast(`Error: ${res.error}`, false);
    } else {
      setIsApprovePaymentOpen(false);
      triggerToast(`Payment of ₹${selectedPayment.amount.toLocaleString()} approved!`);
      router.refresh();
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedPayment) return;
    setIsLoading(true);
    const res = await updatePaymentStatus(selectedPayment.id, "rejected");
    setIsLoading(false);

    if (res && res.error) {
      triggerToast(`Error: ${res.error}`, false);
    } else {
      setIsRejectPaymentOpen(false);
      triggerToast(`Payment of ₹${selectedPayment.amount.toLocaleString()} rejected.`);
      router.refresh();
    }
  };

  React.useEffect(() => {
    setSales(initialSales);
  }, [initialSales]);

  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      (sale.profiles?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (sale.profiles?.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (sale.buyer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (sale.properties?.title || "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "" ? true : sale.status === filter;
    return matchesSearch && matchesFilter;
  });

  // Calculate statistics based on Booking Amount
  const totalVolume = sales
    .filter((s) => s.status === "approved")
    .reduce((sum, s) => sum + Number(s.booking_amount), 0);
  const approvedCount = sales.filter((s) => s.status === "approved").length;
  const pendingCount = sales.filter((s) => s.status === "pending_approval").length;

  const handleApprove = async () => {
    if (!selectedSale) return;
    setIsLoading(true);
    const res = await updateSaleStatus(selectedSale.id, "approved");
    setIsLoading(false);

    if (res && res.error) {
      triggerToast(`Error: ${res.error}`, false);
    } else {
      setIsApproveOpen(false);
      triggerToast("Sale approved and commissions distributed successfully!");
      router.refresh();
    }
  };

  const handleReject = async () => {
    if (!selectedSale) return;
    setIsLoading(true);
    const res = await updateSaleStatus(selectedSale.id, "rejected");
    setIsLoading(false);

    if (res && res.error) {
      triggerToast(`Error: ${res.error}`, false);
    } else {
      setIsRejectOpen(false);
      triggerToast("Sale submission has been rejected.");
      router.refresh();
    }
  };

  const triggerToast = (msg: string, success = true) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 4000);
  };

  const exportCSV = () => {
    const headers = ["Agent", "Email", "Property", "Buyer", "Booking Amount", "Sale Price", "Status", "Date"];
    const lines = [
      headers.join(","),
      ...filteredSales.map((s) => [
        `"${String(s.profiles?.name ?? "").replace(/"/g, '""')}"`,
        `"${String(s.profiles?.email ?? "").replace(/"/g, '""')}"`,
        `"${String(s.properties?.title ?? "").replace(/"/g, '""')}"`,
        `"${String(s.buyer_name ?? "").replace(/"/g, '""')}"`,
        s.booking_amount,
        s.sale_amount,
        s.status,
        new Date(s.created_at).toISOString().split("T")[0]
      ].join(","))
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      header: "Agent / Seller",
      accessorKey: "profiles.name",
      render: (row: Sale) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{row.profiles?.name || "—"}</span>
          <span className="text-xs text-muted-foreground">{row.profiles?.email || ""}</span>
        </div>
      ),
    },
    {
      header: "Property",
      accessorKey: "properties.title",
      render: (row: Sale) => (
        <span className="font-medium text-foreground/80">{row.properties?.title || "—"}</span>
      ),
    },
    {
      header: "Buyer",
      accessorKey: "buyer_name",
      render: (row: Sale) => (
        <div className="flex flex-col">
          <span className="text-foreground/90 font-medium">{row.buyer_name}</span>
          <span className="text-xs text-muted-foreground">{row.buyer_phone}</span>
        </div>
      ),
    },
    {
      header: "Property Value",
      render: (row: Sale) => (
        <span className="font-semibold text-foreground">
          ₹{Number(row.sale_amount).toLocaleString("en-US", { minimumFractionDigits: 0 })}
        </span>
      ),
    },
    {
      header: "Paid / Remaining",
      render: (row: Sale) => {
        const approvedPayments = (row.sale_payments || [])
          .filter((p) => p.status === "approved");
        const totalPaid = approvedPayments.reduce((s, p) => s + Number(p.amount), 0);
        const remaining = Math.max(0, Number(row.sale_amount) - totalPaid);
        return (
          <div className="flex flex-col">
            <span className="font-bold text-emerald-400">
              ₹{totalPaid.toLocaleString("en-US")}
            </span>
            <span className={cn("text-xs font-medium", remaining === 0 ? "text-muted-foreground/60 line-through" : "text-amber-500")}>
              Bal: ₹{remaining.toLocaleString("en-US")}
            </span>
          </div>
        );
      },
    },
    {
      header: "Payments Status / Actions",
      render: (row: Sale) => {
        const payments = row.sale_payments || [];
        return (
          <div className="flex flex-col gap-1 min-w-[220px]">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-muted/20 border border-border/30 text-xs animate-in fade-in duration-200">
                <div className="flex flex-col">
                  <span className="font-bold text-foreground">
                    ₹{Number(p.amount).toLocaleString("en-US")}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {p.status === "pending_approval" ? (
                    <>
                      <button
                        onClick={() => {
                          setSelectedPayment({ id: p.id, amount: Number(p.amount), buyerName: row.buyer_name, propertyTitle: row.properties?.title || "" });
                          setIsApprovePaymentOpen(true);
                        }}
                        className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 transition-all"
                        title="Approve Payment"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPayment({ id: p.id, amount: Number(p.amount), buyerName: row.buyer_name, propertyTitle: row.properties?.title || "" });
                          setIsRejectPaymentOpen(true);
                        }}
                        className="p-1 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 transition-all"
                        title="Reject Payment"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <StatusBadge status={p.status} className="text-[9px] px-1.5 py-0.5" />
                  )}
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <span className="text-xs text-muted-foreground italic">No payments</span>
            )}
          </div>
        );
      },
    },
    {
      header: "Date",
      accessorKey: "created_at",
      render: (row: Sale) => (
        <span suppressHydrationWarning>{new Date(row.created_at).toLocaleDateString()}</span>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      render: (row: Sale) => <StatusBadge status={row.status} />,
    },
    {
      header: "Actions",
      render: (row: Sale) => {
        if (row.status !== "pending_approval") return <span className="text-muted-foreground text-xs font-semibold">Processed</span>;

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedSale(row);
                setIsApproveOpen(true);
              }}
              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 transition-all"
              title="Approve Sale"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setSelectedSale(row);
                setIsRejectOpen(true);
              }}
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 transition-all"
              title="Reject Sale"
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
          title="Total Approved Volume"
          value={`₹${totalVolume.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
          icon={<IndianRupee className="h-4 w-4 text-emerald-500" />}
          color="bg-emerald-500"
          subtitle="Total volume of closed sales"
        />
        <KpiCard
          title="Approved Sales"
          value={approvedCount.toString()}
          icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
          color="bg-blue-500"
          subtitle="Successfully processed sales"
        />
        <KpiCard
          title="Pending Approvals"
          value={pendingCount.toString()}
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          color="bg-amber-500"
          subtitle="Sales awaiting admin audit"
        />
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between w-full">
        <div className="w-full sm:max-w-xs">
          <SearchFilter
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search sales by agent, buyer, property..."
            filterValue={filter}
            onFilterChange={setFilter}
            filterOptions={[
              { value: "pending_approval", label: "Pending Approval" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
            filterPlaceholder="All Sales"
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

      {/* Sales Table */}
      <DataTable
        columns={columns}
        data={filteredSales}
        emptyTitle="No sales records found"
        emptyDescription="There are no sales matching your search criteria or filters."
      />

      {/* Approve Confirmation */}
      <ConfirmationDialog
        isOpen={isApproveOpen}
        onOpenChange={setIsApproveOpen}
        onConfirm={handleApprove}
        title="Approve Sale Submission"
        description={`Are you sure you want to approve the sale of "${selectedSale?.properties?.title}" to ${selectedSale?.buyer_name} with Booking Amount ₹${Number(selectedSale?.booking_amount).toLocaleString("en-US")} (Sale Price: ₹{Number(selectedSale?.sale_amount).toLocaleString("en-US")})? This will distribute upline commission percentages immediately based on the booking amount.`}
        confirmText="Approve Sale"
        variant="info"
        isLoading={isLoading}
      />

      {/* Reject Confirmation */}
      <ConfirmationDialog
        isOpen={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        onConfirm={handleReject}
        title="Reject Sale Submission"
        description={`Are you sure you want to reject the sale of "${selectedSale?.properties?.title}" to ${selectedSale?.buyer_name} with Booking Amount ₹${Number(selectedSale?.booking_amount).toLocaleString("en-US")}?`}
        confirmText="Reject Sale"
        variant="danger"
        isLoading={isLoading}
      />

      {/* Approve Payment Confirmation */}
      <ConfirmationDialog
        isOpen={isApprovePaymentOpen}
        onOpenChange={setIsApprovePaymentOpen}
        onConfirm={handleApprovePayment}
        title="Approve Payment"
        description={`Are you sure you want to approve the payment of ₹${Number(selectedPayment?.amount).toLocaleString("en-US")} for "${selectedPayment?.propertyTitle}" by buyer ${selectedPayment?.buyerName}? This will distribute upline commission percentages immediately based on this payment amount.`}
        confirmText="Approve Payment"
        variant="info"
        isLoading={isLoading}
      />

      {/* Reject Payment Confirmation */}
      <ConfirmationDialog
        isOpen={isRejectPaymentOpen}
        onOpenChange={setIsRejectPaymentOpen}
        onConfirm={handleRejectPayment}
        title="Reject Payment"
        description={`Are you sure you want to reject the payment of ₹${Number(selectedPayment?.amount).toLocaleString("en-US")} for "${selectedPayment?.propertyTitle}" by buyer ${selectedPayment?.buyerName}?`}
        confirmText="Reject Payment"
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

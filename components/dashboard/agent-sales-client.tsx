"use client";

import * as React from "react";
import Link from "next/link";
import { DataTable } from "@/components/tables/data-table";
import { StatsCard } from "@/components/dashboard/stats-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalPortal,
  ModalOverlay,
  ModalFooter,
} from "@/components/ui/modal-system";
import { submitSale } from "@/lib/actions/sales";
import {
  BarChart3,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  XCircle,
  Coins,
  TrendingUp,
  FileCheck,
  Loader2,
  AlertCircle,
  ExternalLink,
  Calendar,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SaleRow {
  id: string;
  property_id: string;
  seller_id: string;
  buyer_name: string;
  buyer_phone?: string;
  sale_amount: number;
  booking_amount: number;
  status: string;
  created_at: string;
  approved_at?: string | null;
  properties?: { title: string; location?: string } | null;
  commissions?: { amount: number; status: string }[];
}

interface SalesSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalCommission: number;
  pendingCommission: number;
}

interface PropertyOption {
  id: string;
  title: string;
  price: number;
}

interface AgentSalesClientProps {
  initialSales: SaleRow[];
  summary: SalesSummary;
  properties: PropertyOption[];
}

// ─── Submit New Sale Modal ────────────────────────────────────────────────────

function SubmitSaleModal({
  open,
  onOpenChange,
  properties,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  properties: PropertyOption[];
  onSuccess: () => void;
}) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    propertyId: "",
    buyerName: "",
    buyerPhone: "",
    salePrice: "",
    bookingAmount: "",
    notes: "",
  });

  const resetForm = () => {
    setForm({
      propertyId: "",
      buyerName: "",
      buyerPhone: "",
      salePrice: "",
      bookingAmount: "",
      notes: "",
    });
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!form.propertyId) return setErrorMsg("Please select a property.");
    if (!form.buyerName.trim()) return setErrorMsg("Buyer name is required.");
    const price = parseFloat(form.salePrice);
    if (!price || price <= 0) return setErrorMsg("Enter a valid sale value.");
    const booking = parseFloat(form.bookingAmount);
    if (!booking || booking <= 0) return setErrorMsg("Enter a valid booking amount.");

    setIsLoading(true);
    const res = await submitSale({
      propertyId: form.propertyId,
      buyerName: form.buyerName.trim(),
      buyerPhone: form.buyerPhone.trim() || undefined,
      salePrice: price,
      bookingAmount: booking,
    });
    setIsLoading(false);

    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg("Sale submitted successfully! Awaiting admin approval.");
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1800);
    }
  };

  const inputClass =
    "w-full h-10 px-4 rounded-xl border border-border/50 bg-background/50 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";
  const labelClass = "text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1";

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalPortal>
        <ModalOverlay />
        <ModalContent isOpen={open} className="max-w-xl">
          <ModalHeader>
            <ModalTitle>Submit New Sale</ModalTitle>
          </ModalHeader>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Property */}
            <div className="space-y-1.5">
              <label className={labelClass}>Property *</label>
              <select
                value={form.propertyId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const property = properties.find((p) => p.id === selectedId);
                  setForm((f) => ({
                    ...f,
                    propertyId: selectedId,
                    salePrice: property ? String(property.price) : "",
                  }));
                }}
                className={inputClass}
                required
              >
                <option value="">Select a property listing...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} (${Number(p.price).toLocaleString("en-US")})
                  </option>
                ))}
              </select>
            </div>

            {/* Buyer Name */}
            <div className="space-y-1.5">
              <label className={labelClass}>Buyer Name *</label>
              <input
                type="text"
                placeholder="Full name of the buyer"
                value={form.buyerName}
                onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
                className={inputClass}
                required
              />
            </div>

            {/* Buyer Contact */}
            <div className="space-y-1.5">
              <label className={labelClass}>Buyer Contact</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={form.buyerPhone}
                onChange={(e) => setForm((f) => ({ ...f, buyerPhone: e.target.value }))}
                className={inputClass}
              />
            </div>

            {/* Sale Value + Booking Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelClass}>Sale Value *</label>
                <input
                  type="text"
                  placeholder="Select property first"
                  value={form.salePrice ? `$${Number(form.salePrice).toLocaleString("en-US")}` : ""}
                  className={cn(inputClass, "bg-muted/40 text-muted-foreground/80 cursor-not-allowed font-semibold border-muted/50")}
                  readOnly
                  disabled
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Booking Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="500000"
                  value={form.bookingAmount}
                  onChange={(e) => setForm((f) => ({ ...f, bookingAmount: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className={labelClass}>Notes (optional)</label>
              <textarea
                placeholder="Any additional notes or remarks about this sale..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background/50 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              />
            </div>

            {/* Feedback */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {successMsg}
              </div>
            )}

            <ModalFooter className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-input px-4 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {isLoading ? "Submitting..." : "Submit Sale"}
              </button>
            </ModalFooter>
          </form>
        </ModalContent>
      </ModalPortal>
    </Modal>
  );
}

// ─── Track Approval Panel ─────────────────────────────────────────────────────

function TrackApprovalPanel({
  sale,
  onClose,
}: {
  sale: SaleRow;
  onClose: () => void;
}) {
  const steps = [
    {
      label: "Sale Submitted",
      done: true,
      date: sale.created_at,
      icon: <FileCheck className="h-4 w-4" />,
      color: "text-primary border-primary/30 bg-primary/10",
    },
    {
      label: "Under Review",
      done: sale.status !== "pending_approval",
      date: null,
      icon: <Clock className="h-4 w-4" />,
      color:
        sale.status !== "pending_approval"
          ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
          : "text-amber-500 border-amber-500/30 bg-amber-500/10 animate-pulse",
    },
    {
      label: sale.status === "rejected" ? "Sale Rejected" : "Admin Approved",
      done: sale.status === "approved" || sale.status === "rejected",
      date: sale.approved_at ?? null,
      icon:
        sale.status === "rejected" ? (
          <XCircle className="h-4 w-4" />
        ) : (
          <CheckCircle className="h-4 w-4" />
        ),
      color:
        sale.status === "approved"
          ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
          : sale.status === "rejected"
          ? "text-rose-500 border-rose-500/30 bg-rose-500/10"
          : "text-muted-foreground border-border/40 bg-muted/20",
    },
    {
      label: "Commissions Distributed",
      done: sale.status === "approved",
      date: null,
      icon: <Coins className="h-4 w-4" />,
      color:
        sale.status === "approved"
          ? "text-violet-500 border-violet-500/30 bg-violet-500/10"
          : "text-muted-foreground border-border/40 bg-muted/20",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-foreground">Approval Timeline</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[220px]">
              Sale ID: {sale.id.substring(0, 16)}…
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 hover:bg-muted/40 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-[14px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border/50">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              <div
                className={cn(
                  "absolute -left-[22px] top-0.5 h-5 w-5 rounded-full border flex items-center justify-center",
                  step.color
                )}
              >
                {React.cloneElement(step.icon, { className: "h-2.5 w-2.5" })}
              </div>
              <div>
                <p className={cn("text-sm font-semibold", step.done ? "text-foreground" : "text-muted-foreground")}>
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(step.date).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
                {!step.done && !step.date && (
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Awaiting…</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <Link
            href={`/agent/sales/${sale.id}`}
            className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-sm font-semibold transition-all"
          >
            <ExternalLink className="h-4 w-4" />
            View Full Details
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function AgentSalesClient({
  initialSales,
  summary,
  properties,
}: AgentSalesClientProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [propertyFilter, setPropertyFilter] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [trackSale, setTrackSale] = React.useState<SaleRow | null>(null);

  // Reload on submit success (page refresh via router is cleanest)
  const handleSubmitSuccess = () => {
    window.location.reload();
  };

  // ── Client-side filtering ──────────────────────────────────────────────────
  const filteredSales = React.useMemo(() => {
    return initialSales.filter((sale) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        sale.buyer_name.toLowerCase().includes(q) ||
        sale.id.toLowerCase().includes(q) ||
        (sale.properties?.title ?? "").toLowerCase().includes(q);

      const matchesStatus = !statusFilter || sale.status === statusFilter;
      const matchesProperty = !propertyFilter || sale.property_id === propertyFilter;

      const saleDate = new Date(sale.created_at);
      const matchesFrom = !dateFrom || saleDate >= new Date(dateFrom);
      const matchesTo = !dateTo || saleDate <= new Date(dateTo + "T23:59:59");

      return matchesSearch && matchesStatus && matchesProperty && matchesFrom && matchesTo;
    });
  }, [initialSales, searchQuery, statusFilter, propertyFilter, dateFrom, dateTo]);

  // ── Commission helper ──────────────────────────────────────────────────────
  const getCommission = (sale: SaleRow) => {
    if (!sale.commissions || sale.commissions.length === 0) return null;
    const total = sale.commissions.reduce((s, c) => s + Number(c.amount), 0);
    return total;
  };

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      header: "Sale ID",
      accessorKey: "id",
      render: (row: SaleRow) => (
        <span className="font-mono text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md">
          {row.id.substring(0, 8)}…
        </span>
      ),
    },
    {
      header: "Property",
      accessorKey: "properties.title",
      render: (row: SaleRow) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground text-xs">
            {row.properties?.title ?? "—"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {row.properties?.location ?? ""}
          </span>
        </div>
      ),
    },
    {
      header: "Buyer",
      accessorKey: "buyer_name",
      render: (row: SaleRow) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground text-xs">{row.buyer_name}</span>
          {row.buyer_phone && (
            <span className="text-[10px] text-muted-foreground">{row.buyer_phone}</span>
          )}
        </div>
      ),
    },
    {
      header: "Booking Amount",
      accessorKey: "booking_amount",
      render: (row: SaleRow) => (
        <span className="font-bold text-foreground text-sm">
          ${Number(row.booking_amount).toLocaleString("en-US")}
        </span>
      ),
    },
    {
      header: "Sale Value",
      accessorKey: "sale_amount",
      render: (row: SaleRow) => (
        <span className="text-xs text-muted-foreground">
          ${Number(row.sale_amount).toLocaleString("en-US")}
        </span>
      ),
    },
    {
      header: "Commission",
      render: (row: SaleRow) => {
        const comm = getCommission(row);
        if (comm === null)
          return <span className="text-xs text-muted-foreground italic">Pending approval</span>;
        return (
          <span className="font-semibold text-violet-400 text-sm">
            ${comm.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      header: "Date",
      accessorKey: "created_at",
      render: (row: SaleRow) => (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(row.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      render: (row: SaleRow) => <StatusBadge status={row.status} />,
    },
    {
      header: "Actions",
      render: (row: SaleRow) => (
        <div className="flex items-center gap-1.5">
          <Link
            href={`/agent/sales/${row.id}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-all"
            title="View Details"
          >
            <Eye className="h-3.5 w-3.5" />
          </Link>
          {row.status === "pending_approval" && (
            <Link
              href={`/agent/sales/${row.id}`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white transition-all"
              title="Edit Sale"
            >
              <Edit className="h-3.5 w-3.5" />
            </Link>
          )}
          <button
            onClick={() => setTrackSale(row)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 hover:bg-violet-500 text-violet-500 hover:text-white transition-all"
            title="Track Approval"
          >
            <TrendingUp className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
            Sales Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track, manage, and monitor all your submitted property sales and commissions.
          </p>
        </div>
        <button
          onClick={() => setSubmitOpen(true)}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-[0.98] shrink-0"
        >
          <Plus className="h-4 w-4" />
          Submit New Sale
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatsCard
          title="Total Sales"
          value={summary.total}
          icon={<BarChart3 className="h-5 w-5" />}
          description="All submitted sales"
        />
        <StatsCard
          title="Pending"
          value={summary.pending}
          icon={<Clock className="h-5 w-5" />}
          description="Awaiting review"
          className="border-amber-500/20"
        />
        <StatsCard
          title="Approved"
          value={summary.approved}
          icon={<CheckCircle className="h-5 w-5" />}
          description="Completed deals"
          className="border-emerald-500/20"
        />
        <StatsCard
          title="Rejected"
          value={summary.rejected}
          icon={<XCircle className="h-5 w-5" />}
          description="Declined sales"
          className="border-rose-500/20"
        />
        <StatsCard
          title="Total Commission"
          value={`$${summary.totalCommission.toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
          icon={<Coins className="h-5 w-5" />}
          description="Lifetime earnings"
          className="border-violet-500/20"
        />
        <StatsCard
          title="Pending Commission"
          value={`$${summary.pendingCommission.toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
          icon={<TrendingUp className="h-5 w-5" />}
          description="Awaiting approval"
          className="border-primary/20"
        />
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl border border-border/40 bg-zinc-950/10 glass-premium space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by buyer name, Sale ID, or property..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-border/50 bg-background/50 text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-border/50 bg-background/50 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="">All Statuses</option>
              <option value="pending_approval">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Property filter */}
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border/50 bg-background/50 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          >
            <option value="">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <Calendar className="h-3.5 w-3.5" />
            Date Range:
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border/50 bg-background/50 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border/50 bg-background/50 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {(dateFrom || dateTo || statusFilter || propertyFilter || searchQuery) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("");
                setPropertyFilter("");
                setDateFrom("");
                setDateTo("");
              }}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-xl border border-border/50 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white text-xs font-semibold transition-all"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-bold text-foreground">{filteredSales.length}</span> of{" "}
          <span className="font-bold text-foreground">{initialSales.length}</span> sales
        </p>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredSales}
        emptyTitle="No sales found"
        emptyDescription="No sales match your current filters. Try adjusting your search or click 'Submit New Sale' to record your first transaction."
      />

      {/* Submit Modal */}
      <SubmitSaleModal
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        properties={properties}
        onSuccess={handleSubmitSuccess}
      />

      {/* Track Approval Panel */}
      {trackSale && (
        <TrackApprovalPanel sale={trackSale} onClose={() => setTrackSale(null)} />
      )}
    </div>
  );
}

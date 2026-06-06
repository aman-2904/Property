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
import { submitSale, submitAdditionalPayment } from "@/lib/actions/sales";
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
  MapPin,
  User,
  Building2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn, numberToIndianWords } from "@/lib/utils";
import { motion } from "framer-motion";

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
  commissions?: { amount: number; status: string; recipient_id?: string }[];
  sale_payments?: { amount: number; status: string; created_at: string }[];
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
    if (booking > price) return setErrorMsg("Booking amount cannot exceed the sale value.");

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
                    {p.title} (₹{Number(p.price).toLocaleString("en-US")})
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
                  value={form.salePrice ? `₹${Number(form.salePrice).toLocaleString("en-US")}` : ""}
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

function SubmitPaymentModal({
  open,
  onOpenChange,
  sale,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sale: SaleRow | null;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setAmount("");
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [open]);

  if (!sale) return null;

  const approvedPayments = (sale.sale_payments || [])
    .filter((p) => p.status === "approved");
  const totalPaid = approvedPayments.reduce((s, p) => s + Number(p.amount), 0);
  const remainingBalance = Math.max(0, Number(sale.sale_amount) - totalPaid);

  const resetForm = () => {
    setAmount("");
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

    const val = Number(amount);
    if (isNaN(val) || val <= 0) {
      setErrorMsg("Please enter a valid amount greater than 0.");
      return;
    }

    if (val > remainingBalance) {
      setErrorMsg(`Payment amount cannot exceed the remaining balance of ₹${remainingBalance.toLocaleString()}.`);
      return;
    }

    setIsLoading(true);
    const res = await submitAdditionalPayment(sale.id, val);
    setIsLoading(false);

    if (res && res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg("Payment submitted successfully and is pending admin approval!");
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
        <ModalContent isOpen={open} className="max-w-md">
          <ModalHeader>
            <ModalTitle>Submit Additional Payment</ModalTitle>
          </ModalHeader>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <label className={labelClass}>Remaining Balance</label>
              <div className="text-lg font-bold text-amber-500 pl-1">
                ₹{remainingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>Payment Amount *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                  ₹
                </span>
                <input
                  type="number"
                  min="0.01"
                  max={remainingBalance}
                  step="0.01"
                  placeholder="Enter payment amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 bg-background/50 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all font-semibold"
                  required
                />
              </div>
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
                {isLoading ? "Submitting..." : "Submit Payment"}
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
  const [paymentSale, setPaymentSale] = React.useState<SaleRow | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);

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

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, propertyFilter, dateFrom, dateTo]);

  // Calculate Paginated List
  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(start, start + itemsPerPage);
  }, [filteredSales, currentPage]);

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
          className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/95 transition-all shadow-lg shadow-primary/20 active:scale-[0.98] shrink-0"
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
          value={`₹${summary.totalCommission.toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
          icon={<Coins className="h-5 w-5" />}
          description="Lifetime earnings"
          className="border-violet-500/20"
        />
        <StatsCard
          title="Pending Commission"
          value={`₹${summary.pendingCommission.toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
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

      {/* Cards List Layout */}
      <div className="space-y-4">
        {paginatedSales.map((sale) => {
          const approvedPayments = (sale.sale_payments || [])
            .filter((p) => p.status === "approved");
          const totalPaid = approvedPayments.reduce((s, p) => s + Number(p.amount), 0);
          const remaining = Math.max(0, Number(sale.sale_amount) - totalPaid);
          const comm = (() => {
            if (!sale.commissions || sale.commissions.length === 0) return null;
            return sale.commissions
              .filter((c) => !c.recipient_id || c.recipient_id === sale.seller_id)
              .reduce((sum, c) => sum + Number(c.amount), 0);
          })();

          // Determine badge
          let badgeText = "Pending Approval";
          let badgeStyle = "bg-blue-500/10 text-blue-400 border-blue-500/20";
          if (sale.status === "approved") {
            if (remaining === 0) {
              badgeText = "Fully Paid";
              badgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            } else {
              badgeText = "Partial Payment";
              badgeStyle = "bg-amber-500/10 text-amber-400 border-amber-500/20";
            }
          } else if (sale.status === "rejected") {
            badgeText = "Rejected";
            badgeStyle = "bg-rose-500/10 text-rose-400 border-rose-500/20";
          }

          return (
            <motion.div
              key={sale.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-3xl border border-border/40 p-6 bg-zinc-950/20 glass-premium hover:border-primary/30 transition-all duration-300 space-y-6 shadow-xl relative"
            >
              {/* Top: title and location */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <h3 className="text-xl font-bold tracking-tight text-foreground">
                    {sale.properties?.title ?? "Property Sale"}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {sale.properties?.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        {sale.properties.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-primary shrink-0" />
                      Buyer: <strong className="text-foreground">{sale.buyer_name}</strong>
                      {sale.buyer_phone && ` (${sale.buyer_phone})`}
                    </span>
                  </div>
                </div>
                <div className={cn("inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold border shrink-0 self-start sm:self-auto uppercase tracking-wide", badgeStyle)}>
                  {badgeText}
                </div>
              </div>

              {/* Grid for Price, Paid, Remaining, Commission */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Property Price */}
                <div className="bg-muted/10 border border-border/30 rounded-2xl p-4 flex flex-col justify-between min-h-[80px]">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Property Price
                  </span>
                  <div>
                    <span className="text-lg font-extrabold text-foreground mt-1 block">
                      ₹{Number(sale.sale_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-semibold block mt-0.5 leading-tight">
                      {numberToIndianWords(sale.sale_amount)}
                    </span>
                  </div>
                </div>

                {/* Total Paid */}
                <div className="bg-muted/10 border border-border/30 rounded-2xl p-4 flex flex-col justify-between min-h-[80px]">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Total Paid
                  </span>
                  <span className="text-lg font-extrabold text-emerald-400 mt-1">
                    ₹{totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Remaining Amount */}
                <div className="bg-muted/10 border border-border/30 rounded-2xl p-4 flex flex-col justify-between min-h-[80px]">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Remaining Amount
                  </span>
                  <span className={cn("text-lg font-extrabold mt-1", remaining > 0 ? "text-amber-500" : "text-muted-foreground/60 line-through")}>
                    ₹{remaining.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Commission */}
                <div className="bg-muted/10 border border-border/30 rounded-2xl p-4 flex flex-col justify-between min-h-[80px]">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Commission
                  </span>
                  {comm === null ? (
                    <span className="text-xs font-semibold text-muted-foreground/60 italic mt-2">
                      Pending Approval
                    </span>
                  ) : (
                    <span className="text-lg font-extrabold text-violet-400 mt-1">
                      ₹{comm.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom: actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-border/30 w-full justify-between">
                {sale.status === "approved" && remaining > 0 ? (
                  <button
                    onClick={() => setPaymentSale(sale)}
                    className="w-full sm:w-auto h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/95 transition-all shadow-lg shadow-primary/20 active:scale-[0.99] px-6"
                  >
                    <Plus className="h-4 w-4" />
                    + Add New Sale (Partial Payment)
                  </button>
                ) : sale.status === "pending_approval" ? (
                  <button
                    onClick={() => setTrackSale(sale)}
                    className="w-full sm:w-auto h-11 flex items-center justify-center gap-2 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition-all shadow-lg shadow-violet-600/20 active:scale-[0.99] px-6"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Track Approval
                  </button>
                ) : sale.status === "approved" && remaining === 0 ? (
                  <div className="w-full sm:w-auto h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-sm px-6 cursor-default">
                    <CheckCircle className="h-4 w-4" />
                    Fully Paid
                  </div>
                ) : (
                  <div className="w-full sm:w-auto h-11 flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-sm px-6 cursor-default">
                    <XCircle className="h-4 w-4" />
                    Rejected
                  </div>
                )}

                <Link
                  href={`/agent/sales/${sale.id}`}
                  className="w-full sm:w-auto h-11 flex items-center justify-center gap-1.5 rounded-xl border border-border/60 hover:bg-muted text-foreground font-semibold text-sm transition-all px-6"
                >
                  <Eye className="h-4 w-4" />
                  View Previous Sales
                </Link>
              </div>
            </motion.div>
          );
        })}

        {filteredSales.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border/50 rounded-3xl min-h-[300px] bg-zinc-950/10 glass-premium">
            <Building2 className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="font-semibold text-foreground">No sales found</p>
            <p className="text-xs text-muted-foreground mt-1">Try resetting search keyword or filter options</p>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="pt-4 border-t border-border/40 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            Page {currentPage} of {totalPages} ({filteredSales.length} sales)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
            
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      )}

      {/* Submit Modal */}
      <SubmitSaleModal
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        properties={properties}
        onSuccess={handleSubmitSuccess}
      />

      {/* Submit Payment Modal */}
      {paymentSale && (
        <SubmitPaymentModal
          open={!!paymentSale}
          onOpenChange={(v) => {
            if (!v) setPaymentSale(null);
          }}
          sale={paymentSale}
          onSuccess={handleSubmitSuccess}
        />
      )}

      {/* Track Approval Panel */}
      {trackSale && (
        <TrackApprovalPanel sale={trackSale} onClose={() => setTrackSale(null)} />
      )}
    </div>
  );
}

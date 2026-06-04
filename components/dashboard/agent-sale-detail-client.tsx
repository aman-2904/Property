"use client";

import * as React from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatsCard } from "@/components/dashboard/stats-card";
import {
  ArrowLeft,
  Building2,
  User,
  DollarSign,
  FileText,
  Coins,
  Clock,
  CheckCircle,
  XCircle,
  FileCheck,
  ChevronRight,
  MapPin,
  Phone,
  Calendar,
  Hash,
  TrendingUp,
  Plus,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { cn, numberToIndianWords } from "@/lib/utils";
import { submitAdditionalPayment } from "@/lib/actions/sales";
import { useRouter } from "next/navigation";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalPortal,
  ModalOverlay,
  ModalFooter,
} from "@/components/ui/modal-system";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommissionItem {
  id: string;
  amount: number;
  status: string;
  level: number;
  created_at: string;
}

interface SaleDetail {
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
  approved_by?: string | null;
  properties?: {
    id: string;
    title: string;
    location?: string;
    price?: number;
    status?: string;
    image_urls?: string[];
  } | null;
  commissions?: CommissionItem[];
  sale_payments?: { id: string; amount: number; status: string; created_at: string }[];
}

interface AgentSaleDetailClientProps {
  sale: SaleDetail;
}

// ─── Info Row helper ──────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/30 last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/30 text-muted-foreground mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="text-sm font-semibold text-foreground mt-0.5">{value}</div>
      </div>
    </div>
  );
}

// ─── Section Card helper ──────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/40 bg-card text-foreground shadow-lg overflow-hidden",
        className
      )}
    >
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/40 bg-muted/10">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="font-bold text-sm text-foreground tracking-tight">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Approval Timeline ────────────────────────────────────────────────────────

function ApprovalTimeline({ sale }: { sale: SaleDetail }) {
  const steps = [
    {
      label: "Sale Submitted",
      description: "Sale registered and sent for review",
      done: true,
      date: sale.created_at,
      icon: <FileCheck className="h-3.5 w-3.5" />,
      color: "border-primary/30 bg-primary/10 text-primary",
    },
    {
      label: "Under Admin Review",
      description: "Admin is reviewing your sale submission",
      done: sale.status !== "pending_approval",
      date: null,
      icon: <Clock className="h-3.5 w-3.5" />,
      color:
        sale.status !== "pending_approval"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
          : "border-amber-500/30 bg-amber-500/10 text-amber-500",
    },
    {
      label:
        sale.status === "rejected"
          ? "Sale Rejected"
          : sale.status === "approved"
          ? "Sale Approved"
          : "Pending Approval Decision",
      description:
        sale.status === "rejected"
          ? "This sale was declined by the admin"
          : sale.status === "approved"
          ? "Sale verified and commissions triggered"
          : "Waiting for admin decision",
      done: sale.status === "approved" || sale.status === "rejected",
      date: sale.approved_at ?? null,
      icon:
        sale.status === "rejected" ? (
          <XCircle className="h-3.5 w-3.5" />
        ) : (
          <CheckCircle className="h-3.5 w-3.5" />
        ),
      color:
        sale.status === "approved"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
          : sale.status === "rejected"
          ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
          : "border-border/40 bg-muted/20 text-muted-foreground",
    },
    {
      label: "Commissions Distributed",
      description: "Commission payments credited to agent wallets",
      done: sale.status === "approved",
      date: null,
      icon: <Coins className="h-3.5 w-3.5" />,
      color:
        sale.status === "approved"
          ? "border-violet-500/30 bg-violet-500/10 text-violet-500"
          : "border-border/40 bg-muted/20 text-muted-foreground",
    },
  ];

  return (
    <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-[14px] before:top-3 before:bottom-3 before:w-0.5 before:bg-border/50">
      {steps.map((step, i) => (
        <div key={i} className="relative group">
          <div
            className={cn(
              "absolute -left-[22px] top-0.5 h-6 w-6 rounded-full border flex items-center justify-center transition-transform group-hover:scale-110",
              step.color
            )}
          >
            {step.icon}
          </div>
          <div className="space-y-0.5">
            <p
              className={cn(
                "text-sm font-bold",
                step.done ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </p>
            <p className="text-xs text-muted-foreground">{step.description}</p>
            {step.date && (
              <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                <Calendar className="h-3 w-3" />
                {new Date(step.date).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AgentSaleDetailClient({ sale }: AgentSaleDetailClientProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const totalCommission = sale.commissions
    ? sale.commissions.reduce((s, c) => s + Number(c.amount), 0)
    : 0;

  const sellerCommission = sale.commissions
    ? sale.commissions
        .filter((c) => c.level === 0)
        .reduce((s, c) => s + Number(c.amount), 0)
    : 0;

  const approvedPayments = (sale.sale_payments || [])
    .filter((p) => p.status === "approved");
  const totalPaid = approvedPayments.reduce((s, p) => s + Number(p.amount), 0);
  const remainingBalance = Math.max(0, Number(sale.sale_amount) - totalPaid);
  const isFullyPaid = totalPaid >= Number(sale.sale_amount);

  const handleSubmitPayment = async (e: React.FormEvent) => {
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

    setIsSubmitting(true);
    const res = await submitAdditionalPayment(sale.id, val);
    setIsSubmitting(true); // wait, let's keep it true until router.refresh resolves, or false.
    setIsSubmitting(false);

    if (res && res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg("Payment submitted successfully and is pending admin approval!");
      setAmount("");
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMsg(null);
        router.refresh();
      }, 2000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Link
              href="/agent/sales"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sales Management
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground font-mono">
              {sale.id.substring(0, 16)}…
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
            Sale Details
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sale.properties?.title ?? "Property Sale"} — submitted{" "}
            {new Date(sale.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {sale.status === "approved" && !isFullyPaid && (
            <button
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Submit Payment
            </button>
          )}
          <StatusBadge status={sale.status} className="text-sm px-3 py-1" />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Property Value"
          value={`₹${Number(sale.sale_amount).toLocaleString("en-US")}`}
          icon={<DollarSign className="h-5 w-5" />}
          description={numberToIndianWords(sale.sale_amount)}
        />
        <StatsCard
          title="Total Paid"
          value={`₹${totalPaid.toLocaleString("en-US")}`}
          icon={<CheckCircle className="h-5 w-5 text-emerald-400" />}
          description="Approved payments sum"
          className="border-emerald-500/20"
        />
        <StatsCard
          title="Remaining Balance"
          value={`₹${remainingBalance.toLocaleString("en-US")}`}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          description={isFullyPaid ? "Fully Paid" : "Balance to pay"}
          className={cn("border-amber-500/20", remainingBalance === 0 && "opacity-75")}
        />
        <StatsCard
          title="My Commission"
          value={`₹${sellerCommission.toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
          icon={<Coins className="h-5 w-5 text-violet-400" />}
          description="Your direct sales share"
          className="border-violet-500/20"
        />
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Details */}
          <SectionCard title="Property Details" icon={<Building2 className="h-4 w-4" />}>
            {sale.properties?.image_urls && sale.properties.image_urls.length > 0 && (
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-muted mb-4">
                <img
                  src={sale.properties.image_urls[0]}
                  alt={sale.properties.title ?? "Property"}
                  className="object-cover w-full h-full"
                />
              </div>
            )}
            <InfoRow
              icon={<Building2 className="h-3.5 w-3.5" />}
              label="Property Name"
              value={sale.properties?.title ?? "—"}
            />
            {sale.properties?.location && (
              <InfoRow
                icon={<MapPin className="h-3.5 w-3.5" />}
                label="Location"
                value={sale.properties.location}
              />
            )}
            {sale.properties?.price && (
              <InfoRow
                icon={<DollarSign className="h-3.5 w-3.5" />}
                label="Listed Price"
                value={
                  <div className="flex flex-col">
                    <span>₹{Number(sale.properties.price).toLocaleString("en-US")}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold mt-0.5 leading-tight">
                      {numberToIndianWords(sale.properties.price)}
                    </span>
                  </div>
                }
              />
            )}
            {sale.properties?.status && (
              <InfoRow
                icon={<FileText className="h-3.5 w-3.5" />}
                label="Listing Status"
                value={<StatusBadge status={sale.properties.status} />}
              />
            )}
          </SectionCard>

          {/* Sale Information */}
          <SectionCard title="Sale Information" icon={<TrendingUp className="h-4 w-4" />}>
            <InfoRow
              icon={<Hash className="h-3.5 w-3.5" />}
              label="Sale ID"
              value={<span className="font-mono text-xs">{sale.id}</span>}
            />
            <InfoRow
              icon={<Coins className="h-3.5 w-3.5 text-primary" />}
              label="Booking Amount (First Payment)"
              value={
                <span className="text-xl font-extrabold text-foreground">
                  ₹{Number(sale.booking_amount).toLocaleString("en-US")}
                </span>
              }
            />
            <InfoRow
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Submitted On"
              value={new Date(sale.created_at).toLocaleString("en-US", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            />
            {sale.approved_at && (
              <InfoRow
                icon={<CheckCircle className="h-3.5 w-3.5" />}
                label="Processed On"
                value={new Date(sale.approved_at).toLocaleString("en-US", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              />
            )}
            <InfoRow
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Current Status"
              value={<StatusBadge status={sale.status} />}
            />
          </SectionCard>

          {/* Payment History */}
          <SectionCard title="Payment History" icon={<Clock className="h-4 w-4" />}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20">
                    {["Payment ID", "Amount", "Status", "Submitted Date"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {(sale.sale_payments || []).map((p) => (
                    <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                        {p.id.substring(0, 8)}...
                      </td>
                      <td className="px-3 py-2.5 font-bold text-foreground">
                        ₹{Number(p.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground text-left">
                        {new Date(p.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                  {(sale.sale_payments || []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-xs text-muted-foreground">
                        No payments recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* Commission Breakdown */}
          {sale.commissions && sale.commissions.length > 0 ? (
            <SectionCard
              title="Commission Breakdown"
              icon={<Coins className="h-4 w-4" />}
            >
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Your Commission (Seller)
                    </p>
                    <p className="text-2xl font-extrabold text-primary mt-0.5">
                      ₹{sellerCommission.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-violet-500/5 border border-violet-500/20">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Total Network Commissions
                    </p>
                    <p className="text-lg font-bold text-violet-400 mt-0.5">
                      ₹{totalCommission.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Coins className="h-5 w-5 text-violet-400" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/20">
                      {["Level", "Amount", "Status", "Date"].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {sale.commissions.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-violet-500/20 bg-violet-500/10 text-[11px] font-bold text-violet-400">
                            {c.level === 0 ? "Seller" : `L${c.level}`}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-bold text-foreground">
                          ₹{Number(c.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          ) : (
            <SectionCard title="Commission Breakdown" icon={<Coins className="h-4 w-4" />}>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Coins className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-semibold text-muted-foreground">
                  No commissions distributed yet
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Commissions are distributed automatically once payments are approved.
                </p>
              </div>
            </SectionCard>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Buyer Details */}
          <SectionCard title="Buyer Details" icon={<User className="h-4 w-4" />}>
            <InfoRow
              icon={<User className="h-3.5 w-3.5" />}
              label="Full Name"
              value={sale.buyer_name}
            />
            {sale.buyer_phone && (
              <InfoRow
                icon={<Phone className="h-3.5 w-3.5" />}
                label="Contact"
                value={sale.buyer_phone}
              />
            )}
          </SectionCard>

          {/* Approval Timeline */}
          <SectionCard title="Approval Timeline" icon={<Clock className="h-4 w-4" />}>
            <ApprovalTimeline sale={sale} />
          </SectionCard>

          {/* Quick Actions */}
          <div className="p-5 rounded-2xl border border-border/40 bg-card shadow-lg space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Quick Actions
            </p>
            <Link
              href="/agent/sales"
              className="flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/30 hover:border-primary/20 transition-all text-sm font-semibold group"
            >
              <span>All My Sales</span>
              <ArrowLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary rotate-180 transition-colors" />
            </Link>
            <Link
              href="/agent/payouts"
              className="flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/30 hover:border-primary/20 transition-all text-sm font-semibold group"
            >
              <span>My Payouts</span>
              <ArrowLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary rotate-180 transition-colors" />
            </Link>
            <Link
              href="/agent/dashboard"
              className="flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/30 hover:border-primary/20 transition-all text-sm font-semibold group"
            >
              <span>Dashboard</span>
              <ArrowLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary rotate-180 transition-colors" />
            </Link>
          </div>
        </div>
      </div>

      {/* Submit Payment Modal */}
      <Modal open={isOpen} onOpenChange={setIsOpen}>
        <ModalPortal>
          <ModalOverlay />
          <ModalContent isOpen={isOpen} className="max-w-md">
            <ModalHeader>
              <ModalTitle>Submit Additional Payment</ModalTitle>
            </ModalHeader>
            <form onSubmit={handleSubmitPayment} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                  Remaining Balance
                </label>
                <div className="text-lg font-bold text-amber-500 pl-1">
                  ₹{remainingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                  Payment Amount *
                </label>
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
                    className="w-full h-10 pl-8 pr-4 rounded-xl border border-border/50 bg-background/50 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Feedback messages */}
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
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-input px-4 text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {isSubmitting ? "Submitting..." : "Submit Payment"}
                </button>
              </ModalFooter>
            </form>
          </ModalContent>
        </ModalPortal>
      </Modal>
    </div>
  );
}

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  AlertCircle,
  Award,
  IndianRupee,
  TrendingUp,
  Users,
  BarChart3,
  Calendar,
  ShieldCheck,
  Sparkles,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AgentProfileClientProps {
  profile: {
    id: string;
    name: string;
    referral_code?: string;
    is_active: boolean;
    promotion_level?: number;
    created_at: string;
  };
  userEmail: string;
  totalEarned: number;
  availableBalance: number;
  salesCount: number;
  downlineCount: number;
  currentRankTitle: string;
}

// ─── Toast Component ──────────────────────────────────────────────────────────
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur-xl max-w-sm",
        type === "success"
          ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-300"
          : "bg-rose-950/80 border-rose-500/30 text-rose-300"
      )}
    >
      {type === "success" ? (
        <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
      ) : (
        <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
      )}
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-auto text-current/60 hover:text-current transition-colors"
      >
        ✕
      </button>
    </motion.div>
  );
}

// ─── Rank Config ──────────────────────────────────────────────────────────────
const RANK_CONFIG = [
  { label: "Rookie Agent", color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20", gradient: "from-slate-500 to-slate-400" },
  { label: "Senior Agent", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", gradient: "from-blue-500 to-cyan-400" },
  { label: "Manager", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", gradient: "from-violet-500 to-purple-400" },
  { label: "Director", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", gradient: "from-amber-500 to-orange-400" },
];

// ─── Password Input ───────────────────────────────────────────────────────────
function PasswordInput({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
        {label}
      </label>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
          <Lock className="h-4 w-4" />
        </span>
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder ?? "••••••••"}
          className={cn(
            "w-full pl-10 pr-11 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all disabled:opacity-60",
            error && "border-destructive/60"
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive pl-1">{error}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AgentProfileClient({
  profile,
  userEmail,
  totalEarned,
  availableBalance,
  salesCount,
  downlineCount,
  currentRankTitle,
}: AgentProfileClientProps) {
  const rankLevel = Math.min(profile.promotion_level ?? 0, 3);
  const rank = RANK_CONFIG[rankLevel];

  // Initials avatar
  const initials = (profile.name || "A")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Join date
  const joinDate = new Date(profile.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Toast
  const [toast, setToast] = React.useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => setToast({ message, type });

  // Referral copy
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    if (profile.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Password Form State ──────────────────────────────────────────────────
  const [oldPassword, setOldPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pwErrors, setPwErrors] = React.useState<{ old?: string; new?: string; confirm?: string }>({});
  const [isUpdatingPw, setIsUpdatingPw] = React.useState(false);

  const validatePassword = () => {
    const errs: typeof pwErrors = {};
    if (!oldPassword) errs.old = "Current password is required";
    if (!newPassword || newPassword.length < 6) errs.new = "New password must be at least 6 characters";
    if (newPassword !== confirmPassword) errs.confirm = "Passwords do not match";
    if (newPassword === oldPassword && newPassword) errs.new = "New password must differ from current password";
    setPwErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setIsUpdatingPw(true);
    try {
      const supabase = createClient();

      // Re-authenticate with old password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: oldPassword,
      });

      if (signInError) {
        setPwErrors({ old: "Current password is incorrect" });
        setIsUpdatingPw(false);
        return;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        showToast(updateError.message, "error");
      } else {
        showToast("Password updated successfully!", "success");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPwErrors({});
      }
    } catch {
      showToast("An unexpected error occurred. Please try again.", "error");
    } finally {
      setIsUpdatingPw(false);
    }
  };

  // ── Password strength ─────────────────────────────────────────────────────
  const pwStrength = React.useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    return score;
  }, [newPassword]);

  const pwStrengthLabel = ["", "Weak", "Fair", "Good", "Strong"][pwStrength];
  const pwStrengthColor = ["", "bg-rose-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500"][pwStrength];

  // ── Stats config ──────────────────────────────────────────────────────────
  const stats = [
    {
      title: "Total Sales",
      value: salesCount,
      icon: <BarChart3 className="h-5 w-5" />,
      suffix: " deals",
      description: "Approved property sales",
    },
    {
      title: "Total Commission",
      value: `₹${totalEarned.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <TrendingUp className="h-5 w-5" />,
      description: "Lifetime earnings",
    },
    {
      title: "Available Balance",
      value: `₹${availableBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <IndianRupee className="h-5 w-5" />,
      description: "Ready for payout",
    },
    {
      title: "Team Members",
      value: downlineCount,
      icon: <Users className="h-5 w-5" />,
      suffix: " agents",
      description: "Direct downline size",
    },
  ];

  // Card animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.08, duration: 0.45, ease: "easeOut" as const },
    }),
  };

  return (
    <>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast
            key="toast"
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {/* ── Page Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
              My Profile
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              View your agent details, performance metrics, and manage account security.
            </p>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-bold w-fit",
              rank.bg,
              rank.border,
              rank.color
            )}
          >
            <Award className="h-4 w-4" />
            {currentRankTitle}
          </div>
        </motion.div>

        {/* ── Top Row: Profile Card + Stats ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Information Card */}
          <motion.div
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-1 rounded-3xl border border-border/40 bg-card shadow-xl overflow-hidden flex flex-col"
          >
            {/* Gradient Banner */}
            <div className={cn("h-28 w-full bg-gradient-to-br", rank.gradient, "opacity-20 relative")}>
              <div className={cn("absolute inset-0 bg-gradient-to-br", rank.gradient, "opacity-40")} />
            </div>

            <div className="px-6 pb-6 flex flex-col items-center -mt-14 flex-1">
              {/* Avatar */}
              <div className="relative">
                <div
                  className={cn(
                    "w-24 h-24 rounded-2xl border-4 border-card flex items-center justify-center text-2xl font-black shadow-xl",
                    "bg-gradient-to-br",
                    rank.gradient
                  )}
                >
                  <span className="text-white drop-shadow">{initials}</span>
                </div>
                {/* Active dot */}
                <span
                  className={cn(
                    "absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-card",
                    profile.is_active ? "bg-emerald-500" : "bg-rose-500"
                  )}
                />
              </div>

              {/* Name & email */}
              <h2 className="mt-4 text-xl font-extrabold tracking-tight text-foreground text-center">
                {profile.name || "Unknown Agent"}
              </h2>
              <p className="text-sm text-muted-foreground text-center truncate max-w-full">
                {userEmail}
              </p>

              {/* Status badge */}
              <div
                className={cn(
                  "mt-3 px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5",
                  profile.is_active
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-500"
                    : "bg-rose-500/10 border-rose-500/25 text-rose-500"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    profile.is_active ? "bg-emerald-500" : "bg-rose-500"
                  )}
                />
                {profile.is_active ? "Active" : "Suspended"}
              </div>

              <div className="w-full border-t border-border/30 my-5" />

              {/* Details list */}
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground font-medium">
                    <Award className="h-3.5 w-3.5" />
                    Rank Level
                  </span>
                  <span className={cn("font-bold text-xs px-2 py-0.5 rounded-lg border", rank.bg, rank.border, rank.color)}>
                    {currentRankTitle}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground font-medium">
                    <Calendar className="h-3.5 w-3.5" />
                    Member Since
                  </span>
                  <span className="font-semibold text-foreground text-xs">{joinDate}</span>
                </div>

                {profile.referral_code && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground font-medium">
                      <Sparkles className="h-3.5 w-3.5" />
                      Referral Code
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-primary text-xs tracking-wider">
                        {profile.referral_code}
                      </span>
                      <button
                        onClick={handleCopy}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Copy referral code"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Performance Stats Grid */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.title}
                custom={i + 1}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="rounded-2xl border border-border/40 p-6 bg-card shadow-xl hover:scale-[1.02] hover:border-primary/25 transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {stat.title}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary/15 transition-colors">
                    {stat.icon}
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-bold tracking-tight text-foreground">
                    {stat.value}
                    {stat.suffix && (
                      <span className="text-lg text-muted-foreground font-medium">{stat.suffix}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1.5">{stat.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Change Password Card ── */}
        <motion.div
          custom={5}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-3xl border border-border/40 bg-card shadow-xl overflow-hidden"
        >
          {/* Card header with gradient accent */}
          <div className="px-6 py-5 border-b border-border/30 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Change Password</h3>
              <p className="text-xs text-muted-foreground">
                Keep your account secure with a strong, unique password
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-xl border border-border/40">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Secured Portel
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="p-6">
            <div className="grid gap-5 md:grid-cols-3">
              {/* Old Password */}
              <PasswordInput
                id="old-password"
                label="Current Password"
                value={oldPassword}
                onChange={(v) => { setOldPassword(v); setPwErrors((e) => ({ ...e, old: undefined })); }}
                error={pwErrors.old}
                disabled={isUpdatingPw}
                placeholder="Your current password"
              />

              {/* New Password */}
              <div className="space-y-1.5">
                <PasswordInput
                  id="new-password"
                  label="New Password"
                  value={newPassword}
                  onChange={(v) => { setNewPassword(v); setPwErrors((e) => ({ ...e, new: undefined })); }}
                  error={pwErrors.new}
                  disabled={isUpdatingPw}
                  placeholder="Min. 6 characters"
                />
                {/* Strength bar */}
                {newPassword && (
                  <div className="pl-1 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((lvl) => (
                        <div
                          key={lvl}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-all duration-300",
                            pwStrength >= lvl ? pwStrengthColor : "bg-muted/40"
                          )}
                        />
                      ))}
                    </div>
                    <p className={cn("text-[10px] font-semibold", pwStrengthColor.replace("bg-", "text-"))}>
                      {pwStrengthLabel}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <PasswordInput
                id="confirm-password"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(v) => { setConfirmPassword(v); setPwErrors((e) => ({ ...e, confirm: undefined })); }}
                error={pwErrors.confirm}
                disabled={isUpdatingPw}
                placeholder="Repeat new password"
              />
            </div>

            {/* Hints */}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
              {[
                { label: "Min. 6 characters", met: newPassword.length >= 6 },
                { label: "Uppercase letter", met: /[A-Z]/.test(newPassword) },
                { label: "Number", met: /[0-9]/.test(newPassword) },
                { label: "Passwords match", met: newPassword === confirmPassword && !!confirmPassword },
              ].map((hint) => (
                <span
                  key={hint.label}
                  className={cn(
                    "flex items-center gap-1 text-[10px] font-medium transition-colors",
                    hint.met ? "text-emerald-500" : "text-muted-foreground"
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", hint.met ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                  {hint.label}
                </span>
              ))}
            </div>

            {/* Submit */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isUpdatingPw}
                onClick={() => {
                  setOldPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPwErrors({});
                }}
                className="px-5 py-2.5 rounded-xl border border-border/50 text-sm font-semibold text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-all disabled:opacity-50"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={isUpdatingPw || !oldPassword || !newPassword || !confirmPassword}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/20"
              >
                {isUpdatingPw ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Update Password
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
}

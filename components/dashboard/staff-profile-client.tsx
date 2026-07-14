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
  Calendar,
  ShieldCheck,
  KeyRound,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateProfileDetails } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

interface StaffProfileClientProps {
  profile: {
    id: string;
    name: string;
    phone?: string;
    address?: string;
    is_active: boolean;
    created_at: string;
  };
  userEmail: string;
}

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
            "w-full pl-10 pr-11 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-emerald-500/50 transition-all disabled:opacity-60",
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

export function StaffProfileClient({ profile, userEmail }: StaffProfileClientProps) {
  const initials = (profile.name || "S")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const joinDate = new Date(profile.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const [toast, setToast] = React.useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => setToast({ message, type });

  // Profile Details Form State
  const [profileName, setProfileName] = React.useState(profile.name || "");
  const [profilePhone, setProfilePhone] = React.useState(profile.phone || "");
  const [profileAddress, setProfileAddress] = React.useState(profile.address || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showToast("Full Name is required.", "error");
      return;
    }

    if (profilePhone.trim() && (profilePhone.trim().length !== 10 || !/^\d+$/.test(profilePhone.trim()))) {
      showToast("Phone number must be exactly 10 digits.", "error");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await updateProfileDetails({
        name: profileName.trim(),
        phone: profilePhone.trim(),
        address: profileAddress.trim(),
      });

      if (res && res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Profile details updated successfully!", "success");
      }
    } catch {
      showToast("An unexpected error occurred. Please try again.", "error");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Password Form State
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

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: oldPassword,
      });

      if (signInError) {
        setPwErrors({ old: "Current password is incorrect" });
        setIsUpdatingPw(false);
        return;
      }

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

  const pwStrength = React.useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    return score;
  }, [newPassword]);

  const strengthLabels = ["Weak", "Fair", "Good", "Strong", "Excellent"];
  const strengthColors = [
    "bg-muted",
    "bg-rose-500",
    "bg-amber-500",
    "bg-teal-500",
    "bg-emerald-500",
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Upper Profile Hero Area */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.03] to-teal-500/[0.03] p-8 shadow-md">
        <div className="absolute top-[-50%] right-[-10%] w-[350px] h-[350px] rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="relative group shrink-0">
            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-60 blur-md transition duration-500" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-card border border-emerald-500/30 text-emerald-400 text-3xl font-black shadow-inner">
              {initials}
            </div>
          </div>

          <div className="text-center md:text-left space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-2xl font-black tracking-tight">{profile.name}</h1>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3 w-3" /> Staff Member
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{userEmail}</p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1.5 pt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-emerald-500/75" /> Joined {joinDate}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Active Account
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Details Edit Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Personal Information</h2>
                <p className="text-xs text-muted-foreground">Update your personal and contact details</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      id="name"
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      disabled={isUpdatingProfile}
                      placeholder="Enter Full Name"
                      className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-emerald-500/50 transition-all disabled:opacity-60"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="phone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                      <Phone className="h-4 w-4" />
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      disabled={isUpdatingProfile}
                      placeholder="10-digit number"
                      maxLength={10}
                      className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-emerald-500/50 transition-all disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                  Email Address (Read Only)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    value={userEmail}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 bg-muted/10 border border-border/30 rounded-xl text-sm outline-none text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="address" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                  Address
                </label>
                <div className="relative">
                  <span className="absolute top-3 left-3.5 text-muted-foreground pointer-events-none">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <textarea
                    id="address"
                    value={profileAddress}
                    onChange={(e) => setProfileAddress(e.target.value)}
                    disabled={isUpdatingProfile}
                    rows={3}
                    placeholder="Enter your residence/office address"
                    className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-emerald-500/50 transition-all disabled:opacity-60 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-5 h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-emerald-600/20"
                >
                  {isUpdatingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving changes...
                    </>
                  ) : (
                    "Save Personal Details"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Security</h2>
                <p className="text-xs text-muted-foreground">Manage and update your password</p>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <PasswordInput
                id="old-password"
                label="Current Password"
                value={oldPassword}
                onChange={setOldPassword}
                error={pwErrors.old}
                disabled={isUpdatingPw}
              />

              <PasswordInput
                id="new-password"
                label="New Password"
                value={newPassword}
                onChange={setNewPassword}
                error={pwErrors.new}
                disabled={isUpdatingPw}
              />

              {newPassword && (
                <div className="space-y-1.5 px-1">
                  <div className="flex justify-between items-center text-[10px] font-semibold text-muted-foreground uppercase">
                    <span>Password Strength</span>
                    <span className={cn(
                      pwStrength >= 3 ? "text-emerald-400" : pwStrength >= 2 ? "text-amber-400" : "text-rose-400"
                    )}>
                      {strengthLabels[pwStrength]}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden flex gap-0.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={cn(
                          "h-full flex-1 transition-all duration-300",
                          pwStrength >= step ? strengthColors[pwStrength] : "bg-transparent"
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}

              <PasswordInput
                id="confirm-password"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                error={pwErrors.confirm}
                disabled={isUpdatingPw}
              />

              <button
                type="submit"
                disabled={isUpdatingPw}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-emerald-600/20"
              >
                {isUpdatingPw ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  "Change Password"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

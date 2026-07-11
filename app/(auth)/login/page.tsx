"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Lock, Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft, Key, Eye, EyeOff } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  // Forgot Password Wizard States
  const [forgotPasswordStep, setForgotPasswordStep] = React.useState<"request" | "verify" | null>(null);
  const [resetEmail, setResetEmail] = React.useState("");
  const [resetOtp, setResetOtp] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [resetError, setResetError] = React.useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = React.useState<string | null>(null);
  const [isResetPending, setIsResetPending] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    setError(null);
    startTransition(async () => {
      const res = await login(data);
      if (res && res.error) {
        setError(res.error);
      }
    });
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);
    if (!resetEmail.trim()) {
      setResetError("Please enter your email address.");
      return;
    }
    setIsResetPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
      });
      if (error) {
        setResetError(error.message);
      } else {
        setResetSuccess("Verification OTP sent! Please check your email inbox.");
        setForgotPasswordStep("verify");
      }
    } catch (err: any) {
      setResetError(err?.message || "An error occurred. Please try again.");
    } finally {
      setIsResetPending(false);
    }
  };

  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);
    if (resetOtp.trim().length !== 6) {
      setResetError("Please enter a valid 6-digit OTP code.");
      return;
    }
    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }
    setIsResetPending(true);
    try {
      const supabase = createClient();
      // Verify OTP
      const { error } = await supabase.auth.verifyOtp({
        email: resetEmail.trim(),
        token: resetOtp.trim(),
        type: "recovery",
      });
      if (error) {
        setResetError(error.message);
      } else {
        // Update user password
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (updateError) {
          setResetError(updateError.message);
        } else {
          setResetSuccess("Password reset successfully! Logging you in...");
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 2000);
        }
      }
    } catch (err: any) {
      setResetError(err?.message || "An error occurred. Please try again.");
    } finally {
      setIsResetPending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-[420px] p-8 rounded-3xl border border-border/40 glass-premium shadow-2xl"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          {forgotPasswordStep ? "Reset Password" : "Elit buildtech"}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {forgotPasswordStep === "request" && "Enter your email to receive a password reset OTP"}
          {forgotPasswordStep === "verify" && "Enter the 6-digit OTP and your new password"}
          {!forgotPasswordStep && "Sign in to manage your properties & payouts"}
        </p>
      </div>

      {/* Error/Success notification for Login */}
      {error && !forgotPasswordStep && (
        <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Error notification for Password Reset */}
      {resetError && forgotPasswordStep && (
        <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{resetError}</span>
        </div>
      )}

      {/* Success notification for Password Reset */}
      {resetSuccess && forgotPasswordStep && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm flex items-start gap-2.5">
          <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{resetSuccess}</span>
        </div>
      )}

      {forgotPasswordStep === "request" && (
        <form onSubmit={handleRequestReset} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                disabled={isResetPending}
                placeholder="agent@platform.com"
                className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isResetPending}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {isResetPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending OTP...
              </>
            ) : (
              "Send Reset OTP"
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setForgotPasswordStep(null);
              setResetError(null);
              setResetSuccess(null);
            }}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-border/60 text-muted-foreground font-semibold text-sm hover:bg-muted/30 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </button>
        </form>
      )}

      {forgotPasswordStep === "verify" && (
        <form onSubmit={handleVerifyReset} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
              One-Time Password (OTP)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="text"
                maxLength={6}
                value={resetOtp}
                onChange={(e) => setResetOtp(e.target.value)}
                disabled={isResetPending}
                placeholder="Enter 6-digit OTP"
                className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all font-mono tracking-[0.3em] text-center text-lg font-semibold"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
              New Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                <Key className="h-4 w-4" />
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isResetPending}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
              Confirm New Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                <Key className="h-4 w-4" />
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isResetPending}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isResetPending || resetOtp.length !== 6 || !newPassword || newPassword !== confirmPassword}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all active:scale-[0.99] disabled:opacity-50 mt-2"
          >
            {isResetPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Resetting Password...
              </>
            ) : (
              "Confirm Reset Password"
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setForgotPasswordStep("request");
              setResetError(null);
              setResetSuccess(null);
            }}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-border/60 text-muted-foreground font-semibold text-sm hover:bg-muted/30 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Email Input
          </button>
        </form>
      )}

      {!forgotPasswordStep && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                {...register("email")}
                disabled={isPending}
                placeholder="agent@platform.com"
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all",
                  errors.email && "border-destructive/50 focus:border-destructive/50"
                )}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive pl-1">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center pl-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotPasswordStep("request");
                  setResetError(null);
                  setResetSuccess(null);
                }}
                className="text-xs text-primary hover:underline font-semibold"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                {...register("password")}
                disabled={isPending}
                placeholder="••••••••"
                className={cn(
                  "w-full pl-10 pr-11 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all",
                  errors.password && "border-destructive/50 focus:border-destructive/50"
                )}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive pl-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      )}

      <div className="mt-6 text-center text-sm text-muted-foreground space-y-3">
        <div>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:underline font-semibold">
            Sign up
          </Link>
        </div>
        <div className="pt-3 border-t border-border/40 text-xs">
          Are you an Admin?{" "}
          <Link href="/admin/login" className="text-primary hover:underline font-semibold">
            Admin Portal Sign In
          </Link>
        </div>
      </div>
    </motion.div>
  );
}


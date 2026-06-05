"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { User, Lock, Mail, Users, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { signUp } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const registerSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  referralCode: z.string().optional().or(z.literal("")),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  // OTP Verification States
  const [requiresVerification, setRequiresVerification] = React.useState(false);
  const [emailForVerification, setEmailForVerification] = React.useState("");
  const [otpToken, setOtpToken] = React.useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = React.useState(false);
  const [otpError, setOtpError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      referralCode: "",
    },
  });

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) {
        setValue("referralCode", ref.trim().toUpperCase());
      }
    }
  }, [setValue]);

  const onSubmit = (data: RegisterFormValues) => {
    setError(null);
    setOtpError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        const res = await signUp({ ...data, role: "AGENT" });
        if (res && res.error) {
          setError(res.error);
        } else if (res && res.requiresVerification) {
          setRequiresVerification(true);
          setEmailForVerification(res.email);
          if (res.message) {
            setSuccessMessage(res.message);
          }
        } else {
          // Robust fallback: if signUp succeeded but requiresVerification wasn't explicitly returned
          setRequiresVerification(true);
          setEmailForVerification(data.email);
          setSuccessMessage("Account created! Please verify your email using the 6-digit OTP code sent to your inbox.");
        }
      } catch (err: any) {
        setError(err?.message || "An unexpected error occurred during registration. Please try again.");
      }
    });
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    setIsVerifyingOtp(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email: emailForVerification,
        token: otpToken.trim(),
        type: "signup",
      });

      if (error) {
        setOtpError(error.message);
      } else {
        setSuccess(true);
        setSuccessMessage("Email verified successfully! Logging you in...");
        router.refresh();
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      }
    } catch (err: any) {
      setOtpError(err?.message || "An unexpected error occurred during verification.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-[440px] p-8 rounded-3xl border border-border/40 glass-premium shadow-2xl"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          {requiresVerification ? "Verify Account" : "Create Account"}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {requiresVerification ? "Enter verification code sent to your email" : "Join AuraCommission MLM network today"}
        </p>
      </div>

      {error && !requiresVerification && (
        <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm flex items-start gap-2.5">
          <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Success!</p>
            <p className="text-xs text-emerald-400 mt-1">
              {successMessage || "Action completed successfully."}
            </p>
          </div>
        </div>
      )}

      {requiresVerification ? (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <p className="text-xs text-muted-foreground pl-1 mb-2">
            We've sent a 6-digit OTP to <strong className="text-foreground">{emailForVerification}</strong>.
          </p>

          {otpError && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{otpError}</span>
            </div>
          )}

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
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value)}
                disabled={isVerifyingOtp || success}
                placeholder="Enter 6-digit OTP"
                className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all font-mono tracking-[0.3em] text-center text-lg"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isVerifyingOtp || success || otpToken.trim().length !== 6}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all active:scale-[0.99] disabled:opacity-50 mt-6"
          >
            {isVerifyingOtp ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying OTP...
              </>
            ) : (
              "Verify OTP"
            )}
          </button>

          <button
            type="button"
            disabled={isVerifyingOtp || success}
            onClick={() => setRequiresVerification(false)}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-border/60 text-muted-foreground font-semibold text-sm hover:bg-muted/30 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            Back to Sign Up
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                <User className="h-4 w-4" />
              </span>
              <input
                type="text"
                {...register("fullName")}
                disabled={isPending || success}
                placeholder="John Doe"
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all",
                  errors.fullName && "border-destructive/50"
                )}
              />
            </div>
            {errors.fullName && (
              <p className="text-xs text-destructive pl-1">{errors.fullName.message}</p>
            )}
          </div>

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
                disabled={isPending || success}
                placeholder="john@example.com"
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all",
                  errors.email && "border-destructive/50"
                )}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive pl-1">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                {...register("password")}
                disabled={isPending || success}
                placeholder="••••••••"
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all",
                  errors.password && "border-destructive/50"
                )}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-destructive pl-1">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
              Sponsor Referral Code
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                <Users className="h-4 w-4" />
              </span>
              <input
                type="text"
                {...register("referralCode")}
                disabled={isPending || success}
                placeholder="ABCD1234"
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all uppercase font-mono",
                  errors.referralCode && "border-destructive/50"
                )}
              />
            </div>
            <p className="text-[10px] text-muted-foreground pl-1">
              Required if joining an existing sponsor network. Leave blank if bootstrapping root admin.
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending || success}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all active:scale-[0.99] disabled:opacity-50 mt-6"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>
      )}

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline font-semibold">
          Sign in
        </Link>
      </div>
    </motion.div>
  );
}

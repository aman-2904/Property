"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { User, Lock, Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft, Key, Eye, EyeOff, Contact } from "lucide-react";
import { signUp } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { createClient } from "@/lib/supabase/client";

const registerSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  secretKey: z.string().min(1, "Staff secret key is required"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function StaffRegisterPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [showPassword, setShowPassword] = React.useState(false);
  const [showSecretKey, setShowSecretKey] = React.useState(false);

  // OTP Verification States
  const [requiresVerification, setRequiresVerification] = React.useState(false);
  const [emailForVerification, setEmailForVerification] = React.useState("");
  const [otpToken, setOtpToken] = React.useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = React.useState(false);
  const [otpError, setOtpError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      phone: "",
      secretKey: "",
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    setError(null);
    setOtpError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        // Submits as STAFF role
        const res = await signUp({ ...data, role: "STAFF" });
        if (res && res.error) {
          setError(res.error);
        } else if (res && res.requiresVerification) {
          setRequiresVerification(true);
          setEmailForVerification(res.email);
          if (res.message) {
            setSuccessMessage(res.message);
          }
        } else {
          setRequiresVerification(true);
          setEmailForVerification(data.email);
          setSuccessMessage("Staff account created! Please verify your email using the 6-digit OTP code sent to your inbox.");
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
    <div className="relative min-h-screen w-full flex flex-col justify-center items-center overflow-hidden bg-background">
      {/* Background glow effects tailored for Staff (emerald & teal) */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-teal-600/10 blur-[100px] pointer-events-none" />

      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <main className="w-full flex justify-center px-4 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[420px] p-8 rounded-3xl border border-emerald-500/25 glass-premium shadow-2xl relative overflow-hidden"
        >
          {/* Subtle top border illumination */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-55" />

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4">
              <Contact className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              {requiresVerification ? "Verify Staff" : "Register Staff"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {requiresVerification ? "Enter verification code sent to your email" : "Create a Staff CRM account"}
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
                    className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-emerald-500/50 transition-all font-mono tracking-[0.3em] text-center text-lg"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifyingOtp || success || otpToken.trim().length !== 6}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all active:scale-[0.99] disabled:opacity-50 shadow-lg shadow-emerald-600/20"
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Log In"
                )}
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
                    disabled={isPending}
                    placeholder="John Doe"
                    className={cn(
                      "w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-emerald-500/50 transition-all",
                      errors.fullName && "border-destructive/50 focus:border-destructive/50"
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
                    disabled={isPending}
                    placeholder="staff@platform.com"
                    className={cn(
                      "w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-emerald-500/50 transition-all",
                      errors.email && "border-destructive/50 focus:border-destructive/50"
                    )}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive pl-1">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                    <Contact className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    {...register("phone")}
                    disabled={isPending}
                    placeholder="99999 99999"
                    className={cn(
                      "w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-emerald-500/50 transition-all",
                      errors.phone && "border-destructive/50 focus:border-destructive/50"
                    )}
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs text-destructive pl-1">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                    <Key className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    disabled={isPending}
                    placeholder="••••••••"
                    className={cn(
                      "w-full pl-10 pr-11 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-emerald-500/50 transition-all",
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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                  Staff Secret Registration Key
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showSecretKey ? "text" : "password"}
                    {...register("secretKey")}
                    disabled={isPending}
                    placeholder="Enter Staff Key"
                    className={cn(
                      "w-full pl-10 pr-11 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-emerald-500/50 transition-all",
                      errors.secretKey && "border-destructive/50 focus:border-destructive/50"
                    )}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowSecretKey((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.secretKey && (
                  <p className="text-xs text-destructive pl-1">{errors.secretKey.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all active:scale-[0.99] disabled:opacity-50 mt-2 shadow-lg shadow-emerald-600/20"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Staff Account"
                )}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-border/40 flex flex-col gap-3 items-center text-xs text-muted-foreground">
            <div>
              Already have a Staff account?{" "}
              <Link href="/staff/login" className="text-emerald-400 hover:underline font-semibold">
                Sign In
              </Link>
            </div>
            <Link
              href="/login"
              className="flex items-center gap-1.5 hover:text-emerald-400 font-medium transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to Agent Login Portal
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

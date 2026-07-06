"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Lock,
  Mail,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
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

const OTP_LENGTH = 6;

export default function RegisterPage() {
  const router = useRouter();

  // Step: "register" | "otp" | "success"
  const [step, setStep] = React.useState<"register" | "otp" | "success">("register");
  const [direction, setDirection] = React.useState(1); // 1 = forward, -1 = backward

  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [showPassword, setShowPassword] = React.useState(false);

  // OTP states
  const [emailForVerification, setEmailForVerification] = React.useState("");
  const [otpDigits, setOtpDigits] = React.useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isVerifyingOtp, setIsVerifyingOtp] = React.useState(false);
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [isResending, setIsResending] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);

  const otpInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
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

  // Pre-fill referral code from URL
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) {
        setValue("referralCode", ref.trim().toUpperCase());
      }
    }
  }, [setValue]);

  // Countdown for resend OTP cooldown
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // ─── Step 1: Register Handler ─────────────────────────────────────────────
  const onSubmit = (data: RegisterFormValues) => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await signUp({ ...data, role: "AGENT" });

        if (res && res.error) {
          setError(res.error);
          return;
        }

        // Success — show OTP screen
        const verifyEmail = (res && res.email) ? res.email : data.email;
        setEmailForVerification(verifyEmail);
        setOtpDigits(Array(OTP_LENGTH).fill(""));
        setOtpError(null);
        setResendCooldown(60);
        setDirection(1);
        setStep("otp");

        // Focus first OTP box after transition
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 400);
      } catch (err: any) {
        setError(err?.message || "An unexpected error occurred. Please try again.");
      }
    });
  };

  // ─── OTP Input Handling ───────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setOtpError(null);

    // Auto-advance to next box
    if (digit && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (digit && index === OTP_LENGTH - 1) {
      const fullOtp = newDigits.join("");
      if (fullOtp.length === OTP_LENGTH) {
        setTimeout(() => verifyOtp(fullOtp), 200);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (otpDigits[index]) {
        const newDigits = [...otpDigits];
        newDigits[index] = "";
        setOtpDigits(newDigits);
      } else if (index > 0) {
        otpInputRefs.current[index - 1]?.focus();
        const newDigits = [...otpDigits];
        newDigits[index - 1] = "";
        setOtpDigits(newDigits);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newDigits = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setOtpDigits(newDigits);
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    otpInputRefs.current[focusIndex]?.focus();
    if (pasted.length === OTP_LENGTH) {
      setTimeout(() => verifyOtp(pasted), 200);
    }
  };

  // ─── Step 2: Verify OTP ───────────────────────────────────────────────────
  const verifyOtp = async (token?: string) => {
    const otp = token ?? otpDigits.join("");
    if (otp.length !== OTP_LENGTH) return;

    setOtpError(null);
    setIsVerifyingOtp(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email: emailForVerification,
        token: otp.trim(),
        type: "signup",
      });

      if (error) {
        setOtpError(error.message);
        // Shake the OTP boxes by resetting them
        setOtpDigits(Array(OTP_LENGTH).fill(""));
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      } else {
        setDirection(1);
        setStep("success");
        router.refresh();
        setTimeout(() => {
          router.push("/dashboard");
        }, 3000);
      }
    } catch (err: any) {
      setOtpError(err?.message || "Verification failed. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // ─── Resend OTP ───────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setOtpError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: emailForVerification,
      });
      if (error) {
        setOtpError(error.message);
      } else {
        setResendCooldown(60);
        setOtpDigits(Array(OTP_LENGTH).fill(""));
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      }
    } catch (err: any) {
      setOtpError("Failed to resend OTP. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  // ─── Animation Variants ───────────────────────────────────────────────────
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
    }),
  };

  const otpToken = otpDigits.join("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-[440px] rounded-3xl border border-border/40 glass-premium shadow-2xl overflow-hidden"
    >
      {/* Progress bar */}
      <div className="h-1 bg-muted/30">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-violet-400"
          animate={{
            width: step === "register" ? "33%" : step === "otp" ? "66%" : "100%",
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>

      <div className="p-8">
        {/* ── Step Indicator ── */}
        <div className="flex items-center gap-3 mb-8">
          {["register", "otp", "success"].map((s, i) => (
            <React.Fragment key={s}>
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                  (step === "register" && i === 0) ||
                    (step === "otp" && i === 1) ||
                    (step === "success" && i === 2)
                    ? "bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30"
                    : (step === "otp" && i === 0) ||
                      (step === "success" && i <= 1)
                    ? "bg-emerald-500 text-white"
                    : "bg-muted/50 text-muted-foreground"
                )}
              >
                {(step === "otp" && i === 0) || (step === "success" && i <= 1) ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && (
                <div className="flex-1 h-0.5 rounded-full bg-muted/30 overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-500"
                    animate={{
                      width:
                        (i === 0 && (step === "otp" || step === "success")) ||
                        (i === 1 && step === "success")
                          ? "100%"
                          : "0%",
                    }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Animated Steps ── */}
        <div className="relative" style={{ minHeight: 400 }}>
          <AnimatePresence mode="wait" custom={direction}>
            {/* ── STEP 1: Register Form ── */}
            {step === "register" && (
              <motion.div
                key="register"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <div className="text-center mb-6">
                  <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
                    Create Account
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2">
                    Join elitebuildtech MLM network today
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Full Name */}
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
                          "w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all",
                          errors.fullName && "border-destructive/50"
                        )}
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-xs text-destructive pl-1">{errors.fullName.message}</p>
                    )}
                  </div>

                  {/* Email */}
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

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                      Password
                    </label>
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
                          errors.password && "border-destructive/50"
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

                  {/* Sponsor Referral Code */}
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
                        disabled={isPending}
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
                    disabled={isPending}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all active:scale-[0.99] disabled:opacity-50 mt-6 shadow-lg shadow-primary/20"
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
              </motion.div>
            )}

            {/* ── STEP 2: OTP Verification ── */}
            {step === "otp" && (
              <motion.div
                key="otp"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                {/* Icon */}
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 shadow-lg shadow-primary/10">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
                    Verify Email
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2">
                    We sent a 6-digit code to
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5 truncate px-4">
                    {emailForVerification}
                  </p>
                </div>

                {otpError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{otpError}</span>
                  </motion.div>
                )}

                {/* 6-Digit OTP Boxes */}
                <div className="mb-6">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1 mb-3 block text-center">
                    Enter OTP Code
                  </label>
                  <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, index) => (
                      <motion.input
                        key={index}
                        ref={(el) => { otpInputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        disabled={isVerifyingOtp}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onFocus={(e) => e.target.select()}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.05, duration: 0.2 }}
                        className={cn(
                          "w-11 h-14 text-center text-xl font-bold rounded-xl border-2 bg-muted/20 outline-none transition-all duration-200 font-mono",
                          digit
                            ? "border-primary bg-primary/5 text-foreground shadow-md shadow-primary/10"
                            : "border-border/50 text-muted-foreground",
                          "focus:border-primary focus:bg-primary/5 focus:shadow-md focus:shadow-primary/10",
                          isVerifyingOtp && "opacity-60 cursor-not-allowed"
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Verify Button */}
                <button
                  type="button"
                  disabled={isVerifyingOtp || otpToken.length !== OTP_LENGTH}
                  onClick={() => verifyOtp()}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all active:scale-[0.99] disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {isVerifyingOtp ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Verify OTP
                    </>
                  )}
                </button>

                {/* Resend & Back */}
                <div className="flex items-center justify-between mt-4">
                  <button
                    type="button"
                    disabled={isVerifyingOtp}
                    onClick={() => {
                      setDirection(-1);
                      setStep("register");
                    }}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>

                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isResending || isVerifyingOtp}
                    onClick={handleResendOtp}
                    className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {isResending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend OTP"}
                  </button>
                </div>

                <p className="text-center text-[11px] text-muted-foreground mt-4">
                  Check your spam folder if you don't see the email within a minute.
                </p>
              </motion.div>
            )}

            {/* ── STEP 3: Success ── */}
            {step === "success" && (
              <motion.div
                key="success"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="flex flex-col items-center justify-center text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
                  className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/10"
                >
                  <CheckCircle className="h-12 w-12 text-emerald-500" />
                </motion.div>

                <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">
                  You're Verified!
                </h1>
                <p className="text-sm text-muted-foreground mb-1">
                  Your account has been created successfully.
                </p>
                <p className="text-xs text-muted-foreground">
                  Redirecting you to the dashboard...
                </p>

                <div className="mt-6 flex items-center gap-2 text-emerald-500 text-sm font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Logging you in
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        {step === "register" && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-semibold">
              Sign in
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}

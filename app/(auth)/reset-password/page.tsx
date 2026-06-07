"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Lock, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { resetPassword } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const resetSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirmation must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: ResetFormValues) => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await resetPassword({ password: data.password });
      if (res && res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    });
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
          New Password
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Create a secure new password for your account
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm flex items-start gap-2.5">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Password updated successfully!</p>
            <p className="text-xs text-emerald-400 mt-1">
              Redirecting you to login...
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
            New Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
              <Lock className="h-4 w-4" />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              {...register("password")}
              disabled={isPending || success}
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

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
            Confirm Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
              <Lock className="h-4 w-4" />
            </span>
            <input
              type={showConfirmPassword ? "text" : "password"}
              {...register("confirmPassword")}
              disabled={isPending || success}
              placeholder="••••••••"
              className={cn(
                "w-full pl-10 pr-11 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all",
                errors.confirmPassword && "border-destructive/50"
              )}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirmPassword((s) => !s)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive pl-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending || success}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all active:scale-[0.99] disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Password"
          )}
        </button>
      </form>
    </motion.div>
  );
}

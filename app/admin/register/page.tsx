"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { User, Lock, Mail, Loader2, AlertCircle, CheckCircle, ShieldAlert, ArrowLeft, Key } from "lucide-react";
import { signUp } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";

const registerSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  secretKey: z.string().min(1, "Admin secret key is required"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AdminRegisterPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

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
      secretKey: "",
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    setError(null);
    startTransition(async () => {
      // Submits as ADMIN
      const res = await signUp({ ...data, role: "ADMIN" });
      if (res && res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        if (res && res.message) {
          setSuccessMessage(res.message);
        }
        setTimeout(() => {
          // Always redirect admin registration to admin login portal
          router.push("/admin/login");
        }, 3000);
      }
    });
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-center items-center overflow-hidden bg-background">
      {/* Background glow effects tailored for Admin (violet & indigo) */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />

      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <main className="w-full flex justify-center px-4 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[420px] p-8 rounded-3xl border border-violet-500/25 glass-premium shadow-2xl relative overflow-hidden"
        >
          {/* Subtle top border illumination */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-55" />

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 mb-4">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Register Admin
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Create an administrative account
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
              <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Registration Complete!</p>
                <p className="text-xs text-emerald-400 mt-1">
                  {successMessage || "Admin account has been created. Redirecting to admin login..."}
                </p>
              </div>
            </div>
          )}

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
                    "w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-violet-500/50 transition-all",
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
                Admin Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  {...register("email")}
                  disabled={isPending || success}
                  placeholder="admin@platform.com"
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-violet-500/50 transition-all",
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
                    "w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-violet-500/50 transition-all",
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
                Admin Secret Key
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                  <Key className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  {...register("secretKey")}
                  disabled={isPending || success}
                  placeholder="Enter admin secret key"
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-violet-500/50 transition-all",
                    errors.secretKey && "border-destructive/50"
                  )}
                />
              </div>
              {errors.secretKey && (
                <p className="text-xs text-destructive pl-1">{errors.secretKey.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending || success}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-all active:scale-[0.99] disabled:opacity-50 mt-6 shadow-lg shadow-violet-600/20"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Admin Account"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border/40 flex flex-col gap-3 items-center text-xs text-muted-foreground">
            <Link
              href="/admin/login"
              className="flex items-center gap-1.5 hover:text-violet-400 font-medium transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Admin Login
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

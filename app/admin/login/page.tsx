"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Lock, Mail, Loader2, AlertCircle, ShieldAlert, ArrowLeft } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

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
      // Call login server action with isAdminLogin = true
      const res = await login(data, true);
      if (res && res.error) {
        setError(res.error);
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
              Admin Portal
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Authorized personnel only. Please sign in.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                  disabled={isPending}
                  placeholder="admin@platform.com"
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-violet-500/50 transition-all",
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
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  {...register("password")}
                  disabled={isPending}
                  placeholder="••••••••"
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-violet-500/50 transition-all",
                    errors.password && "border-destructive/50 focus:border-destructive/50"
                  )}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive pl-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-all active:scale-[0.99] disabled:opacity-50 shadow-lg shadow-violet-600/20"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Access Dashboard"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border/40 flex flex-col gap-3 items-center text-xs text-muted-foreground">
            <div>
              Need to create an Admin account?{" "}
              <Link href="/admin/register" className="text-violet-400 hover:underline font-semibold">
                Register Admin
              </Link>
            </div>
            <Link
              href="/login"
              className="flex items-center gap-1.5 hover:text-violet-400 font-medium transition-colors"
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

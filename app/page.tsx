import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Coins, ArrowRight, ShieldCheck, Zap, Award, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";

export default async function LandingPage() {
  const supabase = createClient();

  // Try to redirect if already authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role?.toUpperCase();
    if (role === "SUPER_ADMIN" || role === "ADMIN") {
      redirect("/admin/dashboard");
    } else if (role === "AGENT") {
      redirect("/agent/dashboard");
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-background">
      {/* Background radial overlays */}
      <div className="absolute top-[-25%] left-[-15%] w-[800px] h-[800px] rounded-full bg-primary/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 flex h-20 w-full items-center justify-between px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <Coins className="h-8 w-8 text-primary animate-pulse" />
          <span className="font-extrabold text-xl tracking-wider bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
            AuraCommission
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm font-semibold hover:text-primary transition-colors hidden sm:inline"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="h-10 inline-flex items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/95 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
          >
            Join Network
          </Link>
        </div>
      </header>

      {/* Hero Body */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center text-center px-6 max-w-4xl mx-auto py-12 space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-bold animate-bounce">
          <Sparkles className="h-3 w-3" />
          <span>Real Estate Commission Engine V1.0</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1] text-balance">
          Automate Real Estate{" "}
          <span className="bg-gradient-to-r from-primary via-violet-400 to-indigo-500 bg-clip-text text-transparent">
            MLM Commissions
          </span>
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl text-balance">
          A premium SaaS platform designed for property development networks. Track agent sales, auto-distribute multi-level override commissions, and manage instant payout requests.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center pt-4 w-full max-w-xs sm:max-w-none">
          <Link
            href="/register"
            className="w-full sm:w-auto h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground hover:bg-primary/95 transition-all shadow-xl shadow-primary/20 active:scale-[0.99] group"
          >
            Get Started
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto h-12 inline-flex items-center justify-center rounded-xl border border-border/50 hover:bg-muted bg-background/50 px-8 text-sm font-bold text-foreground transition-all active:scale-[0.99]"
          >
            Portal Sign In
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid gap-6 sm:grid-cols-3 w-full pt-16">
          <div className="p-6 rounded-2xl border border-border/40 glass-premium text-left space-y-2">
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
            <h3 className="font-bold text-sm">Row Level Security</h3>
            <p className="text-xs text-muted-foreground">
              Supabase RLS policies guarantee data isolation across agent levels.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border/40 glass-premium text-left space-y-2">
            <Zap className="h-6 w-6 text-primary" />
            <h3 className="font-bold text-sm">Instant Calculation</h3>
            <p className="text-xs text-muted-foreground">
              PostgreSQL functions compute overrides up to 3 levels down instantly on sale approval.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border/40 glass-premium text-left space-y-2">
            <Award className="h-6 w-6 text-amber-500" />
            <h3 className="font-bold text-sm">Rank Promotions</h3>
            <p className="text-xs text-muted-foreground">
              Recruits elevate ranks dynamically as cumulative approved sales volume scales.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 h-16 w-full flex items-center justify-center border-t border-border/30 px-6 text-center text-xs text-muted-foreground">
        <div>
          &copy; {new Date().getFullYear()} AuraCommission. All rights reserved. Powered by Next.js & Supabase.
        </div>
      </footer>
    </div>
  );
}

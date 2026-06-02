import * as React from "react";
import { ShieldAlert, Coins, HelpCircle } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Platform Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review default MLM commission pool allocations, database RLS states, and triggers.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Commission Configuration card */}
        <div className="p-6 rounded-3xl border border-border/40 glass-premium space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 text-primary border border-primary/25 rounded-xl flex items-center justify-center">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Default MLM Commission Distribution</h3>
              <p className="text-xs text-muted-foreground">Calculated relative to total property commission pool</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3.5 bg-muted/20 border border-border/30 rounded-2xl">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">Level 0: Direct Agent</span>
                <span className="text-[10px] text-muted-foreground">The agent completing the direct sale</span>
              </div>
              <span className="text-lg font-extrabold text-primary">50.00%</span>
            </div>

            <div className="flex justify-between items-center p-3.5 bg-muted/20 border border-border/30 rounded-2xl">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">Level 1: Direct Sponsor</span>
                <span className="text-[10px] text-muted-foreground">Upline Level 1 recruiter</span>
              </div>
              <span className="text-lg font-extrabold text-foreground">25.00%</span>
            </div>

            <div className="flex justify-between items-center p-3.5 bg-muted/20 border border-border/30 rounded-2xl">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">Level 2: Grand Sponsor</span>
                <span className="text-[10px] text-muted-foreground">Upline Level 2 recruiter</span>
              </div>
              <span className="text-lg font-extrabold text-foreground">15.00%</span>
            </div>

            <div className="flex justify-between items-center p-3.5 bg-muted/20 border border-border/30 rounded-2xl">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">Level 3: Great-Grand Sponsor</span>
                <span className="text-[10px] text-muted-foreground">Upline Level 3 recruiter</span>
              </div>
              <span className="text-lg font-extrabold text-foreground">10.00%</span>
            </div>
          </div>
        </div>

        {/* Security Policy card */}
        <div className="p-6 rounded-3xl border border-border/40 glass-premium space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-rose-500/10 text-rose-500 border border-rose-500/25 rounded-xl flex items-center justify-center">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Database Security (RLS)</h3>
              <p className="text-xs text-muted-foreground">Enforced security policies</p>
            </div>
          </div>

          <div className="space-y-3.5 text-sm">
            <div className="flex gap-2">
              <div className="h-2 w-2 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground font-semibold">Row-Level Security:</strong> Enabled on profiles, properties, sales, commissions, and payouts.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="h-2 w-2 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground font-semibold">Recursive Calculations:</strong> Handled by PostgreSQL triggers `on_sale_approved` on status update to 'approved'.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="h-2 w-2 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground font-semibold">Automatic Profile Sync:</strong> Syncs new auth credentials automatically on email confirmation.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 text-xs text-muted-foreground flex gap-2">
            <HelpCircle className="h-5 w-5 text-primary shrink-0" />
            <span>
              Commission settings are controlled directly by database functions. Altering these coefficients requires deploying a new SQL migration schema.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

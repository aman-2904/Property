"use client";

import * as React from "react";
import { Copy, Check, Link as LinkIcon, Share2 } from "lucide-react";

interface ReferralCardProps {
  referralCode: string;
}

export function ReferralCard({ referralCode }: ReferralCardProps) {
  const [copied, setCopied] = React.useState(false);
  const [siteUrl, setSiteUrl] = React.useState("");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setSiteUrl(window.location.origin);
    }
  }, []);

  const referralLink = `${siteUrl}/register?ref=${referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 rounded-3xl border border-border/40 bg-zinc-950/20 glass-premium flex flex-col justify-between h-full relative overflow-hidden group">
      {/* Abstract glow ornament */}
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/15 transition-all" />

      <div className="space-y-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Share2 className="h-4.5 w-4.5 text-primary" />
              Invite Recruits
            </h3>
            <p className="text-xs text-muted-foreground">
              Share your referral link to recruit agents and grow overrides.
            </p>
          </div>
        </div>

        {/* Code display */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/50 font-mono">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold font-sans">
              Referral Code
            </span>
            <span className="text-lg font-extrabold text-primary tracking-widest uppercase">
              {referralCode}
            </span>
          </div>
          <div className="px-2 py-0.5 rounded-md border border-primary/25 bg-primary/10 text-[9px] text-primary font-bold font-sans uppercase">
            Active
          </div>
        </div>

        {/* Link Input with copy action */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1">
            Referral Link
          </span>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-muted-foreground pointer-events-none">
              <LinkIcon className="h-4 w-4" />
            </div>
            <input
              type="text"
              readOnly
              value={referralLink}
              className="w-full pl-10 pr-24 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-xs font-mono outline-none text-muted-foreground select-all"
            />
            <button
              onClick={copyToClipboard}
              className="absolute right-1.5 h-8 flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs px-3 hover:bg-primary/95 transition-all active:scale-[0.98]"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

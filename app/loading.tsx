"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="flex flex-col items-center gap-3 p-6 rounded-3xl border border-border/40 glass-premium shadow-2xl">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm font-semibold tracking-wide text-foreground">
          Loading Elit buildtech...
        </span>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Dashboard Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full p-8 rounded-3xl border border-rose-500/20 glass-premium text-center space-y-6 shadow-2xl">
        <div className="flex justify-center text-rose-500">
          <div className="rounded-full bg-rose-500/10 p-4 border border-rose-500/25">
            <AlertOctagon className="h-10 w-10 animate-bounce" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            Something went wrong!
          </h2>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred while loading this platform view.
          </p>
          {error.message && (
            <div className="mt-4 p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl font-mono text-[10px] text-rose-400 break-all text-left">
              Error details: {error.message}
            </div>
          )}
        </div>

        <button
          onClick={() => reset()}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all shadow-lg active:scale-[0.99]"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Platform View
        </button>
      </div>
    </div>
  );
}

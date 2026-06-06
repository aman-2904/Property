import * as React from "react";

export default function AdminLoading() {
  return (
    <div className="space-y-8 animate-pulse w-full">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-muted/60 rounded-xl" />
        <div className="h-4 w-96 bg-muted/40 rounded-lg" />
      </div>

      {/* Grid of stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="p-6 rounded-3xl border border-border/40 bg-zinc-900/10 glass-premium space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-muted/50 rounded-lg" />
              <div className="h-8 w-8 bg-muted/60 rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="h-7 w-36 bg-muted/70 rounded-xl" />
              <div className="h-3.5 w-24 bg-muted/40 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Double column details section */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left main content block skeleton */}
        <div className="lg:col-span-2 p-6 rounded-3xl border border-border/40 bg-zinc-900/10 glass-premium space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-5 w-48 bg-muted/60 rounded-xl" />
            <div className="h-8 w-24 bg-muted/40 rounded-lg" />
          </div>
          <div className="h-64 bg-muted/30 rounded-2xl w-full" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-muted/40 rounded-lg" />
            <div className="h-4 w-5/6 bg-muted/40 rounded-lg" />
          </div>
        </div>

        {/* Right side content block skeleton */}
        <div className="lg:col-span-1 p-6 rounded-3xl border border-border/40 bg-zinc-900/10 glass-premium space-y-6">
          <div className="h-5 w-36 bg-muted/60 rounded-xl" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-10 w-10 bg-muted/50 rounded-full shrink-0" />
                <div className="space-y-2 w-full">
                  <div className="h-4 w-2/3 bg-muted/60 rounded-lg" />
                  <div className="h-3.5 w-1/2 bg-muted/40 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

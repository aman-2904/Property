"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { StatsCard } from "@/components/dashboard/stats-card";
import { SearchFilter } from "@/components/tables/search-filter";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/tables/data-table";
import {
  Trophy,
  Award,
  Clock,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Gift,
  Car,
  ChevronRight,
  TrendingUp,
  Download,
  AlertCircle
} from "lucide-react";
import { claimReward } from "@/lib/actions/rewards";

interface AgentRewardsClientProps {
  userId: string;
  initialSummary: any;
  initialClaims: any[];
}

export function AgentRewardsClient({
  userId,
  initialSummary,
  initialClaims,
}: AgentRewardsClientProps) {
  const [summary, setSummary] = React.useState(initialSummary);
  const [claims, setClaims] = React.useState(initialClaims);
  const [isPending, startTransition] = React.useTransition();
  const [activeTab, setActiveTab] = React.useState<"all" | "eligible" | "locked" | "claimed" | "expired" | "pending">("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  
  // Notification states
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filter rewards by tab and search
  const filteredRewards = React.useMemo(() => {
    return (summary.rewards || []).filter((reward: any) => {
      const matchesTab = activeTab === "all" ? true : reward.status === activeTab;
      const matchesSearch = reward.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            reward.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            reward.rewardType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [summary.rewards, activeTab, searchQuery]);

  // Handle claim submission
  const handleClaim = async (ruleId: string, name: string) => {
    if (confirm(`Are you sure you want to claim your reward: "${name}"?`)) {
      startTransition(async () => {
        const res = await claimReward(userId, ruleId);
        if (res.error) {
          setFeedback({ type: "error", text: res.error });
        } else {
          setFeedback({ type: "success", text: `Your claim request for "${name}" has been successfully submitted! Admin has been notified.` });
          
          // Re-fetch rewards summary and claims client-side to update the UI
          const { getAgentRewardsSummary, getAgentClaimHistory } = await import("@/lib/actions/rewards");
          const updatedSummary = await getAgentRewardsSummary(userId);
          const updatedClaims = await getAgentClaimHistory(userId);
          setSummary(updatedSummary);
          setClaims(updatedClaims);
        }
      });
    }
  };

  // CSV export handler
  const handleExportCSV = () => {
    if (claims.length === 0) return;

    const headers = ["Reward Name", "Category", "Eligible Date", "Claim Date", "Approval Date", "Status", "Remarks"];
    const rows = claims.map((c) => [
      c.achievement_rules?.name || "N/A",
      c.achievement_rules?.reward_categories?.name || "N/A",
      c.request_date ? new Date(c.request_date).toLocaleDateString() : "N/A", // Approximation of eligibility
      new Date(c.request_date).toLocaleDateString(),
      c.approval_date ? new Date(c.approval_date).toLocaleDateString() : "N/A",
      c.status.toUpperCase(),
      c.remarks || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `claims_statement_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      header: "Reward",
      accessorKey: "achievement_rules.name",
      render: (row: any) => (
        <span className="font-semibold text-foreground">
          {row.achievement_rules?.name || "N/A"}
        </span>
      )
    },
    {
      header: "Category",
      accessorKey: "achievement_rules.reward_categories.name",
      render: (row: any) => (
        <span className="text-xs text-muted-foreground">
          {row.achievement_rules?.reward_categories?.name || "Associates"}
        </span>
      )
    },
    {
      header: "Claim Date",
      accessorKey: "request_date",
      render: (row: any) => (
        <span suppressHydrationWarning className="text-xs text-muted-foreground">
          {new Date(row.request_date).toLocaleDateString()}
        </span>
      )
    },
    {
      header: "Approval Date",
      accessorKey: "approval_date",
      render: (row: any) => (
        <span suppressHydrationWarning className="text-xs text-muted-foreground">
          {row.approval_date ? new Date(row.approval_date).toLocaleDateString() : "N/A"}
        </span>
      )
    },
    {
      header: "Status",
      accessorKey: "status",
      render: (row: any) => (
        <StatusBadge status={row.status} />
      )
    },
    {
      header: "Remarks",
      accessorKey: "remarks",
      render: (row: any) => (
        <span className="text-xs italic text-muted-foreground max-w-[200px] truncate block" title={row.remarks}>
          {row.remarks || "—"}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-8">
      {/* Alert Banner for Feedback */}
      {feedback && (
        <div 
          className={cn(
            "p-4 rounded-2xl border text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300",
            feedback.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          )}
        >
          {feedback.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
          <div className="flex-1">
            <p className="font-semibold">{feedback.type === "success" ? "Success!" : "Claim Request Failed"}</p>
            <p className="text-xs mt-0.5 opacity-90">{feedback.text}</p>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs hover:underline opacity-80">Dismiss</button>
        </div>
      )}

      {/* Section 1: Reward Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Eligible Rewards"
          value={summary.stats.eligible || 0}
          icon={<Gift className="h-5 w-5 text-emerald-400" />}
          description="Qualified & ready to claim"
        />
        <StatsCard
          title="Claimed Rewards"
          value={summary.stats.claimed || 0}
          icon={<CheckCircle2 className="h-5 w-5 text-indigo-400" />}
          description="Received rewards"
        />
        <StatsCard
          title="Pending Claims"
          value={summary.stats.pending || 0}
          icon={<Clock className="h-5 w-5 text-amber-400" />}
          description="Under review by admin"
        />
        <StatsCard
          title="Upcoming Rewards"
          value={summary.stats.upcoming || 0}
          icon={<Sparkles className="h-5 w-5 text-violet-400" />}
          description="Milestones locked"
        />
        <StatsCard
          title="Lifetime Qualified"
          value={summary.stats.lifetime || 0}
          icon={<Trophy className="h-5 w-5 text-yellow-400" />}
          description="Total rewards unlocked"
        />
      </div>

      {/* Section 2: Current Progress List */}
      <div className="p-6 rounded-3xl border border-border/40 bg-card text-foreground shadow-lg space-y-5">
        <div>
          <h3 className="text-lg font-bold text-foreground">Current Milestones Progress</h3>
          <p className="text-xs text-muted-foreground">Monitor your real-time sales progress toward locked reward categories</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {summary.rewards && summary.rewards.map((reward: any) => {
            if (reward.status !== "locked") return null;

            return (
              <div 
                key={reward.ruleId}
                className="p-4 rounded-2xl border border-border/30 bg-muted/10 space-y-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{reward.name}</h4>
                    <p className="text-xs text-muted-foreground">{reward.categoryName} Rule</p>
                  </div>
                  <span className="text-xs font-bold text-primary">{reward.progress.overallPercent}%</span>
                </div>

                {/* Progress bars */}
                <div className="space-y-2">
                  {reward.requiredDirectSales > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Direct Sales: {reward.progress.currentDirect} / {reward.requiredDirectSales}</span>
                        <span>{reward.progress.directPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted/65 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-300"
                          style={{ width: `${reward.progress.directPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {reward.requiredGroupSales > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Group Sales: {reward.progress.currentGroup} / {reward.requiredGroupSales}</span>
                        <span>{reward.progress.groupPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted/65 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-primary transition-all duration-300"
                          style={{ width: `${reward.progress.groupPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {reward.minPromotionLevel !== null && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <Award className={cn("h-3.5 w-3.5", reward.progress.isPromoSatisfied ? "text-emerald-400" : "text-muted-foreground")} />
                      <span className={cn("text-[10px] font-semibold", reward.progress.isPromoSatisfied ? "text-emerald-400" : "text-muted-foreground")}>
                        Req Rank: Level {reward.minPromotionLevel} ({reward.progress.isPromoSatisfied ? "Qualified" : "Locked"})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {summary.stats.upcoming === 0 && (
            <div className="col-span-2 text-center text-xs text-muted-foreground italic py-4">
              All rewards unlocked or no active rules found.
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Rewards Showcase Grid */}
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-foreground">Reward Categories Showcase</h3>
            <p className="text-xs text-muted-foreground">Browse all available rewards, view active contest details, and claim eligible gifts</p>
          </div>

          <div className="flex items-center border border-border/60 rounded-xl overflow-hidden text-xs w-fit">
            {(["all", "eligible", "pending", "claimed", "locked"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3.5 py-2 font-semibold capitalize border-r border-border/40 transition-all",
                  activeTab === tab 
                    ? "bg-primary text-primary-foreground font-bold" 
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                {tab === "eligible" ? "Eligible (Unclaimed)" : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-full md:max-w-md">
            <SearchFilter
              searchPlaceholder="Search reward by name or category..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        </div>

        {/* Dynamic Rewards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRewards.map((reward: any) => (
            <div 
              key={reward.ruleId}
              className={cn(
                "rounded-3xl border border-border/40 bg-card text-foreground shadow-lg overflow-hidden flex flex-col justify-between group hover:border-primary/20 transition-all duration-300",
                reward.status === "eligible" && "ring-1 ring-emerald-500/30 shadow-emerald-500/5 bg-gradient-to-b from-card to-emerald-500/[0.02]"
              )}
            >
              <div className="p-5 space-y-4">
                {/* Image Placeholder or Reward Image */}
                <div className="h-44 w-full rounded-2xl bg-muted/30 border border-border/30 overflow-hidden flex items-center justify-center relative">
                  {reward.imageUrl ? (
                    <img 
                      src={reward.imageUrl} 
                      alt={reward.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <Gift className="h-12 w-12 text-muted-foreground/35 group-hover:scale-110 transition-transform duration-500" />
                  )}
                  
                  {/* Status Badge Tag */}
                  <div className="absolute top-3 right-3">
                    <span 
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border",
                        reward.status === "eligible" && "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
                        reward.status === "pending" && "bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse",
                        reward.status === "claimed" && "bg-blue-500/10 border-blue-500/30 text-blue-400",
                        reward.status === "locked" && "bg-zinc-500/10 border-zinc-500/30 text-zinc-400",
                        reward.status === "expired" && "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      )}
                    >
                      {reward.status === "eligible" ? "Qualified" : reward.status === "claimed" ? "Claimed" : reward.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                    {reward.categoryName} • {reward.rewardType}
                  </span>
                  <h4 className="text-lg font-bold text-foreground truncate">{reward.name}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 h-8" title={reward.description}>
                    {reward.description || "No description provided."}
                  </p>
                </div>

                {/* Criteria Detail List */}
                <div className="space-y-2 border-t border-border/20 pt-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reward Value:</span>
                    <span className="font-semibold text-primary">{reward.rewardValue}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Required Direct:</span>
                    <span className="font-semibold text-foreground">{reward.requiredDirectSales} Sales</span>
                  </div>

                  {reward.requiredGroupSales > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Required Group:</span>
                      <span className="font-semibold text-foreground">{reward.requiredGroupSales} Sales</span>
                    </div>
                  )}

                  {reward.minPromotionLevel !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Required Rank:</span>
                      <span className="font-semibold text-foreground">Level {reward.minPromotionLevel}</span>
                    </div>
                  )}

                  {reward.differentLegsRequired && (
                    <div className="flex justify-between text-[11px] font-medium text-violet-400">
                      <span>Leg Requirement:</span>
                      <span>Different Downline Legs</span>
                    </div>
                  )}

                  {reward.endDate && (
                    <div className="flex justify-between text-muted-foreground border-t border-border/10 pt-2 text-[10px]">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Ends:
                      </span>
                      <span suppressHydrationWarning className="font-medium text-foreground">
                        {new Date(reward.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="p-5 bg-muted/10 border-t border-border/25">
                {reward.status === "eligible" ? (
                  <button
                    onClick={() => handleClaim(reward.ruleId, reward.name)}
                    disabled={isPending}
                    className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-500/50 text-emerald-foreground text-sm font-bold shadow-md shadow-emerald-500/10 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <Trophy className="h-4 w-4" />
                    {isPending ? "Claiming..." : "Claim Reward"}
                  </button>
                ) : reward.status === "pending" ? (
                  <button
                    disabled
                    className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-sm font-bold cursor-not-allowed"
                  >
                    <Clock className="h-4 w-4 animate-pulse" />
                    Pending Approval
                  </button>
                ) : reward.status === "claimed" ? (
                  <button
                    disabled
                    className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 text-sm font-bold cursor-not-allowed"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Reward Claimed
                  </button>
                ) : reward.status === "expired" ? (
                  <button
                    disabled
                    className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-sm font-bold cursor-not-allowed"
                  >
                    Expired
                  </button>
                ) : (
                  <div className="text-center text-xs text-muted-foreground font-semibold py-2">
                    Locked — Reach {reward.progress.overallPercent}% progress to qualify.
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredRewards.length === 0 && (
            <div className="col-span-3 p-12 text-center rounded-3xl border border-dashed border-border/60 bg-muted/5 text-muted-foreground">
              <Gift className="h-10 w-10 text-muted-foreground/35 mx-auto mb-3" />
              <p className="font-bold text-foreground">No rewards found</p>
              <p className="text-xs mt-1">Try matching other filters or search queries</p>
            </div>
          )}
        </div>
      </div>

      {/* Section 5: Claim History (Searchable Table) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">Claims Log & History</h3>
            <p className="text-xs text-muted-foreground">Search and audit your submitted rewards claim requests</p>
          </div>

          {claims.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center justify-center gap-2 h-9 rounded-xl border border-border/50 hover:bg-muted bg-card px-4 text-xs font-bold text-foreground transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV Statement
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-border/40 bg-card shadow shadow-indigo-500/5 overflow-hidden">
          <DataTable
            columns={columns}
            data={claims || []}
            emptyTitle="No claims registered"
            emptyDescription="You haven't qualified for or claimed any rewards yet. Meet your direct sales and group sales milestones to unlock gifts."
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { TreeVisualizer } from "@/components/network-tree/tree-visualizer";
import { ReferralCard } from "@/components/dashboard/referral-card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { DataTable } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Users, Activity, Award, User, Layers } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-states";


interface AgentNetworkClientProps {
  profile: any;
  downlineTree: any;
  downlineList: any[];
  teamStats: any;
  uplinePath: any[];
}

export function AgentNetworkClient({
  profile,
  downlineTree,
  downlineList,
  teamStats,
  uplinePath,
}: AgentNetworkClientProps) {
  const rankTitles = ["Rookie Agent", "Senior Agent", "Manager", "Director"];

  // Precompute recruits counts for each member in downlineList client-side
  const recruitsStatsMap = React.useMemo(() => {
    const directRecruitsMap = new Map<string, number>();
    const totalTeamMap = new Map<string, number>();

    // 1. Build a map of upline_id -> children list for quick lookup
    const childrenMap = new Map<string, string[]>();
    (downlineList || []).forEach((member) => {
      if (member.upline_id) {
        if (!childrenMap.has(member.upline_id)) {
          childrenMap.set(member.upline_id, []);
        }
        childrenMap.get(member.upline_id)!.push(member.id);
      }
    });

    // 2. Count directs for each member
    (downlineList || []).forEach((member) => {
      const directs = childrenMap.get(member.id)?.length ?? 0;
      directRecruitsMap.set(member.id, directs);
    });

    // 3. Count total team recursively
    function countTeam(memberId: string): number {
      const children = childrenMap.get(memberId) || [];
      let total = children.length;
      children.forEach((childId) => {
        total += countTeam(childId);
      });
      return total;
    }

    (downlineList || []).forEach((member) => {
      totalTeamMap.set(member.id, countTeam(member.id));
    });

    return { directRecruitsMap, totalTeamMap };
  }, [downlineList]);

  // Table columns for downline directory
  const columns = [
    {
      header: "Member Details",
      accessorKey: "name",
      render: (row: any) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{row.name}</span>
          <span className="text-xs text-muted-foreground">{row.email}</span>
        </div>
      ),
    },
    {
      header: "Rank",
      accessorKey: "promotion_level",
      render: (row: any) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-extrabold uppercase tracking-wide bg-primary/5 text-primary border-primary/20">
          {rankTitles[row.promotion_level] || "Rookie Agent"}
        </span>
      ),
    },
    {
      header: "Tree Depth",
      accessorKey: "level_depth",
      render: (row: any) => (
        <span className="text-sm font-semibold text-foreground/80">
          Level {row.level_depth}
        </span>
      ),
    },
    {
      header: "Direct Recruits",
      accessorKey: "direct_sales_count",
      render: (row: any) => (
        <span>
          {recruitsStatsMap.directRecruitsMap.get(row.id) ?? 0}
        </span>
      ),
    },
    {
      header: "Total Downline",
      accessorKey: "group_sales_count",
      render: (row: any) => (
        <span>
          {recruitsStatsMap.totalTeamMap.get(row.id) ?? 0}
        </span>
      ),
    },
    {
      header: "Status",
      accessorKey: "is_active",
      render: (row: any) => (
        <StatusBadge status={row.is_active ? "active" : "suspended"} />
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome & Overview Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          MLM Referral Network
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor your referral recruits network hierarchy. Expand nodes to view their networks.
        </p>
      </div>

      {/* Analytics & Referral link Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-6 grid-cols-1 sm:grid-cols-2">
          <StatsCard
            title="Direct Referrals"
            value={teamStats.directReferralsCount}
            icon={<Users className="h-5 w-5" />}
            description="Recruited with your link"
          />
          <StatsCard
            title="Total Downline Recruits"
            value={teamStats.totalTeamCount}
            icon={<Activity className="h-5 w-5" />}
            description="Across all levels in network"
          />
          <StatsCard
            title="Team Sales Volume"
            value={`₹${teamStats.totalTeamSalesAmount.toLocaleString("en-US")}`}
            icon={<Award className="h-5 w-5" />}
            description="Approved override transactions"
          />
          <StatsCard
            title="Current Level"
            value={teamStats.currentPromotionTitle}
            icon={<Layers className="h-5 w-5" />}
            description="Eligible for overrides"
          />
        </div>
        <div>
          <ReferralCard referralCode={profile.referral_code || "BOOTSTRAP"} />
        </div>
      </div>

      {/* SVG Tree Visualization Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Interactive Downline Tree</h2>
          <p className="text-xs text-muted-foreground">
            Visual map of your referral tree recursively up to 3 levels deep. Drag to pan, scroll to zoom.
          </p>
        </div>

        {downlineTree ? (
          <TreeVisualizer data={downlineTree} />
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border/50 rounded-3xl min-h-[300px] glass-premium">
            <p className="font-semibold text-foreground">No downline network recruits found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Share your referral code to recruit your first team agent!
            </p>
          </div>
        )}
      </div>

      {/* Downline Table Directory & Upline Chain Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Downline List */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-foreground">Downline Recruits Directory</h3>
            <p className="text-xs text-muted-foreground">
              Directory of all agents registered under your network branch.
            </p>
          </div>
          {downlineList.length === 0 ? (
            <EmptyState
              title="No downline members"
              description="There are no agent profiles registered under your network link yet."
            />
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  columns={columns}
                  data={downlineList}
                  emptyTitle="No downline members"
                  emptyDescription="There are no agent profiles registered under your network link yet."
                />
              </div>

              <div className="block md:hidden space-y-4">
                {downlineList.map((member) => (
                  <div
                    key={member.id}
                    className="p-5 rounded-2xl border border-border/40 bg-zinc-950/20 glass-premium space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground text-sm">{member.name}</span>
                        <span className="text-[11px] text-muted-foreground">{member.email}</span>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-extrabold uppercase tracking-wide bg-primary/5 text-primary border-primary/20">
                        {rankTitles[member.promotion_level] || "Rookie Agent"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs border-t border-border/20 pt-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[9px] uppercase tracking-wider font-semibold">Depth</span>
                        <span className="text-foreground/80 font-medium">Level {member.level_depth}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[9px] uppercase tracking-wider font-semibold">Directs</span>
                        <span className="text-foreground/80 font-medium">
                          {recruitsStatsMap.directRecruitsMap.get(member.id) ?? 0}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[9px] uppercase tracking-wider font-semibold">Downline</span>
                        <span className="text-foreground/80 font-medium">
                          {recruitsStatsMap.totalTeamMap.get(member.id) ?? 0}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t border-border/20 pt-3 text-xs">
                      <span className="text-muted-foreground text-[9px] uppercase tracking-wider font-semibold">Status</span>
                      <StatusBadge status={member.is_active ? "active" : "suspended"} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Upline Sponsor Listing */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-foreground">My Upline Sponsors</h3>
            <p className="text-xs text-muted-foreground">
              Trace the path of active sponsors from your upline to root.
            </p>
          </div>
          <div className="p-6 rounded-3xl border border-border/40 bg-zinc-950/20 glass-premium space-y-5">
            {uplinePath && uplinePath.length > 0 ? (
              <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
                {uplinePath.map((item: any) => {
                  const sponsorData = item.sponsor as any;
                  if (!sponsorData) return null;
                  return (
                    <div key={item.sponsor_id} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-[20px] top-1.5 h-3 w-3 rounded-full bg-primary border-2 border-zinc-950 shadow" />
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                            {sponsorData.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded border border-primary/20 bg-primary/5 text-[8px] font-extrabold uppercase tracking-wide text-primary">
                            {rankTitles[sponsorData.promotion_level] || "Agent"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>Level {item.step_distance} Sponsor ({sponsorData.email})</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                You are registered as a root agent with no upline sponsors.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

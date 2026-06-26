"use client";

import * as React from "react";
import { DataTable } from "@/components/tables/data-table";
import { SearchFilter } from "@/components/tables/search-filter";
import { Users, Info, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
  name: string;
  email: string;
}

interface PromotionLevelRef {
  title: string;
}

interface PromotionHistoryItem {
  id: string;
  created_at: string;
  reward_amount: number;
  status: string;
  direct_sales: number;
  group_sales: number;
  qualified_members: { id: string; name: string; promotion_level: number }[] | any;
  trigger_reason: string;
  profiles: Profile | null;
  prev_lvl: PromotionLevelRef | null;
  new_lvl: PromotionLevelRef | null;
}

interface ClientProps {
  initialHistory: PromotionHistoryItem[];
}

export function AdminPromotionHistoryClient({ initialHistory }: ClientProps) {
  const [history, setHistory] = React.useState(initialHistory);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    setHistory(initialHistory);
  }, [initialHistory]);

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      (item.profiles?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.profiles?.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.new_lvl?.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.trigger_reason || "").toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const columns = [
    {
      header: "Agent",
      accessorKey: "profiles.name",
      render: (row: PromotionHistoryItem) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{row.profiles?.name || "Unknown Agent"}</span>
          <span className="text-[10px] text-muted-foreground">{row.profiles?.email || ""}</span>
        </div>
      )
    },
    {
      header: "Previous Promotion",
      accessorKey: "prev_lvl.title",
      render: (row: PromotionHistoryItem) => (
        <span className="text-xs text-muted-foreground font-semibold">
          {row.prev_lvl?.title || "Agent (Lvl 0)"}
        </span>
      )
    },
    {
      header: "New Promotion",
      accessorKey: "new_lvl.title",
      render: (row: PromotionHistoryItem) => (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 border border-primary/25 text-primary">
          🏆 {row.new_lvl?.title || "Unknown Rank"}
        </span>
      )
    },
    {
      header: "Requirements At Trigger",
      accessorKey: "direct_sales",
      render: (row: PromotionHistoryItem) => (
        <div className="text-xs space-y-0.5">
          <div>Direct Sales: <span className="font-semibold text-foreground">{row.direct_sales}</span></div>
          <div>Group Sales: <span className="font-semibold text-foreground">{row.group_sales}</span></div>
        </div>
      )
    },
    {
      header: "Qualified Downlines",
      accessorKey: "qualified_members",
      render: (row: PromotionHistoryItem) => {
        let members: any[] = [];
        try {
          members = typeof row.qualified_members === "string" ? JSON.parse(row.qualified_members) : (row.qualified_members || []);
        } catch (e) {
          members = [];
        }

        if (!members || members.length === 0) {
          return <span className="text-xs text-muted-foreground">None</span>;
        }

        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {members.slice(0, 3).map((m: any, idx: number) => (
              <span key={m.id || idx} className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-foreground border border-border/40 truncate max-w-[80px]" title={m.name}>
                {m.name}
              </span>
            ))}
            {members.length > 3 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/5 text-primary font-bold">
                +{members.length - 3} more
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "Trigger Reason",
      accessorKey: "trigger_reason",
      render: (row: PromotionHistoryItem) => (
        <span className="text-xs text-muted-foreground italic max-w-[150px] inline-block truncate" title={row.trigger_reason}>
          {row.trigger_reason}
        </span>
      )
    },
    {
      header: "Date",
      accessorKey: "created_at",
      render: (row: PromotionHistoryItem) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span suppressHydrationWarning>{new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Search filter panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-border/40 bg-card text-foreground shadow-lg">
        <div className="w-full md:max-w-md">
          <SearchFilter
            searchPlaceholder="Search by Agent name, email, or rank..."
            searchValue={search}
            onSearchChange={setSearch}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-primary" />
          <span>Ranks are calculated automatically after each sale approval.</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-border/40 bg-card shadow-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredHistory}
          emptyTitle="No promotion history records found"
          emptyDescription="Perform approved sales to trigger promotions."
        />
      </div>
    </div>
  );
}

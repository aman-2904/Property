"use client";

import * as React from "react";
import { DataTable } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchFilter } from "@/components/tables/search-filter";
import { Download } from "lucide-react";

interface ClaimRecord {
  id: string;
  request_date: string;
  approval_date: string | null;
  status: "approved" | "rejected";
  remarks: string | null;
  profiles: {
    name: string | null;
    email: string;
    promotion_levels: { title: string } | null;
  } | null;
  achievement_rules: {
    name: string;
    reward_type: string;
    reward_value: string;
  } | null;
}

interface ClientProps {
  initialHistory: ClaimRecord[];
}

export function AdminRewardClaimsHistoryClient({ initialHistory }: ClientProps) {
  const [history, setHistory] = React.useState(initialHistory);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "approved" | "rejected">("all");

  React.useEffect(() => {
    setHistory(initialHistory);
  }, [initialHistory]);

  const filteredHistory = React.useMemo(() => {
    return history.filter((item) => {
      const matchesStatus = statusFilter === "all" ? true : item.status === statusFilter;
      const matchesSearch = 
        (item.profiles?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.profiles?.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.achievement_rules?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.achievement_rules?.reward_type || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [history, searchQuery, statusFilter]);

  const handleExportCSV = () => {
    if (filteredHistory.length === 0) return;

    const headers = ["Agent Name", "Agent Email", "Reward Name", "Type", "Value", "Request Date", "Processed Date", "Status", "Remarks"];
    const rows = filteredHistory.map((c) => [
      c.profiles?.name || "N/A",
      c.profiles?.email || "N/A",
      c.achievement_rules?.name || "N/A",
      c.achievement_rules?.reward_type || "N/A",
      c.achievement_rules?.reward_value || "N/A",
      new Date(c.request_date).toLocaleString(),
      c.approval_date ? new Date(c.approval_date).toLocaleString() : "N/A",
      c.status.toUpperCase(),
      c.remarks || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `claims_audit_trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      header: "Agent",
      accessorKey: "profiles.name",
      render: (row: ClaimRecord) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{row.profiles?.name || "Unknown Agent"}</span>
          <span className="text-[10px] text-muted-foreground">{row.profiles?.email}</span>
        </div>
      )
    },
    {
      header: "Rank",
      accessorKey: "profiles.promotion_levels.title",
      render: (row: ClaimRecord) => (
        <span className="text-xs text-muted-foreground">
          {row.profiles?.promotion_levels?.title || "Agent"}
        </span>
      )
    },
    {
      header: "Claimed Reward",
      accessorKey: "achievement_rules.name",
      render: (row: ClaimRecord) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{row.achievement_rules?.name}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            {row.achievement_rules?.reward_type} • {row.achievement_rules?.reward_value}
          </span>
        </div>
      )
    },
    {
      header: "Date Requested",
      accessorKey: "request_date",
      render: (row: ClaimRecord) => (
        <span suppressHydrationWarning className="text-xs text-muted-foreground">
          {new Date(row.request_date).toLocaleDateString()}
        </span>
      )
    },
    {
      header: "Date Audited",
      accessorKey: "approval_date",
      render: (row: ClaimRecord) => (
        <span suppressHydrationWarning className="text-xs text-muted-foreground">
          {row.approval_date ? new Date(row.approval_date).toLocaleDateString() : "—"}
        </span>
      )
    },
    {
      header: "Status",
      accessorKey: "status",
      render: (row: ClaimRecord) => (
        <StatusBadge status={row.status} />
      )
    },
    {
      header: "Remarks / Audit Notes",
      accessorKey: "remarks",
      render: (row: ClaimRecord) => (
        <span className="text-xs italic text-muted-foreground max-w-[220px] truncate block" title={row.remarks || ""}>
          {row.remarks || "—"}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <div className="w-full sm:max-w-xs">
            <SearchFilter
              searchPlaceholder="Search agent or reward..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-10 px-3 rounded-xl border border-border/50 bg-card text-foreground text-xs font-semibold focus:outline-none focus:border-primary transition-all w-fit cursor-pointer"
          >
            <option value="all">All Audited Statuses</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {filteredHistory.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-border/50 hover:bg-muted bg-card px-4 text-xs font-bold text-foreground transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Export Audit CSV
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredHistory}
          emptyTitle="No Audit History Found"
          emptyDescription="There are no processed claims matching the current filters."
        />
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { DataTable } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchFilter } from "@/components/tables/search-filter";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Download, Trophy, Gift, Clock, XCircle, Award } from "lucide-react";

interface RewardReport {
  claimId: string;
  agentName: string;
  agentEmail: string;
  agentRank: string;
  rewardName: string;
  rewardType: string;
  rewardValue: string;
  requestDate: string;
  approvalDate: string | null;
  status: "pending" | "approved" | "rejected";
  remarks: string;
}

interface ClientProps {
  initialReports: RewardReport[];
}

export function AdminRewardReportsClient({ initialReports }: ClientProps) {
  const [reports, setReports] = React.useState(initialReports);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "approved" | "pending" | "rejected">("all");

  React.useEffect(() => {
    setReports(initialReports);
  }, [initialReports]);

  // Dynamic filter
  const filteredReports = React.useMemo(() => {
    return reports.filter((r) => {
      const matchesStatus = statusFilter === "all" ? true : r.status === statusFilter;
      const matchesSearch = 
        r.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.agentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.rewardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.rewardType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [reports, searchQuery, statusFilter]);

  // Aggregate stats based on total reports
  const stats = React.useMemo(() => {
    const total = reports.length;
    const approved = reports.filter(r => r.status === "approved").length;
    const pending = reports.filter(r => r.status === "pending").length;
    const rejected = reports.filter(r => r.status === "rejected").length;

    // Approximate Cash value sum
    let cashSum = 0;
    reports.forEach(r => {
      if (r.status === "approved" && r.rewardType === "Cash") {
        // Try extracting numeric value (e.g. ₹50,000 -> 50000)
        const num = Number(r.rewardValue.replace(/[^0-9.]/g, ""));
        if (!isNaN(num)) {
          cashSum += num;
        }
      }
    });

    return { total, approved, pending, rejected, cashSum };
  }, [reports]);

  // Distribution by reward type
  const typeDistribution = React.useMemo(() => {
    const counts: Record<string, number> = { "Physical Gift": 0, "Cash": 0, "Vehicle": 0, "Other": 0 };
    reports.forEach((r) => {
      if (r.status === "approved") {
        counts[r.rewardType] = (counts[r.rewardType] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reports]);

  const handleExportCSV = () => {
    if (filteredReports.length === 0) return;

    const headers = ["Claim ID", "Agent Name", "Agent Email", "Agent Rank", "Reward Name", "Reward Type", "Reward Value", "Request Date", "Processed Date", "Status", "Remarks"];
    const rows = filteredReports.map((r) => [
      r.claimId,
      r.agentName,
      r.agentEmail,
      r.agentRank,
      r.rewardName,
      r.rewardType,
      r.rewardValue,
      new Date(r.requestDate).toLocaleString(),
      r.approvalDate ? new Date(r.approvalDate).toLocaleString() : "N/A",
      r.status.toUpperCase(),
      r.remarks || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rewards_distribution_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      header: "Agent Details",
      accessorKey: "agentName",
      render: (row: RewardReport) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{row.agentName}</span>
          <span className="text-[10px] text-muted-foreground">{row.agentEmail}</span>
        </div>
      )
    },
    {
      header: "Agent Rank",
      accessorKey: "agentRank",
      render: (row: RewardReport) => (
        <span className="text-xs font-semibold text-foreground">{row.agentRank}</span>
      )
    },
    {
      header: "Reward Details",
      accessorKey: "rewardName",
      render: (row: RewardReport) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{row.rewardName}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            {row.rewardType} • {row.rewardValue}
          </span>
        </div>
      )
    },
    {
      header: "Requested Date",
      accessorKey: "requestDate",
      render: (row: RewardReport) => (
        <span suppressHydrationWarning className="text-xs text-muted-foreground">
          {new Date(row.requestDate).toLocaleDateString()}
        </span>
      )
    },
    {
      header: "Audited Date",
      accessorKey: "approvalDate",
      render: (row: RewardReport) => (
        <span suppressHydrationWarning className="text-xs text-muted-foreground">
          {row.approvalDate ? new Date(row.approvalDate).toLocaleDateString() : "—"}
        </span>
      )
    },
    {
      header: "Status",
      accessorKey: "status",
      render: (row: RewardReport) => (
        <StatusBadge status={row.status} />
      )
    },
    {
      header: "Remarks / Audit Notes",
      accessorKey: "remarks",
      render: (row: RewardReport) => (
        <span className="text-xs italic text-muted-foreground max-w-[200px] truncate block" title={row.remarks || ""}>
          {row.remarks || "—"}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Total Claims"
          value={stats.total}
          icon={<Trophy className="h-5 w-5 text-indigo-400" />}
          description="Submitted claim requests"
        />
        <StatsCard
          title="Approved Claims"
          value={stats.approved}
          icon={<Award className="h-5 w-5 text-emerald-400" />}
          description="Successful rewards claimed"
        />
        <StatsCard
          title="Pending Claims"
          value={stats.pending}
          icon={<Clock className="h-5 w-5 text-amber-400" />}
          description="Awaiting review"
        />
        <StatsCard
          title="Rejected Claims"
          value={stats.rejected}
          icon={<XCircle className="h-5 w-5 text-rose-400" />}
          description="Declined requests"
        />
        <StatsCard
          title="Approved Cash Value"
          value={`₹${stats.cashSum.toLocaleString()}`}
          icon={<Gift className="h-5 w-5 text-yellow-400" />}
          description="Total cash bonuses awarded"
        />
      </div>

      {/* Distribution Breakdowns */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="p-6 rounded-3xl border border-border/40 bg-card text-foreground shadow-lg col-span-1 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Approved Rewards by Type</h3>
            <p className="text-[10px] text-muted-foreground">Breakdown of physical vs monetary prizes awarded</p>
          </div>
          <div className="space-y-3">
            {typeDistribution.map((t) => (
              <div key={t.name} className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-semibold">{t.name}</span>
                <span className="font-bold text-foreground bg-muted/30 border border-border/30 rounded-lg px-2.5 py-0.5">{t.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-border/40 bg-card text-foreground shadow-lg col-span-2 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Elit buildtech MLM Rewards Distribution Summary</h3>
            <p className="text-[10px] text-muted-foreground">Detailed metrics overview of all logged agent reward claims</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-2xl border border-border/30 bg-muted/10 space-y-1">
              <span className="text-muted-foreground font-medium block">Unlock Success Rate</span>
              <span className="text-lg font-bold text-emerald-400">
                {stats.total > 0 ? `${Math.round((stats.approved / stats.total) * 100)}%` : "0%"}
              </span>
            </div>
            <div className="p-3 rounded-2xl border border-border/30 bg-muted/10 space-y-1">
              <span className="text-muted-foreground font-medium block">Audited Claims Ratio</span>
              <span className="text-lg font-bold text-primary">
                {stats.total > 0 ? `${Math.round(((stats.approved + stats.rejected) / stats.total) * 100)}%` : "0%"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reports Data Table */}
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
              <option value="all">All Claims Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {filteredReports.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-border/50 hover:bg-muted bg-card px-4 text-xs font-bold text-foreground transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV Statement
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
          <DataTable
            columns={columns}
            data={filteredReports}
            emptyTitle="No Distribution Reports Found"
            emptyDescription="There are no processed or pending claims matching the criteria."
          />
        </div>
      </div>
    </div>
  );
}

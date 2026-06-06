"use client";

import * as React from "react";
import { DataTable } from "@/components/tables/data-table";
import { SearchFilter } from "@/components/tables/search-filter";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal, ModalPortal, ModalOverlay, ModalContent, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal-system";
import { TreeVisualizer } from "@/components/network-tree/tree-visualizer";
import { updateAgentProfile, getDownlineTree } from "@/lib/actions/network";
import { Eye, Edit3, ShieldAlert, ShieldCheck, CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  name: string;
  email: string;
  promotion_level: number;
  is_active: boolean;
  created_at: string;
  upline: {
    name: string;
  } | null;
}

interface AdminAgentsClientProps {
  initialAgents: Agent[];
}

export function AdminAgentsClient({ initialAgents }: AdminAgentsClientProps) {
  const router = useRouter();
  const [agents, setAgents] = React.useState(initialAgents);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("");
  
  const [selectedAgent, setSelectedAgent] = React.useState<Agent | null>(null);
  const [treeData, setTreeData] = React.useState<any | null>(null);
  
  const [isTreeOpen, setIsTreeOpen] = React.useState(false);
  const [isTreeLoading, setIsTreeLoading] = React.useState(false);
  
  const [isRankOpen, setIsRankOpen] = React.useState(false);
  const [selectedRank, setSelectedRank] = React.useState("");
  
  const [isLoading, setIsLoading] = React.useState(false);
  const [showToast, setShowToast] = React.useState<string | null>(null);

  const rankTitles = ["Rookie Agent", "Senior Agent", "Manager", "Director"];

  React.useEffect(() => {
    setAgents(initialAgents);
  }, [initialAgents]);

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "" ? true : (rankTitles[agent.promotion_level] || "Rookie Agent") === filter;
    return matchesSearch && matchesFilter;
  });

  const handleToggleStatus = async (agent: Agent) => {
    setIsLoading(true);
    const newStatus = agent.is_active ? "suspended" : "active";
    const res = await updateAgentProfile(agent.id, { status: newStatus });
    setIsLoading(false);

    if (res && res.error) {
      alert(`Error: ${res.error}`);
    } else {
      triggerToast(`Agent status updated to ${newStatus}.`);
      router.refresh();
    }
  };

  const handleRankUpdate = async () => {
    if (!selectedAgent) return;
    setIsLoading(true);
    const res = await updateAgentProfile(selectedAgent.id, { rank: selectedRank as any });
    setIsLoading(false);

    if (res && res.error) {
      alert(`Error updating rank: ${res.error}`);
    } else {
      setIsRankOpen(false);
      triggerToast(`Agent rank updated to ${selectedRank}!`);
      router.refresh();
    }
  };

  const handleViewTree = async (agent: Agent) => {
    setSelectedAgent(agent);
    setIsTreeOpen(true);
    setIsTreeLoading(true);
    setTreeData(null);
    
    // Admins view the entire network tree (no depth limit)
    const tree = await getDownlineTree(agent.id);
    setTreeData(tree);
    setIsTreeLoading(false);
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 4000);
  };

  const columns = [
    {
      header: "Agent Details",
      accessorKey: "name",
      render: (row: Agent) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{row.name}</span>
          <span className="text-xs text-muted-foreground">{row.email}</span>
        </div>
      ),
    },
    {
      header: "Sponsor",
      accessorKey: "upline.name",
      render: (row: Agent) => (
        <span className="text-sm font-semibold text-foreground/80">
          {row.upline?.name || "None (Root)"}
        </span>
      ),
    },
    {
      header: "Rank",
      accessorKey: "promotion_level",
      render: (row: Agent) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-extrabold uppercase tracking-wide bg-primary/5 text-primary border-primary/20">
          {rankTitles[row.promotion_level] || "Rookie Agent"}
        </span>
      ),
    },
    {
      header: "Status",
      accessorKey: "is_active",
      render: (row: Agent) => <StatusBadge status={row.is_active ? "active" : "suspended"} />,
    },
    {
      header: "Registered Date",
      accessorKey: "created_at",
      render: (row: Agent) => (
        <span suppressHydrationWarning>{new Date(row.created_at).toLocaleDateString()}</span>
      ),
    },
    {
      header: "Actions",
      render: (row: Agent) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewTree(row)}
            className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 transition-all"
            title="View Downline Tree"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedAgent(row);
              setSelectedRank(rankTitles[row.promotion_level] || "Rookie Agent");
              setIsRankOpen(true);
            }}
            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-black border border-amber-500/20 transition-all"
            title="Change Rank"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleToggleStatus(row)}
            disabled={isLoading}
            className={cn(
              "p-1.5 rounded-lg border transition-all",
              row.is_active
                ? "bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border-rose-500/20"
                : "bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border-emerald-500/20"
            )}
            title={row.is_active ? "Suspend Agent" : "Activate Agent"}
          >
            {row.is_active ? (
              <ShieldAlert className="h-4 w-4" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
          </button>
        </div>
      ),
      className: "w-32 text-center",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search agents by name or email..."
        filterValue={filter}
        onFilterChange={setFilter}
        filterOptions={[
          { value: "Rookie Agent", label: "Rookie Agent" },
          { value: "Senior Agent", label: "Senior Agent" },
          { value: "Manager", label: "Manager" },
          { value: "Director", label: "Director" },
        ]}
        filterPlaceholder="All Ranks"
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredAgents}
        emptyTitle="No agents registered"
        emptyDescription="There are no agent profiles registered under this platform yet."
      />

      {/* Tree Modal */}
      <Modal open={isTreeOpen} onOpenChange={setIsTreeOpen}>
        <ModalPortal>
          <ModalOverlay />
          <ModalContent isOpen={isTreeOpen} className="max-w-4xl max-h-[85vh] overflow-y-auto border border-border/50">
            <ModalHeader>
              <ModalTitle>Downline Tree: {selectedAgent?.name}</ModalTitle>
            </ModalHeader>
            <div className="mt-4 min-h-[400px] flex items-center justify-center">
              {isTreeLoading ? (
                <div className="flex flex-col items-center gap-2.5">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Calculating downline nodes...</span>
                </div>
              ) : treeData ? (
                <TreeVisualizer data={treeData} />
              ) : (
                <p className="text-sm text-muted-foreground">Failed to calculate tree hierarchy.</p>
              )}
            </div>
          </ModalContent>
        </ModalPortal>
      </Modal>

      {/* Rank Modal */}
      <Modal open={isRankOpen} onOpenChange={setIsRankOpen}>
        <ModalPortal>
          <ModalOverlay />
          <ModalContent isOpen={isRankOpen} className="max-w-sm">
            <ModalHeader>
              <ModalTitle>Modify Agent Rank</ModalTitle>
            </ModalHeader>
            <div className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Manually adjust the rank of **{selectedAgent?.name}**.
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                  Select Rank
                </label>
                <select
                  value={selectedRank}
                  onChange={(e) => setSelectedRank(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all text-foreground cursor-pointer"
                >
                  <option value="Rookie Agent">Rookie Agent</option>
                  <option value="Senior Agent">Senior Agent</option>
                  <option value="Manager">Manager</option>
                  <option value="Director">Director</option>
                </select>
              </div>
            </div>
            <ModalFooter className="mt-6 flex gap-2">
              <button
                disabled={isLoading}
                onClick={() => setIsRankOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                disabled={isLoading}
                onClick={handleRankUpdate}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 px-4 py-2 text-sm font-bold transition-all shadow"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Rank"}
              </button>
            </ModalFooter>
          </ModalContent>
        </ModalPortal>
      </Modal>

      {/* Toast Alert */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl bg-zinc-900 border border-border/50 text-white font-semibold text-sm shadow-2xl"
          >
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
            <span>{showToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

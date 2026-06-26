"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/tables/data-table";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal-system";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  createAchievementRule,
  updateAchievementRule,
  deleteAchievementRule,
} from "@/lib/actions/rewards";
import { Edit2, Trash2, Plus, Calendar, Gift, Award, TrendingUp, Info } from "lucide-react";

interface RewardCategory {
  id: string;
  name: string;
}

interface PromotionLevel {
  level: number;
  title: string;
}

interface AchievementRule {
  id: string;
  name: string;
  category_id: string | null;
  reward_categories?: { name: string } | null;
  required_direct_sales: number;
  required_group_sales: number;
  min_promotion_level: number | null;
  reward_type: 'Physical Gift' | 'Cash' | 'Vehicle' | 'Other';
  reward_value: string;
  start_date: string | null;
  end_date: string | null;
  status: 'active' | 'disabled';
  display_order: number;
  description: string | null;
  different_legs_required: boolean;
  max_claims_per_user: number;
  image_url: string | null;
  created_at: string;
}

interface ClientProps {
  initialRules: AchievementRule[];
  categories: RewardCategory[];
  promotionLevels: PromotionLevel[];
}

export function AdminAchievementRulesClient({ initialRules, categories, promotionLevels }: ClientProps) {
  const router = useRouter();
  const [rules, setRules] = React.useState(initialRules);
  const [selectedRule, setSelectedRule] = React.useState<AchievementRule | null>(null);
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Form states
  const [formData, setFormData] = React.useState({
    name: "",
    category_id: "none",
    required_direct_sales: 0,
    required_group_sales: 0,
    min_promotion_level: "none",
    reward_type: "Physical Gift",
    reward_value: "",
    start_date: "",
    end_date: "",
    status: "active",
    display_order: 0,
    description: "",
    different_legs_required: false,
    max_claims_per_user: 1,
    image_url: "",
  });

  React.useEffect(() => {
    setRules(initialRules);
  }, [initialRules]);

  // Format date helper for datetime-local inputs
  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const tzoffset = date.getTimezoneOffset() * 60000; //offset in milliseconds
    const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  const resetForm = (rule?: AchievementRule) => {
    setErrorMsg(null);
    if (rule) {
      setFormData({
        name: rule.name,
        category_id: rule.category_id || "none",
        required_direct_sales: rule.required_direct_sales,
        required_group_sales: rule.required_group_sales,
        min_promotion_level: rule.min_promotion_level !== null ? String(rule.min_promotion_level) : "none",
        reward_type: rule.reward_type,
        reward_value: rule.reward_value,
        start_date: formatDateForInput(rule.start_date),
        end_date: formatDateForInput(rule.end_date),
        status: rule.status,
        display_order: rule.display_order,
        description: rule.description || "",
        different_legs_required: rule.different_legs_required,
        max_claims_per_user: rule.max_claims_per_user,
        image_url: rule.image_url || "",
      });
    } else {
      const nextOrder = rules.length > 0 ? Math.max(...rules.map(r => r.display_order)) + 1 : 0;
      setFormData({
        name: "",
        category_id: categories.length > 0 ? categories[0].id : "none",
        required_direct_sales: 0,
        required_group_sales: 0,
        min_promotion_level: "none",
        reward_type: "Physical Gift",
        reward_value: "",
        start_date: "",
        end_date: "",
        status: "active",
        display_order: nextOrder,
        description: "",
        different_legs_required: false,
        max_claims_per_user: 1,
        image_url: "",
      });
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.reward_value) {
      setErrorMsg("Rule Name and Reward Value are required.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    const res = await createAchievementRule(formData);
    setIsLoading(false);

    if (res && res.error) {
      setErrorMsg(res.error);
    } else {
      setIsCreateOpen(false);
      router.refresh();
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRule) return;
    if (!formData.name || !formData.reward_value) {
      setErrorMsg("Rule Name and Reward Value are required.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    const res = await updateAchievementRule(selectedRule.id, formData);
    setIsLoading(false);

    if (res && res.error) {
      setErrorMsg(res.error);
    } else {
      setIsEditOpen(false);
      router.refresh();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRule) return;
    setIsLoading(true);
    setErrorMsg(null);
    const res = await deleteAchievementRule(selectedRule.id);
    setIsLoading(false);

    if (res && res.error) {
      alert(`Error: ${res.error}`);
    } else {
      setIsDeleteOpen(false);
      router.refresh();
    }
  };

  const columns = [
    {
      header: "Order",
      accessorKey: "display_order",
      render: (row: AchievementRule) => (
        <span className="font-semibold text-muted-foreground">#{row.display_order}</span>
      )
    },
    {
      header: "Rule Name",
      accessorKey: "name",
      render: (row: AchievementRule) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{row.name}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            {row.reward_categories?.name || "Associates"} • {row.reward_type}
          </span>
        </div>
      )
    },
    {
      header: "Sales Targets",
      accessorKey: "targets",
      render: (row: AchievementRule) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Direct:</span>
            <span className="font-semibold text-foreground">{row.required_direct_sales}</span>
          </div>
          {row.required_group_sales > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Group:</span>
              <span className="font-semibold text-foreground">{row.required_group_sales}</span>
            </div>
          )}
        </div>
      )
    },
    {
      header: "Reward Details",
      accessorKey: "reward_value",
      render: (row: AchievementRule) => (
        <div className="flex flex-col">
          <span className="font-bold text-primary">{row.reward_value}</span>
          {row.different_legs_required && (
            <span className="text-[9px] bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded px-1 w-fit mt-0.5 font-bold">
              Multi-Leg Req
            </span>
          )}
        </div>
      )
    },
    {
      header: "Req Rank",
      accessorKey: "min_promotion_level",
      render: (row: AchievementRule) => (
        <span className="text-xs font-semibold text-foreground">
          {row.min_promotion_level !== null ? `Level ${row.min_promotion_level}+` : "None"}
        </span>
      )
    },
    {
      header: "Contest Period",
      accessorKey: "period",
      render: (row: AchievementRule) => {
        if (!row.start_date && !row.end_date) return <span className="text-xs text-muted-foreground">Lifetime</span>;
        return (
          <div suppressHydrationWarning className="text-[10px] text-muted-foreground space-y-0.5">
            {row.start_date && <div>Start: {new Date(row.start_date).toLocaleDateString()}</div>}
            {row.end_date && <div>End: {new Date(row.end_date).toLocaleDateString()}</div>}
          </div>
        );
      }
    },
    {
      header: "Status",
      accessorKey: "status",
      render: (row: AchievementRule) => (
        <StatusBadge status={row.status} />
      )
    },
    {
      header: "Actions",
      accessorKey: "actions",
      render: (row: AchievementRule) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedRule(row);
              resetForm(row);
              setIsEditOpen(true);
            }}
            className="p-2 rounded-lg border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title="Edit Rule"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedRule(row);
              setIsDeleteOpen(true);
            }}
            className="p-2 rounded-lg border border-red-500/10 hover:bg-red-500/10 text-red-400 transition-all cursor-pointer"
            title="Delete Rule"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Reward Rule
        </button>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
        <DataTable
          columns={columns}
          data={rules}
          emptyTitle="No Achievement Rules Found"
          emptyDescription="Configure MLM rewards, milestone targets, and contest eligibility rules."
        />
      </div>

      {/* CREATE/EDIT MODAL TEMPLATE */}
      {(isCreateOpen || isEditOpen) && (
        <Modal 
          open={isCreateOpen || isEditOpen} 
          onOpenChange={(open) => {
            setIsCreateOpen(false);
            setIsEditOpen(false);
          }}
        >
          <ModalContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col">
            <ModalHeader>
              <ModalTitle>{isCreateOpen ? "Create Reward Rule" : "Edit Reward Rule"}</ModalTitle>
            </ModalHeader>
            <form onSubmit={isCreateOpen ? handleCreateSubmit : handleEditSubmit} className="space-y-4 py-2 flex flex-col overflow-hidden">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Scrollable container for fields */}
              <div className="space-y-4 overflow-y-auto pr-1 max-h-[60vh]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Rule Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Bullet Bike, Baleno Car"
                      className="w-full h-11 px-4 rounded-xl border border-border/50 bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary transition-all"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Reward Category</label>
                    <select
                      className="w-full h-11 px-3 rounded-xl border border-border/50 bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary transition-all"
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    >
                      <option value="none">No Category (Uncategorized)</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Reward Type</label>
                    <select
                      className="w-full h-11 px-3 rounded-xl border border-border/50 bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary transition-all"
                      value={formData.reward_type}
                      onChange={(e) => setFormData({ ...formData, reward_type: e.target.value as any })}
                    >
                      <option value="Physical Gift">Physical Gift</option>
                      <option value="Cash">Cash</option>
                      <option value="Vehicle">Vehicle</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Reward Value</label>
                    <input
                      type="text"
                      placeholder="e.g. ₹50,000 Cash, Maruti Suzuki Swift"
                      className="w-full h-11 px-4 rounded-xl border border-border/50 bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary transition-all"
                      value={formData.reward_value}
                      onChange={(e) => setFormData({ ...formData, reward_value: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Required Direct Sales</label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full h-11 px-4 rounded-xl border border-border/50 bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary transition-all"
                      value={formData.required_direct_sales}
                      onChange={(e) => setFormData({ ...formData, required_direct_sales: Math.max(0, Number(e.target.value)) })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Required Group Sales</label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full h-11 px-4 rounded-xl border border-border/50 bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary transition-all"
                      value={formData.required_group_sales}
                      onChange={(e) => setFormData({ ...formData, required_group_sales: Math.max(0, Number(e.target.value)) })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Minimum Rank Requirement</label>
                    <select
                      className="w-full h-11 px-3 rounded-xl border border-border/50 bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary transition-all"
                      value={formData.min_promotion_level}
                      onChange={(e) => setFormData({ ...formData, min_promotion_level: e.target.value })}
                    >
                      <option value="none">No Rank Required</option>
                      {promotionLevels.map((lvl) => (
                        <option key={lvl.level} value={lvl.level}>{lvl.title} (Lvl {lvl.level})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Max Claims Per Agent</label>
                    <input
                      type="number"
                      placeholder="1"
                      className="w-full h-11 px-4 rounded-xl border border-border/50 bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary transition-all"
                      value={formData.max_claims_per_user}
                      onChange={(e) => setFormData({ ...formData, max_claims_per_user: Math.max(1, Number(e.target.value)) })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Start Date</label>
                    <input
                      type="datetime-local"
                      className="w-full h-11 px-4 rounded-xl border border-border/50 bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary transition-all"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">End Date (Contest Period)</label>
                    <input
                      type="datetime-local"
                      className="w-full h-11 px-4 rounded-xl border border-border/50 bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary transition-all"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Status</label>
                    <select
                      className="w-full h-11 px-3 rounded-xl border border-border/50 bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary transition-all"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Display Order</label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full h-11 px-4 rounded-xl border border-border/50 bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary transition-all"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Image URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com/images/reward.png"
                    className="w-full h-11 px-4 rounded-xl border border-border/50 bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary transition-all"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Description</label>
                  <textarea
                    placeholder="Provide a detailed description of the reward requirements..."
                    className="w-full h-20 p-3 rounded-xl border border-border/50 bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary transition-all resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="different_legs_required"
                    className="h-4.5 w-4.5 rounded border-border bg-muted/25 focus:ring-0 cursor-pointer"
                    checked={formData.different_legs_required}
                    onChange={(e) => setFormData({ ...formData, different_legs_required: e.target.checked })}
                  />
                  <label htmlFor="different_legs_required" className="text-xs font-bold text-muted-foreground cursor-pointer select-none">
                    Require multi-leg sales distribution (at least 2 downline branches contributing sales)
                  </label>
                </div>
              </div>

              <ModalFooter className="pt-2 border-t border-border/10 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setIsEditOpen(false);
                  }}
                  className="h-10 px-4 rounded-xl border border-border/50 hover:bg-muted text-muted-foreground text-sm font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-semibold transition-all cursor-pointer"
                >
                  {isLoading ? "Saving..." : isCreateOpen ? "Create Rule" : "Update Rule"}
                </button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>
      )}

      {/* DELETE DIALOG */}
      {isDeleteOpen && selectedRule && (
        <ConfirmationDialog
          isOpen={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Delete Achievement Rule?"
          description={`Are you sure you want to delete "${selectedRule.name}"? This action cannot be undone. Agent qualifications and pending claims for this rule will be deleted.`}
          confirmText="Yes, Delete"
          cancelText="No, Cancel"
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

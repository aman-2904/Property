"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter, ModalPortal, ModalOverlay } from "@/components/ui/modal-system";
import {
  createPromotionLevel,
  updatePromotionLevel,
  deletePromotionLevel,
} from "@/lib/actions/promotions";
import { Edit2, Trash2, Plus, Power, HelpCircle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromotionLevel {
  level: number;
  title: string;
  required_direct_sales: number;
  required_group_sales: number;
  reward_amount: number;
  personal_sale_incentive: number;
  display_order: number;
  status: "active" | "disabled";
  required_prev_promotion_level: number | null;
  required_prev_promotion_count: number;
  different_legs_required: boolean;
  parent_level?: {
    level: number;
    title: string;
  } | null;
}

interface ClientProps {
  initialLevels: PromotionLevel[];
}

export function AdminPromotionLevelsClient({ initialLevels }: ClientProps) {
  const router = useRouter();
  const [levels, setLevels] = React.useState(initialLevels);
  const [selectedLevel, setSelectedLevel] = React.useState<PromotionLevel | null>(null);
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Form states
  const [formData, setFormData] = React.useState({
    level: 0,
    title: "",
    required_direct_sales: 0,
    required_group_sales: 0,
    personal_sale_incentive: 0,
    display_order: 0,
    status: "active" as "active" | "disabled",
    required_prev_promotion_level: "none" as string | number,
    required_prev_promotion_count: 0,
    different_legs_required: false,
    reward_amount: 0
  });

  React.useEffect(() => {
    setLevels(initialLevels);
  }, [initialLevels]);

  const resetForm = (lvl?: PromotionLevel) => {
    setErrorMsg(null);
    if (lvl) {
      setFormData({
        level: lvl.level,
        title: lvl.title,
        required_direct_sales: lvl.required_direct_sales,
        required_group_sales: lvl.required_group_sales,
        personal_sale_incentive: Number(lvl.personal_sale_incentive),
        display_order: lvl.display_order,
        status: lvl.status,
        required_prev_promotion_level: lvl.required_prev_promotion_level !== null ? lvl.required_prev_promotion_level : "none",
        required_prev_promotion_count: lvl.required_prev_promotion_count,
        different_legs_required: lvl.different_legs_required,
        reward_amount: Number(lvl.reward_amount)
      });
    } else {
      // Find next level number
      const nextLvl = levels.length > 0 ? Math.max(...levels.map(l => l.level)) + 1 : 1;
      setFormData({
        level: nextLvl,
        title: "",
        required_direct_sales: 0,
        required_group_sales: 0,
        personal_sale_incentive: 0,
        display_order: nextLvl,
        status: "active",
        required_prev_promotion_level: "none",
        required_prev_promotion_count: 0,
        different_legs_required: false,
        reward_amount: 0
      });
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      setErrorMsg("Promotion Name is required.");
      return;
    }
    // Check if level number is already taken
    if (levels.some(l => l.level === formData.level)) {
      setErrorMsg(`Level number ${formData.level} is already taken.`);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    const res = await createPromotionLevel(formData);
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
    if (!selectedLevel) return;
    if (!formData.title) {
      setErrorMsg("Promotion Name is required.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    const res = await updatePromotionLevel(selectedLevel.level, formData);
    setIsLoading(false);

    if (res && res.error) {
      setErrorMsg(res.error);
    } else {
      setIsEditOpen(false);
      router.refresh();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedLevel) return;
    setIsLoading(true);
    setErrorMsg(null);
    const res = await deletePromotionLevel(selectedLevel.level);
    setIsLoading(false);

    if (res && res.error) {
      alert(`Error: ${res.error}`);
    } else {
      setIsDeleteOpen(false);
      router.refresh();
    }
  };

  const handleToggleStatus = async (lvl: PromotionLevel) => {
    setIsLoading(true);
    const updatedStatus = lvl.status === "active" ? "disabled" : ("active" as any);
    const res = await updatePromotionLevel(lvl.level, {
      ...lvl,
      required_prev_promotion_level: lvl.required_prev_promotion_level !== null ? lvl.required_prev_promotion_level : "none",
      status: updatedStatus
    });
    setIsLoading(false);
    if (res && res.error) {
      alert(`Failed to change status: ${res.error}`);
    } else {
      router.refresh();
    }
  };

  const columns = [
    {
      header: "Display Order",
      accessorKey: "display_order",
      render: (row: PromotionLevel) => (
        <span className="font-semibold text-muted-foreground">#{row.display_order}</span>
      )
    },
    {
      header: "Level",
      accessorKey: "level",
      render: (row: PromotionLevel) => (
        <span className="font-bold text-foreground">Lvl {row.level}</span>
      )
    },
    {
      header: "Promotion Name",
      accessorKey: "title",
      render: (row: PromotionLevel) => (
        <span className="font-bold bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          {row.title}
        </span>
      )
    },
    {
      header: "Milestone Requirements",
      accessorKey: "required_direct_sales",
      render: (row: PromotionLevel) => (
        <div className="text-xs space-y-0.5">
          <div>Direct Sales: <span className="font-semibold text-foreground">{row.required_direct_sales}</span></div>
          <div>Group Sales: <span className="font-semibold text-foreground">{row.required_group_sales}</span></div>
        </div>
      )
    },
    {
      header: "Incentive Per Sale",
      accessorKey: "personal_sale_incentive",
      render: (row: PromotionLevel) => (
        <span className="font-bold text-emerald-500">
          ₹{Number(row.personal_sale_incentive).toLocaleString("en-IN")}
        </span>
      )
    },
    {
      header: "Qualification Rules",
      accessorKey: "required_prev_promotion_level",
      render: (row: PromotionLevel) => {
        if (row.required_prev_promotion_level === null) {
          return <span className="text-xs text-muted-foreground">None</span>;
        }
        const parentTitle = row.parent_level?.title || `Level ${row.required_prev_promotion_level}`;
        return (
          <div className="text-xs space-y-0.5">
            <div>Need: <span className="font-semibold text-foreground">{row.required_prev_promotion_count} {parentTitle}</span></div>
            <div>Legs check: <span className={cn("font-bold", row.different_legs_required ? "text-violet-400" : "text-muted-foreground")}>{row.different_legs_required ? "Different Legs" : "Any Leg"}</span></div>
          </div>
        );
      }
    },
    {
      header: "Status",
      accessorKey: "status",
      render: (row: PromotionLevel) => (
        <StatusBadge status={row.status === "active" ? "approved" : "rejected"} label={row.status === "active" ? "Active" : "Disabled"} />
      )
    },
    {
      header: "Actions",
      accessorKey: "actions",
      render: (row: PromotionLevel) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedLevel(row);
              resetForm(row);
              setIsEditOpen(true);
            }}
            className="p-2 rounded-xl border border-border/50 hover:bg-muted/50 text-foreground transition-all"
            title="Edit Level"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleToggleStatus(row)}
            disabled={isLoading}
            className={cn(
              "p-2 rounded-xl border border-border/50 transition-all",
              row.status === "active"
                ? "hover:bg-rose-500/10 text-rose-500 hover:border-rose-500/20"
                : "hover:bg-emerald-500/10 text-emerald-500 hover:border-emerald-500/20"
            )}
            title={row.status === "active" ? "Disable Level" : "Enable Level"}
          >
            <Power className="h-3.5 w-3.5" />
          </button>
          {row.level !== 0 && (
            <button
              onClick={() => {
                setSelectedLevel(row);
                setIsDeleteOpen(true);
              }}
              className="p-2 rounded-xl border border-border/50 hover:bg-destructive/10 hover:border-destructive/20 text-destructive transition-all"
              title="Delete Level"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header action panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border/40 bg-card text-foreground shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/25 text-primary">
            <Trophy className="h-6 w-6 animate-bounce" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">Ranks and Rewards</h3>
            <p className="text-xs text-muted-foreground">Manage hierarchy level limits and leg distributions</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-all w-fit"
        >
          <Plus className="h-4 w-4" />
          Create Level
        </button>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-border/40 bg-card shadow-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={levels}
          emptyTitle="No levels configured"
          emptyDescription="Configure your MLM promotion levels here."
        />
      </div>

      {/* Creation Modal */}
      <Modal open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <ModalPortal>
          <ModalOverlay />
          <ModalContent className="max-w-xl border border-border/50">
            <ModalHeader>
              <ModalTitle>Create Promotion Level</ModalTitle>
            </ModalHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4 mt-4">
              {errorMsg && (
                <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Level Number</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.level}
                    onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) || 0 }))}
                    className="w-full h-10 px-3 rounded-xl border border-border/60 bg-transparent text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Display Order</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.display_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                    className="w-full h-10 px-3 rounded-xl border border-border/60 bg-transparent text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Promotion Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Manager"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-border/60 bg-transparent text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Direct Sales Required</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.required_direct_sales}
                    onChange={(e) => setFormData(prev => ({ ...prev, required_direct_sales: parseInt(e.target.value) || 0 }))}
                    className="w-full h-10 px-3 rounded-xl border border-border/60 bg-transparent text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Group Sales Required</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.required_group_sales}
                    onChange={(e) => setFormData(prev => ({ ...prev, required_group_sales: parseInt(e.target.value) || 0 }))}
                    className="w-full h-10 px-3 rounded-xl border border-border/60 bg-transparent text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Incentive Per Sale (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.personal_sale_incentive}
                    onChange={(e) => setFormData(prev => ({ ...prev, personal_sale_incentive: parseFloat(e.target.value) || 0 }))}
                    className="w-full h-10 px-3 rounded-xl border border-border/60 bg-transparent text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-4">
                <div className="text-xs font-bold text-foreground">Qualification Rules</div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Required Previous Promotion</label>
                    <select
                      value={formData.required_prev_promotion_level}
                      onChange={(e) => setFormData(prev => ({ ...prev, required_prev_promotion_level: e.target.value === "none" ? "none" : parseInt(e.target.value) }))}
                      className="w-full h-10 px-3 rounded-xl border border-border/60 bg-card text-sm text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="none">None</option>
                      {levels.map(l => (
                        <option key={l.level} value={l.level}>{l.title} (Level {l.level})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Number Required</label>
                    <input
                      type="number"
                      min="0"
                      disabled={formData.required_prev_promotion_level === "none"}
                      value={formData.required_prev_promotion_count}
                      onChange={(e) => setFormData(prev => ({ ...prev, required_prev_promotion_count: parseInt(e.target.value) || 0 }))}
                      className="w-full h-10 px-3 rounded-xl border border-border/60 bg-transparent text-sm text-foreground focus:outline-none focus:border-primary disabled:opacity-40"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="different_legs"
                    disabled={formData.required_prev_promotion_level === "none"}
                    checked={formData.different_legs_required}
                    onChange={(e) => setFormData(prev => ({ ...prev, different_legs_required: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-40"
                  />
                  <label htmlFor="different_legs" className="text-xs font-semibold text-foreground cursor-pointer select-none disabled:opacity-40">
                    Different Legs Required (Qualified members must come from different downline legs)
                  </label>
                </div>
              </div>

              <ModalFooter>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/95 transition-all disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Save Level"}
                </button>
              </ModalFooter>
            </form>
          </ModalContent>
        </ModalPortal>
      </Modal>

      {/* Editing Modal */}
      <Modal open={isEditOpen} onOpenChange={setIsEditOpen}>
        <ModalPortal>
          <ModalOverlay />
          <ModalContent className="max-w-xl border border-border/50">
            <ModalHeader>
              <ModalTitle>Edit Promotion Level: {selectedLevel?.title}</ModalTitle>
            </ModalHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
              {errorMsg && (
                <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Level Number (ReadOnly)</label>
                  <input
                    type="number"
                    disabled
                    value={formData.level}
                    className="w-full h-10 px-3 rounded-xl border border-border/60 bg-muted/40 text-sm text-muted-foreground cursor-not-allowed focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Display Order</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.display_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                    className="w-full h-10 px-3 rounded-xl border border-border/60 bg-transparent text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Promotion Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Manager"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-border/60 bg-transparent text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Direct Sales Required</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.required_direct_sales}
                    onChange={(e) => setFormData(prev => ({ ...prev, required_direct_sales: parseInt(e.target.value) || 0 }))}
                    className="w-full h-10 px-3 rounded-xl border border-border/60 bg-transparent text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Group Sales Required</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.required_group_sales}
                    onChange={(e) => setFormData(prev => ({ ...prev, required_group_sales: parseInt(e.target.value) || 0 }))}
                    className="w-full h-10 px-3 rounded-xl border border-border/60 bg-transparent text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Incentive Per Sale (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.personal_sale_incentive}
                    onChange={(e) => setFormData(prev => ({ ...prev, personal_sale_incentive: parseFloat(e.target.value) || 0 }))}
                    className="w-full h-10 px-3 rounded-xl border border-border/60 bg-transparent text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-4">
                <div className="text-xs font-bold text-foreground">Qualification Rules</div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Required Previous Promotion</label>
                    <select
                      value={formData.required_prev_promotion_level}
                      onChange={(e) => setFormData(prev => ({ ...prev, required_prev_promotion_level: e.target.value === "none" ? "none" : parseInt(e.target.value) }))}
                      className="w-full h-10 px-3 rounded-xl border border-border/60 bg-card text-sm text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="none">None</option>
                      {levels.filter(l => l.level !== selectedLevel?.level).map(l => (
                        <option key={l.level} value={l.level}>{l.title} (Level {l.level})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Number Required</label>
                    <input
                      type="number"
                      min="0"
                      disabled={formData.required_prev_promotion_level === "none"}
                      value={formData.required_prev_promotion_count}
                      onChange={(e) => setFormData(prev => ({ ...prev, required_prev_promotion_count: parseInt(e.target.value) || 0 }))}
                      className="w-full h-10 px-3 rounded-xl border border-border/60 bg-transparent text-sm text-foreground focus:outline-none focus:border-primary disabled:opacity-40"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="edit_different_legs"
                    disabled={formData.required_prev_promotion_level === "none"}
                    checked={formData.different_legs_required}
                    onChange={(e) => setFormData(prev => ({ ...prev, different_legs_required: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-40"
                  />
                  <label htmlFor="edit_different_legs" className="text-xs font-semibold text-foreground cursor-pointer select-none disabled:opacity-40">
                    Different Legs Required (Qualified members must come from different downline legs)
                  </label>
                </div>
              </div>

              <ModalFooter>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/95 transition-all disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              </ModalFooter>
            </form>
          </ModalContent>
        </ModalPortal>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Promotion Level?"
        description={`Are you sure you want to delete "${selectedLevel?.title}" (Level ${selectedLevel?.level})? This action cannot be undone and may affect qualification configurations referencing this level.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isLoading}
      />
    </div>
  );
}

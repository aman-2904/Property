"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/tables/data-table";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal-system";
import {
  createRewardCategory,
  updateRewardCategory,
  deleteRewardCategory,
} from "@/lib/actions/rewards";
import { Edit2, Trash2, Plus, ArrowUpDown } from "lucide-react";

interface RewardCategory {
  id: string;
  name: string;
  display_order: number;
  created_at: string;
}

interface ClientProps {
  initialCategories: RewardCategory[];
}

export function AdminRewardCategoriesClient({ initialCategories }: ClientProps) {
  const router = useRouter();
  const [categories, setCategories] = React.useState(initialCategories);
  const [selectedCategory, setSelectedCategory] = React.useState<RewardCategory | null>(null);
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Form states
  const [formData, setFormData] = React.useState({
    name: "",
    display_order: 0,
  });

  React.useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const resetForm = (cat?: RewardCategory) => {
    setErrorMsg(null);
    if (cat) {
      setFormData({
        name: cat.name,
        display_order: cat.display_order,
      });
    } else {
      const nextOrder = categories.length > 0 ? Math.max(...categories.map(c => c.display_order)) + 1 : 0;
      setFormData({
        name: "",
        display_order: nextOrder,
      });
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setErrorMsg("Category Name is required.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    const res = await createRewardCategory(formData);
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
    if (!selectedCategory) return;
    if (!formData.name) {
      setErrorMsg("Category Name is required.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    const res = await updateRewardCategory(selectedCategory.id, formData);
    setIsLoading(false);

    if (res && res.error) {
      setErrorMsg(res.error);
    } else {
      setIsEditOpen(false);
      router.refresh();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCategory) return;
    setIsLoading(true);
    setErrorMsg(null);
    const res = await deleteRewardCategory(selectedCategory.id);
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
      header: "Display Order",
      accessorKey: "display_order",
      render: (row: RewardCategory) => (
        <span className="font-semibold text-muted-foreground">Order #{row.display_order}</span>
      )
    },
    {
      header: "Category Name",
      accessorKey: "name",
      render: (row: RewardCategory) => (
        <span className="font-bold text-foreground">{row.name}</span>
      )
    },
    {
      header: "Created Date",
      accessorKey: "created_at",
      render: (row: RewardCategory) => (
        <span suppressHydrationWarning className="text-xs text-muted-foreground">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      header: "Actions",
      accessorKey: "actions",
      render: (row: RewardCategory) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedCategory(row);
              resetForm(row);
              setIsEditOpen(true);
            }}
            className="p-2 rounded-lg border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title="Edit Category"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedCategory(row);
              setIsDeleteOpen(true);
            }}
            className="p-2 rounded-lg border border-red-500/10 hover:bg-red-500/10 text-red-400 transition-all cursor-pointer"
            title="Delete Category"
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
          Add Category
        </button>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
        <DataTable
          columns={columns}
          data={categories}
          emptyTitle="No Reward Categories Found"
          emptyDescription="Create your first reward category to group MLM reward milestones."
        />
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <Modal open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <ModalContent className="sm:max-w-[480px]">
            <ModalHeader>
              <ModalTitle>Add Reward Category</ModalTitle>
            </ModalHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4 py-4">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold">
                  {errorMsg}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. AGM, Senior Manager"
                  className="w-full h-11 px-4 rounded-xl border border-border/50 bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  Display Order
                </label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full h-11 px-4 rounded-xl border border-border/50 bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary transition-all"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
                />
              </div>

              <ModalFooter className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-10 px-4 rounded-xl border border-border/50 hover:bg-muted text-muted-foreground text-sm font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-semibold transition-all cursor-pointer"
                >
                  {isLoading ? "Saving..." : "Add Category"}
                </button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <Modal open={isEditOpen} onOpenChange={setIsEditOpen}>
          <ModalContent className="sm:max-w-[480px]">
            <ModalHeader>
              <ModalTitle>Edit Reward Category</ModalTitle>
            </ModalHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold">
                  {errorMsg}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. AGM, Senior Manager"
                  className="w-full h-11 px-4 rounded-xl border border-border/50 bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
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

              <ModalFooter className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="h-10 px-4 rounded-xl border border-border/50 hover:bg-muted text-muted-foreground text-sm font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-semibold transition-all cursor-pointer"
                >
                  {isLoading ? "Saving..." : "Update Category"}
                </button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>
      )}

      {/* DELETE DIALOG */}
      {isDeleteOpen && selectedCategory && (
        <ConfirmationDialog
          isOpen={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Delete Reward Category?"
          description={`Are you sure you want to delete "${selectedCategory.name}"? This action cannot be undone. Rules associated with this category will be reset to uncategorized.`}
          confirmText="Yes, Delete"
          cancelText="No, Cancel"
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

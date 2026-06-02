"use client";

import * as React from "react";
import { DataTable } from "@/components/tables/data-table";
import { SearchFilter } from "@/components/tables/search-filter";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal, ModalPortal, ModalOverlay, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal-system";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { PropertyForm } from "@/components/forms/property-form";
import { deleteProperty, updateProperty, PropertyData } from "@/lib/actions/properties";
import { Plus, Trash2, Edit3, Archive, CheckCircle, Image as ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AdminPropertiesClientProps {
  initialProperties: PropertyData[];
}

export function AdminPropertiesClient({
  initialProperties,
}: AdminPropertiesClientProps) {
  const router = useRouter();
  const [properties, setProperties] = React.useState(initialProperties);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("");
  
  // Modals / states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  
  const [propertyToEdit, setPropertyToEdit] = React.useState<PropertyData | null>(null);
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  const [propertyToDelete, setPropertyToDelete] = React.useState<PropertyData | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  
  const [isLoading, setIsLoading] = React.useState(false);
  const [showToast, setShowToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    setProperties(initialProperties);
  }, [initialProperties]);

  const filteredProperties = properties.filter((prop) => {
    const matchesSearch =
      prop.title.toLowerCase().includes(search.toLowerCase()) ||
      prop.location.toLowerCase().includes(search.toLowerCase()) ||
      prop.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "" ? true : prop.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    triggerToast("Property listing created successfully!");
    router.refresh();
  };

  const handleEditSuccess = () => {
    setIsEditOpen(false);
    setPropertyToEdit(null);
    triggerToast("Property listing updated successfully!");
    router.refresh();
  };

  const handleArchiveToggle = async (prop: PropertyData) => {
    setIsLoading(true);
    const newStatus = prop.status === "draft" ? "available" : "draft";
    const res = await updateProperty(prop.id!, { status: newStatus as any });
    setIsLoading(false);

    if (res && res.error) {
      alert(`Error updating property status: ${res.error}`);
    } else {
      triggerToast(newStatus === "draft" ? "Property listing archived." : "Property listing is now active.");
      router.refresh();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!propertyToDelete || !propertyToDelete.id) return;
    setIsLoading(true);
    const res = await deleteProperty(propertyToDelete.id);
    setIsLoading(false);

    if (res && res.error) {
      alert(`Error deleting property: ${res.error}`);
    } else {
      setIsDeleteOpen(false);
      setPropertyToDelete(null);
      triggerToast("Property listing deleted successfully.");
      router.refresh();
    }
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 4000);
  };

  const columns = [
    {
      header: "Image",
      accessorKey: "image_urls",
      render: (row: PropertyData) => {
        const coverImage = row.image_urls && row.image_urls[0];
        return (
          <div className="h-10 w-16 bg-muted/40 rounded-lg overflow-hidden border border-border/50 flex items-center justify-center">
            {coverImage ? (
              <img
                src={coverImage}
                alt={row.title}
                className="object-cover w-full h-full"
              />
            ) : (
              <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
            )}
          </div>
        );
      },
      className: "w-20",
    },
    {
      header: "Title",
      accessorKey: "title",
      render: (row: PropertyData) => (
        <div className="flex flex-col max-w-[200px]">
          <Link href={`/admin/properties/${row.id}`} className="font-bold text-foreground hover:text-primary hover:underline truncate">
            {row.title}
          </Link>
          <span className="text-[10px] text-muted-foreground truncate">
            {row.location}
          </span>
        </div>
      ),
    },
    {
      header: "Price",
      accessorKey: "price",
      render: (row: PropertyData) => (
        <span className="font-semibold text-foreground">
          ${Number(row.price).toLocaleString("en-US")}
        </span>
      ),
    },
    {
      header: "Commission Splits",
      accessorKey: "total_commission_percent",
      render: (row: PropertyData) => (
        <div className="flex flex-col text-xs">
          <span className="font-semibold text-primary">{row.total_commission_percent}% Total</span>
          <span className="text-[10px] text-muted-foreground">
            Seller: {row.seller_percent}% | Overrides: {(Number(row.total_commission_percent) - Number(row.seller_percent)).toFixed(2)}%
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      render: (row: PropertyData) => <StatusBadge status={row.status} />,
    },
    {
      header: "Date Created",
      accessorKey: "created_at",
      render: (row: PropertyData) => {
        const dateVal = (row as any).created_at;
        return <span>{dateVal ? new Date(dateVal).toLocaleDateString() : "-"}</span>;
      },
    },
    {
      header: "Actions",
      render: (row: PropertyData) => (
        <div className="flex items-center gap-2">
          {/* Edit */}
          <button
            onClick={() => {
              setPropertyToEdit(row);
              setIsEditOpen(true);
            }}
            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-black border border-amber-500/20 transition-all"
            title="Edit Property Config"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          
          {/* Archive / Activate */}
          <button
            onClick={() => handleArchiveToggle(row)}
            disabled={isLoading}
            className={cn(
              "p-1.5 rounded-lg border transition-all",
              row.status === "draft"
                ? "bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border-emerald-500/20"
                : "bg-zinc-500/10 hover:bg-zinc-500 text-zinc-500 hover:text-white border-zinc-500/20"
            )}
            title={row.status === "draft" ? "Publish listing" : "Archive listing (draft)"}
          >
            {row.status === "draft" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
          </button>

          {/* Delete */}
          <button
            onClick={() => {
              setPropertyToDelete(row);
              setIsDeleteOpen(true);
            }}
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-all border border-rose-500/20"
            title="Delete Property"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
      className: "w-28 text-center",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <SearchFilter
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search properties by title or location..."
          filterValue={filter}
          onFilterChange={setFilter}
          filterOptions={[
            { value: "available", label: "Available" },
            { value: "sold", label: "Sold" },
            { value: "draft", label: "Draft (Archived)" },
          ]}
          filterPlaceholder="All Listings"
          className="pb-0"
        />

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/95 transition-all shadow-lg shadow-primary/20 active:scale-[0.98] w-full sm:w-auto justify-center"
        >
          <Plus className="h-4 w-4" />
          Add Property
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredProperties}
        emptyTitle="No properties found"
        emptyDescription="There are no property listings currently in the database matching your filters."
      />

      {/* Create Modal */}
      <Modal open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <ModalPortal>
          <ModalOverlay />
          <ModalContent isOpen={isCreateOpen} className="max-w-xl max-h-[85vh] overflow-y-auto border border-border/50">
            <ModalHeader>
              <ModalTitle>Create Real Estate Property</ModalTitle>
            </ModalHeader>
            <div className="mt-4">
              <PropertyForm onSuccess={handleCreateSuccess} />
            </div>
          </ModalContent>
        </ModalPortal>
      </Modal>

      {/* Edit Modal */}
      <Modal open={isEditOpen} onOpenChange={setIsEditOpen}>
        <ModalPortal>
          <ModalOverlay />
          <ModalContent isOpen={isEditOpen} className="max-w-xl max-h-[85vh] overflow-y-auto border border-border/50">
            <ModalHeader>
              <ModalTitle>Edit Property Config: {propertyToEdit?.title}</ModalTitle>
            </ModalHeader>
            {propertyToEdit && (
              <div className="mt-4">
                <PropertyForm property={propertyToEdit} onSuccess={handleEditSuccess} />
              </div>
            )}
          </ModalContent>
        </ModalPortal>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Property Listing"
        description={`Are you sure you want to delete "${propertyToDelete?.title}"? This action cannot be undone and will remove the property configuration from database.`}
        confirmText="Delete Listing"
        variant="danger"
        isLoading={isLoading}
      />

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

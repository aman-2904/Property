"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, Search, Eye, Edit, Loader2, ArrowUpDown, ChevronLeft, ChevronRight, X, Phone, Mail, DollarSign, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createLead, updateLead } from "@/lib/actions/staff";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  property_interest: string | null;
  budget: number | null;
  source: string;
  notes: string | null;
  status: string;
  created_at: string;
  properties?: { title: string } | null;
}

interface Property {
  id: string;
  title: string;
  status: string;
}

interface LeadsClientPageProps {
  initialLeads: any[];
  totalLeads: number;
  properties: Property[];
  currentPage: number;
  search: string;
  status: string;
  propertyId: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export function LeadsClientPage({
  initialLeads,
  totalLeads,
  properties,
  currentPage,
  search,
  status,
  propertyId,
  sortBy,
  sortOrder,
}: LeadsClientPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchVal, setSearchVal] = React.useState(search);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingLead, setEditingLead] = React.useState<Lead | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);

  // Form states
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    phone: "",
    property_interest: "",
    budget: "",
    source: "Website",
    notes: "",
    status: "New",
  });

  React.useEffect(() => {
    if (editingLead) {
      setFormData({
        name: editingLead.name,
        email: editingLead.email || "",
        phone: editingLead.phone,
        property_interest: editingLead.property_interest || "",
        budget: editingLead.budget ? editingLead.budget.toString() : "",
        source: editingLead.source,
        notes: editingLead.notes || "",
        status: editingLead.status,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        property_interest: properties[0]?.id || "",
        budget: "",
        source: "Website",
        notes: "",
        status: "New",
      });
    }
  }, [editingLead, properties]);

  // Update filters in URL query
  const updateQuery = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === "all") {
        params.delete(key);
      } else {
        params.set(key, val.toString());
      }
    });
    // Reset to page 1 on filter change
    if (!updates.page && pageLimitExceeded(updates)) {
      params.set("page", "1");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const pageLimitExceeded = (updates: any) => {
    return updates.search !== undefined || updates.status !== undefined || updates.propertyId !== undefined;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateQuery({ search: searchVal || null, page: 1 });
  };

  const handleSort = (field: string) => {
    const order = sortBy === field && sortOrder === "desc" ? "asc" : "desc";
    updateQuery({ sortBy: field, sortOrder: order });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim() || !formData.phone.trim() || !formData.property_interest) {
      setFormError("Please fill out all required fields.");
      return;
    }

    startTransition(async () => {
      const budgetNum = Number(formData.budget) || 0;
      const dataPayload = {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim(),
        property_interest: formData.property_interest,
        budget: budgetNum,
        source: formData.source,
        notes: formData.notes.trim() || undefined,
        status: formData.status,
      };

      let result;
      if (editingLead) {
        result = await updateLead(editingLead.id, dataPayload);
      } else {
        result = await createLead(dataPayload);
      }

      if (result.error) {
        setFormError(result.error);
      } else {
        setModalOpen(false);
        setEditingLead(null);
        router.refresh();
      }
    });
  };

  const totalPages = Math.ceil(totalLeads / 10) || 1;

  const leadSources = ["Website", "Facebook", "Google Ads", "Referral", "Walk-in", "Other"];
  const leadStatuses = ["New", "Contacted", "Follow-up Required", "Negotiation", "Closed Won", "Closed Lost"];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Leads</h1>
          <p className="text-sm text-muted-foreground">Manage and track your lead pipeline and follow-up activities.</p>
        </div>
        <button
          onClick={() => {
            setEditingLead(null);
            setFormError(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all shadow-md active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add Customer Lead
        </button>
      </div>

      {/* Filters bar */}
      <div className="p-4 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search leads by name, email, phone..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full pl-10 pr-16 py-2 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all"
          />
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            <Search className="h-4 w-4" />
          </span>
          <button
            type="submit"
            className="absolute inset-y-1.5 right-1.5 px-3 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-all"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-3 items-center">
          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => updateQuery({ status: e.target.value, page: 1 })}
            className="px-3 py-2 bg-muted/20 border border-border/50 rounded-xl text-xs font-semibold outline-none focus:border-primary/50 transition-all cursor-pointer"
          >
            <option value="all">All Statuses</option>
            {leadStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Property interest filter */}
          <select
            value={propertyId}
            onChange={(e) => updateQuery({ propertyId: e.target.value, page: 1 })}
            className="px-3 py-2 bg-muted/20 border border-border/50 rounded-xl text-xs font-semibold outline-none focus:border-primary/50 transition-all cursor-pointer max-w-[200px]"
          >
            <option value="all">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-2xl border border-border/30 bg-card/30 backdrop-blur-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/20 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6">Contact Details</th>
                <th className="py-4 px-6 cursor-pointer hover:bg-muted/50" onClick={() => handleSort("property_interest")}>
                  <div className="flex items-center gap-1.5">
                    Property Interest <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-4 px-6 cursor-pointer hover:bg-muted/50 text-right" onClick={() => handleSort("budget")}>
                  <div className="flex items-center gap-1.5 justify-end">
                    Budget <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 cursor-pointer hover:bg-muted/50" onClick={() => handleSort("created_at")}>
                  <div className="flex items-center gap-1.5">
                    Added Date <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10 text-sm">
              {initialLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No customer leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                initialLeads.map((lead) => {
                  const statusColors: Record<string, string> = {
                    New: "bg-blue-500/10 text-blue-500 border-blue-500/20",
                    Contacted: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
                    "Follow-up Required": "bg-amber-500/10 text-amber-500 border-amber-500/20",
                    Negotiation: "bg-purple-500/10 text-purple-500 border-purple-500/20",
                    "Closed Won": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                    "Closed Lost": "bg-rose-500/10 text-rose-500 border-rose-500/20",
                  };
                  return (
                    <tr key={lead.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-4.5 px-6 font-bold">{lead.name}</td>
                      <td className="py-4.5 px-6 text-xs space-y-0.5 text-muted-foreground">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <Phone className="h-3.5 w-3.5" /> {lead.phone}
                        </div>
                        {lead.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" /> {lead.email}
                          </div>
                        )}
                      </td>
                      <td className="py-4.5 px-6 truncate max-w-[200px]">
                        {lead.properties?.title || <span className="text-muted-foreground/60 italic">None</span>}
                      </td>
                      <td className="py-4.5 px-6 text-right font-semibold">
                        {lead.budget ? `₹${Number(lead.budget).toLocaleString()}` : <span className="text-muted-foreground/60 italic">-</span>}
                      </td>
                      <td className="py-4.5 px-6 text-center">
                        <span
                          className={cn(
                            "px-2.5 py-1 text-xs font-semibold rounded-full border",
                            statusColors[lead.status] || "bg-muted/10 text-muted border-border"
                          )}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-4.5 px-6 text-xs text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-4.5 px-6 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <Link
                            href={`/staff/leads/${lead.id}`}
                            className="p-1.5 rounded-lg border border-border/40 hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-all"
                            title="View Timeline"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setEditingLead(lead);
                              setFormError(null);
                              setModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-border/40 hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-all"
                            title="Edit Lead"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="py-4 px-6 border-t border-border/20 bg-muted/10 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing Page <span className="font-semibold">{currentPage}</span> of{" "}
            <span className="font-semibold">{totalPages}</span> ({totalLeads} total leads)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => updateQuery({ page: currentPage - 1 })}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-border/40 hover:bg-muted/30 disabled:opacity-40 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => updateQuery({ page: currentPage + 1 })}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-border/40 hover:bg-muted/30 disabled:opacity-40 transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-[500px] rounded-3xl border border-border/40 bg-card p-6 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-muted text-muted-foreground transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-xl font-bold tracking-tight mb-4">
              {editingLead ? "Edit Customer Lead" : "Add Customer Lead"}
            </h2>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 99999 99999"
                    className="w-full px-3 py-2 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full px-3 py-2 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                    Property Interest *
                  </label>
                  <select
                    required
                    value={formData.property_interest}
                    onChange={(e) => setFormData({ ...formData, property_interest: e.target.value })}
                    className="w-full px-3 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="" disabled>Select a property</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                    Budget (INR) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="5000000"
                    className="w-full px-3 py-2 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                    Lead Source *
                  </label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    {leadSources.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    {leadStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Details about customer requirements..."
                  rows={3}
                  className="w-full px-3 py-2 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-border/60 text-muted-foreground hover:bg-muted/30 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 transition-all flex items-center gap-1.5 active:scale-[0.98] disabled:opacity-60"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingLead ? "Save Changes" : "Create Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

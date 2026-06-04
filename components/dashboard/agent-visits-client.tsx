"use client";

import * as React from "react";
import { DataTable } from "@/components/tables/data-table";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalPortal, ModalOverlay } from "@/components/ui/modal-system";
import { Search, Eye, Filter, Calendar } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-states";


interface VisitRow {
  id: string;
  customer_name: string;
  customer_contact: string;
  visit_mode: "physical" | "virtual";
  coordinator_name: string;
  people_count: number;
  photo_url?: string | null;
  created_at: string;
  properties: {
    title: string;
    location: string;
  } | null;
}

interface AgentVisitsClientProps {
  initialVisits: VisitRow[];
}

export function AgentVisitsClient({ initialVisits }: AgentVisitsClientProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [modeFilter, setModeFilter] = React.useState("");
  const [selectedPhoto, setSelectedPhoto] = React.useState<string | null>(null);

  // Client-side filtering
  const filteredVisits = React.useMemo(() => {
    return initialVisits.filter((visit) => {
      const matchesSearch =
        (visit.customer_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (visit.properties?.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (visit.coordinator_name || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesMode = modeFilter === "" || visit.visit_mode === modeFilter;

      return matchesSearch && matchesMode;
    });
  }, [initialVisits, searchQuery, modeFilter]);

  const columns = [
    {
      header: "Date Logged",
      accessorKey: "created_at",
      render: (row: VisitRow) => (
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80 flex items-center gap-1.5" suppressHydrationWarning>
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            {new Date(row.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="pl-5 text-[10px] font-medium text-muted-foreground/70" suppressHydrationWarning>
            {new Date(row.created_at).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ),
    },
    {
      header: "Customer",
      render: (row: VisitRow) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{row.customer_name}</span>
          <span className="text-xs text-muted-foreground">{row.customer_contact}</span>
        </div>
      ),
    },
    {
      header: "Property Listing",
      render: (row: VisitRow) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{row.properties?.title || "N/A"}</span>
          <span className="text-xs text-muted-foreground">{row.properties?.location || ""}</span>
        </div>
      ),
    },
    {
      header: "Mode",
      render: (row: VisitRow) => (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border",
            row.visit_mode === "physical"
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              : "bg-blue-500/10 text-blue-500 border-blue-500/20"
          )}
        >
          {row.visit_mode}
        </span>
      ),
    },
    {
      header: "Coordinator",
      accessorKey: "coordinator_name",
    },
    {
      header: "Guests",
      accessorKey: "people_count",
      render: (row: VisitRow) => (
        <span className="font-semibold text-foreground/80">{row.people_count} {row.people_count === 1 ? "person" : "people"}</span>
      ),
    },
    {
      header: "Proof Photo",
      render: (row: VisitRow) => {
        if (!row.photo_url) return <span className="text-xs text-muted-foreground italic">No proof</span>;
        return (
          <button
            onClick={() => setSelectedPhoto(row.photo_url || null)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-bold transition-all"
          >
            <Eye className="h-3.5 w-3.5" />
            View Proof
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-zinc-950/20 p-4 border border-border/40 rounded-2xl glass-premium">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by customer, property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border/50 bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border/50 bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-xs"
          >
            <option value="">All Visit Modes</option>
            <option value="physical">Physical Visit</option>
            <option value="virtual">Virtual Walkthrough</option>
          </select>
        </div>
      </div>

      {/* Data Table / Mobile Cards */}
      {filteredVisits.length === 0 ? (
        <EmptyState
          title={initialVisits.length === 0 ? "No visits recorded" : "No matching visits found"}
          description={
            initialVisits.length === 0
              ? "You have not submitted any customer site visits yet. Use the form above to record your first visit!"
              : "There are no registered visit tours matching the filters."
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              data={filteredVisits}
              emptyTitle="No visits recorded"
              emptyDescription="You have not submitted any customer site visits yet. Use the form above to record your first visit!"
            />
          </div>

          <div className="block md:hidden space-y-4">
            {filteredVisits.map((visit) => (
              <div
                key={visit.id}
                className="p-5 rounded-2xl border border-border/40 bg-zinc-950/20 glass-premium space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground text-sm">{visit.properties?.title || "N/A"}</span>
                    <span className="text-[11px] text-muted-foreground">{visit.properties?.location || ""}</span>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border",
                      visit.visit_mode === "physical"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    )}
                  >
                    {visit.visit_mode}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs border-t border-border/20 pt-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground uppercase text-[9px] tracking-wider font-semibold">Date Logged</span>
                    <span className="text-foreground/80 font-medium" suppressHydrationWarning>
                      {new Date(visit.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-[10px] text-muted-foreground/75" suppressHydrationWarning>
                      {new Date(visit.created_at).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground uppercase text-[9px] tracking-wider font-semibold">Customer</span>
                    <span className="text-foreground/80 font-medium truncate">{visit.customer_name}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{visit.customer_contact}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground uppercase text-[9px] tracking-wider font-semibold">Coordinator</span>
                    <span className="text-foreground/80 font-medium truncate">{visit.coordinator_name || "N/A"}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground uppercase text-[9px] tracking-wider font-semibold">Guests</span>
                    <span className="text-foreground/80 font-medium">
                      {visit.people_count} {visit.people_count === 1 ? "person" : "people"}
                    </span>
                  </div>
                </div>

                {visit.photo_url && (
                  <div className="border-t border-border/20 pt-3 flex justify-end">
                    <button
                      onClick={() => setSelectedPhoto(visit.photo_url || null)}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-bold transition-all"
                    >
                      <Eye className="h-4 w-4" />
                      View Proof
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Photo Proof Modal */}
      <Modal open={selectedPhoto !== null} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <ModalPortal>
          <ModalOverlay />
          <ModalContent isOpen={selectedPhoto !== null} className="max-w-xl">
            <ModalHeader>
              <ModalTitle>Photo Proof of Visit</ModalTitle>
            </ModalHeader>
            {selectedPhoto && (
              <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border/40 bg-zinc-950 mt-4 flex items-center justify-center">
                <img
                  src={selectedPhoto}
                  alt="Proof of Visit"
                  className="object-contain max-h-[350px] w-full"
                />
              </div>
            )}
          </ModalContent>
        </ModalPortal>
      </Modal>
    </div>
  );
}

// Utility to handle classNames conditionally
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

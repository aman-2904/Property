"use client";

import * as React from "react";
import { DataTable } from "@/components/tables/data-table";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalPortal, ModalOverlay } from "@/components/ui/modal-system";
import { Search, Eye, Filter, Calendar, Download, EyeOff, BarChart3, Users, Building } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-states";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface VisitRow {
  id: string;
  customer_name: string;
  customer_contact: string;
  visit_mode: "physical" | "virtual";
  transportation_mode?: "personal" | "company" | null;
  coordinator_name: string;
  people_count: number;
  photo_url?: string | null;
  created_at: string;
  properties: {
    title: string;
    location: string;
  } | null;
  profiles: {
    name: string;
    email: string;
  } | null;
}

interface AdminVisitsClientProps {
  initialVisits: VisitRow[];
  analytics: {
    totalVisits: number;
    monthlyVisits: { name: string; visits: number }[];
    topAgents: { name: string; visits: number }[];
    propertyVisits: { name: string; visits: number }[];
  };
}

export function AdminVisitsClient({ initialVisits, analytics }: AdminVisitsClientProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [modeFilter, setModeFilter] = React.useState("");
  const [selectedPhoto, setSelectedPhoto] = React.useState<string | null>(null);

  // Client-side filtering
  const filteredVisits = React.useMemo(() => {
    return initialVisits.filter((visit) => {
      const agentName = visit.profiles?.name || "";
      const matchesSearch =
        (visit.customer_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (visit.properties?.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (visit.coordinator_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        agentName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesMode = modeFilter === "" || visit.visit_mode === modeFilter;

      return matchesSearch && matchesMode;
    });
  }, [initialVisits, searchQuery, modeFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "Date Logged",
      "Agent Name",
      "Agent Email",
      "Customer Name",
      "Customer Contact",
      "Property Title",
      "Location",
      "Visit Mode",
      "Transportation Mode",
      "Coordinator Name",
      "Guests Count",
      "Photo Proof URL",
    ];

    const rows = filteredVisits.map((visit) => [
      new Date(visit.created_at).toLocaleDateString(),
      visit.profiles?.name || "N/A",
      visit.profiles?.email || "N/A",
      visit.customer_name,
      visit.customer_contact,
      visit.properties?.title || "N/A",
      visit.properties?.location || "N/A",
      visit.visit_mode,
      visit.transportation_mode || "N/A",
      visit.coordinator_name || "N/A",
      visit.people_count,
      visit.photo_url || "N/A",
    ]);

    const csvContent = [headers, ...rows]
      .map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `aura_visits_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      header: "Logged Date",
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
      header: "Agent Sponsor",
      render: (row: VisitRow) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{row.profiles?.name || "Unknown"}</span>
          <span className="text-xs text-muted-foreground">{row.profiles?.email || ""}</span>
        </div>
      ),
    },
    {
      header: "Customer",
      render: (row: VisitRow) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{row.customer_name}</span>
          <span className="text-xs text-muted-foreground">{row.customer_contact}</span>
        </div>
      ),
    },
    {
      header: "Property Selected",
      render: (row: VisitRow) => (
        <span className="font-medium text-foreground/80">{row.properties?.title || "N/A"}</span>
      ),
    },
    {
      header: "Mode / Transport",
      render: (row: VisitRow) => (
        <div className="flex flex-col gap-1 items-start">
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border",
              row.visit_mode === "physical"
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : "bg-blue-500/10 text-blue-500 border-blue-500/20"
            )}
          >
            {row.visit_mode}
          </span>
          {row.transportation_mode && (
            <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
              🚗 {row.transportation_mode === "company" ? "Company Vehicle" : "Personal Vehicle"}
            </span>
          )}
        </div>
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
        <span className="font-semibold text-foreground">{row.people_count}</span>
      ),
    },
    {
      header: "Verification",
      render: (row: VisitRow) => {
        if (!row.photo_url) return <span className="text-xs text-muted-foreground italic flex items-center gap-1"><EyeOff className="h-3 w-3" /> No proof</span>;
        return (
          <button
            onClick={() => setSelectedPhoto(row.photo_url || null)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-bold transition-all"
          >
            <Eye className="h-3.5 w-3.5" />
            View Photo
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-8">
      {/* Analytics Charts & Cards Section */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* Total count card */}
        <div className="md:col-span-1 p-6 rounded-3xl border border-border/40 bg-zinc-950/20 glass-premium flex flex-col justify-between min-h-[140px]">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Customer Tours
            </span>
            <span className="text-5xl font-black text-foreground mt-2 block tracking-tight">
              {analytics.totalVisits}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-4">
            Aggregated across all registered agents and properties.
          </p>
        </div>

        {/* Monthly Trend Chart */}
        <div className="md:col-span-3 p-6 rounded-3xl border border-border/40 bg-zinc-950/20 glass-premium">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-foreground">Monthly Visit Activity</h3>
              <p className="text-xs text-muted-foreground">Logged client tours over last 6 months</p>
            </div>
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.monthlyVisits} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "12px", color: "#fff" }}
                />
                <Line type="monotone" dataKey="visits" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Agents Chart */}
        <div className="p-6 rounded-3xl border border-border/40 bg-zinc-950/20 glass-premium">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-foreground">Top Performing Agents</h3>
              <p className="text-xs text-muted-foreground">Agents with the most customer site tours</p>
            </div>
            <Users className="h-5 w-5 text-violet-400" />
          </div>
          {analytics.topAgents.length > 0 ? (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.topAgents} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <XAxis type="number" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={10} tickLine={false} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "12px", color: "#fff" }}
                  />
                  <Bar dataKey="visits" fill="var(--primary)" radius={[0, 8, 8, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-xs text-muted-foreground italic">
              No visits activity yet to plot
            </div>
          )}
        </div>

        {/* Property Wise Distribution */}
        <div className="p-6 rounded-3xl border border-border/40 bg-zinc-950/20 glass-premium">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-foreground">Property Wise Visits</h3>
              <p className="text-xs text-muted-foreground">Most toured property listings</p>
            </div>
            <Building className="h-5 w-5 text-emerald-400" />
          </div>
          {analytics.propertyVisits.length > 0 ? (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.propertyVisits} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <XAxis type="number" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={10} tickLine={false} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "12px", color: "#fff" }}
                  />
                  <Bar dataKey="visits" fill="var(--primary)" radius={[0, 8, 8, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-xs text-muted-foreground italic">
              No property visits registered yet
            </div>
          )}
        </div>
      </div>

      {/* Visits Table Directory */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-zinc-950/20 p-4 border border-border/40 rounded-2xl glass-premium">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by agent, customer, property..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-border/50 bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-xs"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
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

            <button
              onClick={handleExportCSV}
              className="h-10 px-4 rounded-xl bg-zinc-900 border border-border/50 hover:bg-zinc-800 text-foreground font-semibold flex items-center gap-2 text-xs transition-all active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        {filteredVisits.length === 0 ? (
          <EmptyState
            title={initialVisits.length === 0 ? "No visits records found" : "No matching visits found"}
            description={
              initialVisits.length === 0
                ? "There are no registered visit tours in the database yet."
                : "There are no registered visit tours matching the filters."
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable
                columns={columns}
                data={filteredVisits}
                emptyTitle="No visits records found"
                emptyDescription="There are no registered visit tours matching the filters."
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
                    <div className="flex flex-col gap-1 items-end">
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
                      {visit.transportation_mode && (
                        <span className="text-[9px] font-semibold text-muted-foreground whitespace-nowrap">
                          🚗 {visit.transportation_mode === "company" ? "Company Vehicle" : "Personal"}
                        </span>
                      )}
                    </div>
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
                      <span className="text-muted-foreground uppercase text-[9px] tracking-wider font-semibold">Agent Sponsor</span>
                      <span className="text-foreground/80 font-medium truncate">{visit.profiles?.name || "Unknown"}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{visit.profiles?.email || ""}</span>
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
                        View Photo
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

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

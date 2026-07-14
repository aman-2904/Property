"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Users,
  Calendar,
  Clock,
  ClipboardList,
  ArrowUpDown,
  Search,
  ChevronRight,
  Eye,
  RefreshCw,
  Loader2,
  X,
  Building,
  CheckCircle,
  HelpCircle,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { reassignLead } from "@/lib/actions/staff";

interface StaffPerformance {
  id: string;
  name: string;
  email: string;
  phone: string;
  last_login: string | null;
  newLeads: number;
  pendingFollowUps: number;
  completedFollowUps: number;
  closedDeals: number;
}

interface Property {
  id: string;
  title: string;
  status: string;
}

interface Activity {
  id: string;
  action: string;
  details: any;
  created_at: string;
  profiles?: { name: string; email: string; role: string } | null;
}

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  property_interest: string | null;
  budget: number | null;
  status: string;
  staff_id: string | null;
  created_at: string;
  properties?: { title: string } | null;
  profiles?: { name: string; email: string } | null;
}

interface StaffWorkClientProps {
  staffStats: StaffPerformance[];
  staffList: any[];
  properties: Property[];
  initialActivities: Activity[];
  initialLeads: Lead[];
  dateFrom: string;
  dateTo: string;
  staffId: string;
  propertyId: string;
  status: string;
}

export function StaffWorkClient({
  staffStats,
  staffList,
  properties,
  initialActivities,
  initialLeads,
  dateFrom,
  dateTo,
  staffId,
  propertyId,
  status,
}: StaffWorkClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = React.useState<"performance" | "leads" | "activities">("performance");
  const [filterDateFrom, setFilterDateFrom] = React.useState(dateFrom);
  const [filterDateTo, setFilterDateTo] = React.useState(dateTo);
  const [filterStaff, setFilterStaff] = React.useState(staffId);
  const [filterProperty, setFilterProperty] = React.useState(propertyId);
  const [filterStatus, setFilterStatus] = React.useState(status);

  const [reassignModalOpen, setReassignModalOpen] = React.useState(false);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [targetStaffId, setTargetStaffId] = React.useState("");
  const [reassignPending, startReassignTransition] = React.useTransition();

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    
    if (filterDateFrom) params.set("dateFrom", filterDateFrom);
    else params.delete("dateFrom");

    if (filterDateTo) params.set("dateTo", filterDateTo);
    else params.delete("dateTo");

    if (filterStaff !== "all") params.set("staffId", filterStaff);
    else params.delete("staffId");

    if (filterProperty !== "all") params.set("propertyId", filterProperty);
    else params.delete("propertyId");

    if (filterStatus !== "all") params.set("status", filterStatus);
    else params.delete("status");

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleResetFilters = () => {
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterStaff("all");
    setFilterProperty("all");
    setFilterStatus("all");
    router.push(pathname);
  };

  const handleReassignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !targetStaffId) return;

    startReassignTransition(async () => {
      const result = await reassignLead(selectedLead.id, targetStaffId);
      if (result.error) {
        alert(result.error);
      } else {
        setReassignModalOpen(false);
        setSelectedLead(null);
        setTargetStaffId("");
        router.refresh();
      }
    });
  };

  const renderActivityDescription = (act: Activity) => {
    const details = act.details || {};
    const staffName = act.profiles?.name || "Someone";
    switch (act.action) {
      case "lead created":
        return `${staffName} created lead "${details.lead_name || "Unknown"}"`;
      case "lead updated":
        return `${staffName} updated lead "${details.lead_name || "Unknown"}" details`;
      case "follow-up added":
        return `${staffName} scheduled a callback follow-up for lead "${details.lead_name || "Unknown"}"`;
      case "follow-up updated":
        return `${staffName} marked follow-up status for lead "${details.lead_name || "Unknown"}" as ${details.status || "Completed"}`;
      case "status changed":
        return `${staffName} changed status of lead "${details.lead_name || "Unknown"}" from "${details.old_status}" to "${details.new_status}"`;
      case "reassigned":
        const newStaff = staffList.find(s => s.id === details.new_staff_id)?.name || "another staff";
        return `${staffName} reassigned lead "${details.lead_name || "Unknown"}" to ${newStaff}`;
      default:
        return `${staffName} performed action "${act.action}"`;
    }
  };

  const leadStatuses = ["New", "Contacted", "Follow-up Required", "Negotiation", "Closed Won", "Closed Lost"];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff CRM Performance</h1>
        <p className="text-sm text-muted-foreground">Monitor lead pipeline activities, staff work metrics, and logs.</p>
      </div>

      {/* Filters form */}
      <form onSubmit={handleApplyFilters} className="p-5 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl space-y-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Filter metrics & activity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1">Date From</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-muted/20 border border-border/50 rounded-xl text-xs outline-none focus:border-primary/50 transition-all cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1">Date To</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-muted/20 border border-border/50 rounded-xl text-xs outline-none focus:border-primary/50 transition-all cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1">Staff Member</label>
            <select
              value={filterStaff}
              onChange={(e) => setFilterStaff(e.target.value)}
              className="w-full px-3 py-2 bg-muted/20 border border-border/50 rounded-xl text-xs outline-none focus:border-primary/50 transition-all cursor-pointer"
            >
              <option value="all">All Staff</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1">Property Interest</label>
            <select
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
              className="w-full px-3 py-2 bg-muted/20 border border-border/50 rounded-xl text-xs outline-none focus:border-primary/50 transition-all cursor-pointer"
            >
              <option value="all">All Properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1">Lead Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-muted/20 border border-border/50 rounded-xl text-xs outline-none focus:border-primary/50 transition-all cursor-pointer"
            >
              <option value="all">All Statuses</option>
              {leadStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-1.5 border border-border/60 text-muted-foreground hover:bg-muted/30 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
          >
            Clear Filters
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:bg-primary/95 transition-all active:scale-[0.98]"
          >
            Apply Filters
          </button>
        </div>
      </form>

      {/* Tabs */}
      <div className="flex border-b border-border/20">
        <button
          onClick={() => setActiveTab("performance")}
          className={cn(
            "px-5 py-3 text-sm font-semibold border-b-2 transition-all",
            activeTab === "performance" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Staff Performance
        </button>
        <button
          onClick={() => setActiveTab("leads")}
          className={cn(
            "px-5 py-3 text-sm font-semibold border-b-2 transition-all",
            activeTab === "leads" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Leads Overview
        </button>
        <button
          onClick={() => setActiveTab("activities")}
          className={cn(
            "px-5 py-3 text-sm font-semibold border-b-2 transition-all",
            activeTab === "activities" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Lead Activity Logs
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "performance" && (
        <div className="rounded-2xl border border-border/30 bg-card/30 backdrop-blur-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/20 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
                  <th className="py-4 px-6">Staff Member</th>
                  <th className="py-4 px-6">Last Login</th>
                  <th className="py-4 px-6 text-center">New Leads</th>
                  <th className="py-4 px-6 text-center">Pending Callback</th>
                  <th className="py-4 px-6 text-center">Completed Callback</th>
                  <th className="py-4 px-6 text-center">Closed Won</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10 text-sm">
                {staffStats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No staff members registered in system.
                    </td>
                  </tr>
                ) : (
                  staffStats.map((member) => (
                    <tr key={member.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-4.5 px-6">
                        <p className="font-bold">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </td>
                      <td className="py-4.5 px-6 text-xs text-muted-foreground">
                        {member.last_login ? (
                          new Date(member.last_login).toLocaleString("en-IN")
                        ) : (
                          <span className="text-muted-foreground/50 italic">Never</span>
                        )}
                      </td>
                      <td className="py-4.5 px-6 text-center font-semibold">{member.newLeads}</td>
                      <td className="py-4.5 px-6 text-center font-semibold text-amber-500">{member.pendingFollowUps}</td>
                      <td className="py-4.5 px-6 text-center font-semibold text-emerald-500">{member.completedFollowUps}</td>
                      <td className="py-4.5 px-6 text-center font-extrabold text-primary">{member.closedDeals}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "leads" && (
        <div className="rounded-2xl border border-border/30 bg-card/30 backdrop-blur-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/20 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
                  <th className="py-4 px-6">Customer Name</th>
                  <th className="py-4 px-6">Property / Budget</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Assigned Staff</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10 text-sm">
                {initialLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      No leads matching filters.
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
                        <td className="py-4.5 px-6">
                          <p className="font-bold">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.phone}</p>
                        </td>
                        <td className="py-4.5 px-6">
                          <p className="font-medium text-xs truncate max-w-[200px]">{lead.properties?.title || "-"}</p>
                          <p className="font-semibold text-xs text-muted-foreground">
                            {lead.budget ? `₹${Number(lead.budget).toLocaleString()}` : "-"}
                          </p>
                        </td>
                        <td className="py-4.5 px-6">
                          <span
                            className={cn(
                              "px-2.5 py-0.5 text-xs font-semibold rounded-full border",
                              statusColors[lead.status] || "bg-muted/10 text-muted border-border"
                            )}
                          >
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-4.5 px-6">
                          <p className="font-bold text-xs">{lead.profiles?.name || "Unassigned"}</p>
                          <p className="text-[10px] text-muted-foreground">{lead.profiles?.email}</p>
                        </td>
                        <td className="py-4.5 px-6 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setTargetStaffId(lead.staff_id || "");
                                setReassignModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary text-primary hover:text-primary-foreground transition-all text-xs font-bold"
                            >
                              Reassign
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
        </div>
      )}

      {activeTab === "activities" && (
        <div className="p-6 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl space-y-6">
          <h3 className="font-bold text-base">Activity Logs History ({initialActivities.length})</h3>
          <div className="space-y-4">
            {initialActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground/60 text-sm">
                No recent lead activity logged.
              </div>
            ) : (
              initialActivities.map((act) => (
                <div key={act.id} className="p-4 rounded-xl border border-border/40 bg-card/30 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-primary capitalize">{act.action}</span>
                    <span className="text-muted-foreground font-semibold">
                      {new Date(act.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{renderActivityDescription(act)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Reassign Lead Dialog Modal */}
      {reassignModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-[400px] rounded-3xl border border-border/40 bg-card p-6 shadow-2xl relative">
            <button
              onClick={() => setReassignModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-muted text-muted-foreground transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-lg font-bold tracking-tight mb-2">Reassign Customer Lead</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Reassign lead <span className="font-bold text-foreground">"{selectedLead.name}"</span> to another staff member.
            </p>

            <form onSubmit={handleReassignSubmit} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                  Select Staff Member
                </label>
                <select
                  required
                  value={targetStaffId}
                  onChange={(e) => setTargetStaffId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all cursor-pointer"
                >
                  <option value="" disabled>Choose staff member</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  className="px-4 py-2 border border-border/60 text-muted-foreground hover:bg-muted/30 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassignPending || !targetStaffId}
                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 transition-all flex items-center gap-1.5 active:scale-[0.98] disabled:opacity-60"
                >
                  {reassignPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm Reassign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

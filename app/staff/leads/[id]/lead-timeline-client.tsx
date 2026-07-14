"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  Mail,
  DollarSign,
  Tag,
  Calendar,
  Clock,
  User,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Building,
  Check,
  XCircle,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { addFollowUp, updateFollowUpStatus, updateLead } from "@/lib/actions/staff";

interface LeadTimelineClientProps {
  lead: any;
  initialFollowUps: any[];
}

export function LeadTimelineClient({ lead, initialFollowUps }: LeadTimelineClientProps) {
  const router = useRouter();
  const [followUps, setFollowUps] = React.useState(initialFollowUps);
  const [addPending, startAddTransition] = React.useTransition();
  const [statusPending, startStatusTransition] = React.useTransition();
  const [leadStatusPending, startLeadStatusTransition] = React.useTransition();
  
  const [formError, setFormError] = React.useState<string | null>(null);
  const [formSuccess, setFormSuccess] = React.useState<string | null>(null);

  // Follow-up form state
  const [message, setMessage] = React.useState("");
  const [followUpDate, setFollowUpDate] = React.useState("");
  const [followUpTime, setFollowUpTime] = React.useState("");
  const [followUpStatus, setFollowUpStatus] = React.useState("Pending");

  // Lead status update state
  const [leadStatus, setLeadStatus] = React.useState(lead.status);

  // Set default date/time on mount
  React.useEffect(() => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0].slice(0, 5); // HH:MM
    setFollowUpDate(dateStr);
    setFollowUpTime(timeStr);
  }, []);

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!message.trim() || !followUpDate || !followUpTime) {
      setFormError("Please fill in all required fields.");
      return;
    }

    startAddTransition(async () => {
      const res = await addFollowUp(lead.id, {
        message: message.trim(),
        follow_up_date: followUpDate,
        follow_up_time: followUpTime,
        status: followUpStatus,
      });

      if (res.error) {
        setFormError(res.error);
      } else {
        setFormSuccess("Follow-up scheduled successfully!");
        setMessage("");
        // Reload page to refresh server props
        router.refresh();
        // Optimistic UI updates
        const updatedList = await fetchFollowUpsApi();
        setFollowUps(updatedList);
      }
    });
  };

  const fetchFollowUpsApi = async () => {
    // A quick fetch of all follow ups for this lead
    // (since it's a client action, we can get it from a server action callback directly)
    const { getFollowUps } = await import("@/lib/actions/staff");
    return await getFollowUps(lead.id);
  };

  const handleUpdateFollowUpStatus = async (followUpId: string, status: string) => {
    startStatusTransition(async () => {
      const res = await updateFollowUpStatus(followUpId, lead.id, status);
      if (res.error) {
        alert(res.error);
      } else {
        router.refresh();
        const updatedList = await fetchFollowUpsApi();
        setFollowUps(updatedList);
      }
    });
  };

  const handleLeadStatusChange = async (newStatus: string) => {
    setLeadStatus(newStatus);
    startLeadStatusTransition(async () => {
      const res = await updateLead(lead.id, {
        name: lead.name,
        email: lead.email || undefined,
        phone: lead.phone,
        property_interest: lead.property_interest,
        budget: lead.budget || 0,
        source: lead.source,
        notes: lead.notes || undefined,
        status: newStatus,
      });

      if (res.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const statusColors: Record<string, string> = {
    New: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    Contacted: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    "Follow-up Required": "bg-amber-500/10 text-amber-500 border-amber-500/20",
    Negotiation: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    "Closed Won": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    "Closed Lost": "bg-rose-500/10 text-rose-500 border-rose-500/20",
  };

  const leadStatuses = ["New", "Contacted", "Follow-up Required", "Negotiation", "Closed Won", "Closed Lost"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {/* LEFT COLUMN: Lead Information */}
      <div className="lg:col-span-1 space-y-6">
        <div className="p-6 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl space-y-6">
          <div className="space-y-2">
            <span
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-full border inline-block",
                statusColors[lead.status] || "bg-muted/10 text-muted border-border"
              )}
            >
              {lead.status}
            </span>
            <h2 className="text-xl font-bold tracking-tight">{lead.name}</h2>
            <p className="text-xs text-muted-foreground">
              Added on {new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>

          <hr className="border-border/20" />

          {/* Quick Lead Status Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1 block">
              Quick Status Update
            </label>
            <div className="relative">
              <select
                value={leadStatus}
                onChange={(e) => handleLeadStatusChange(e.target.value)}
                disabled={leadStatusPending}
                className="w-full px-3 py-2 bg-muted/20 border border-border/50 rounded-xl text-sm font-semibold outline-none focus:border-primary/50 transition-all cursor-pointer disabled:opacity-50"
              >
                {leadStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {leadStatusPending && (
                <div className="absolute right-8 top-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              )}
            </div>
          </div>

          <hr className="border-border/20" />

          {/* Details list */}
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/20 text-muted-foreground border border-border/40 shrink-0">
                <Phone className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Phone Number</p>
                <p className="font-semibold truncate">{lead.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/20 text-muted-foreground border border-border/40 shrink-0">
                <Mail className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email Address</p>
                <p className="font-semibold truncate">{lead.email || <span className="text-muted-foreground/50 italic">None</span>}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/20 text-muted-foreground border border-border/40 shrink-0">
                <DollarSign className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="font-bold text-foreground">
                  {lead.budget ? `₹${Number(lead.budget).toLocaleString()}` : "-"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/20 text-muted-foreground border border-border/40 shrink-0">
                <Tag className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Lead Source</p>
                <p className="font-semibold truncate">{lead.source}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/20 text-muted-foreground border border-border/40 shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Assigned Staff</p>
                <p className="font-semibold truncate">{lead.profiles?.name || "Unassigned"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Property Interest Card */}
        {lead.properties && (
          <div className="p-6 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm">Property of Interest</h3>
            </div>
            <div className="p-4 rounded-xl border border-border/40 bg-muted/10 space-y-2">
              <h4 className="font-bold text-sm text-foreground">{lead.properties.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{lead.properties.location}</p>
              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Price</span>
                <span className="font-extrabold text-primary">₹{Number(lead.properties.price).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Lead Notes Card */}
        <div className="p-6 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm">Lead Notes</h3>
          </div>
          <div className="p-4 rounded-xl border border-border/40 bg-muted/10">
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {lead.notes || <span className="text-muted-foreground/50 italic">No notes added.</span>}
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Follow-up Timeline */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Add Follow-up Entry Form */}
        <div className="p-6 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl space-y-4">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Schedule Follow-up Call
          </h3>

          {formError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleAddFollowUp} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                Follow-up Instruction / Message *
              </label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Call customer to discuss pricing details and schedule site visit..."
                rows={2}
                className="w-full px-3 py-2 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                  Follow-up Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-xs outline-none focus:border-primary/50 transition-all cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                  Follow-up Time *
                </label>
                <div className="relative">
                  <input
                    type="time"
                    required
                    value={followUpTime}
                    onChange={(e) => setFollowUpTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-xs outline-none focus:border-primary/50 transition-all cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                  Follow-up Status *
                </label>
                <select
                  value={followUpStatus}
                  onChange={(e) => setFollowUpStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-xs outline-none focus:border-primary/50 transition-all cursor-pointer"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={addPending}
                className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 transition-all flex items-center gap-1.5 active:scale-[0.98] disabled:opacity-60"
              >
                {addPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Follow-up
              </button>
            </div>
          </form>
        </div>

        {/* Timeline View */}
        <div className="p-6 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl space-y-6">
          <h3 className="font-bold text-base">Timeline History ({followUps.length})</h3>

          <div className="relative border-l border-border/40 pl-6 ml-4 space-y-8">
            {followUps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground/60 text-sm">
                No follow-ups added yet. Fill in the form above to schedule your first callback!
              </div>
            ) : (
              followUps.map((item) => {
                const isOverdue = item.status === "Pending" && item.follow_up_date < todayStr;
                const isToday = item.status === "Pending" && item.follow_up_date === todayStr;

                return (
                  <div key={item.id} className="relative group">
                    {/* Circle Node indicator */}
                    <span
                      className={cn(
                        "absolute -left-[35px] top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border bg-background shadow-md",
                        item.status === "Completed" && "border-emerald-500 text-emerald-500",
                        item.status === "Cancelled" && "border-muted-foreground text-muted-foreground bg-muted/10",
                        item.status === "Pending" && !isOverdue && !isToday && "border-blue-500 text-blue-500",
                        isToday && "border-amber-500 text-amber-500 animate-pulse",
                        isOverdue && "border-rose-500 text-rose-500 animate-bounce"
                      )}
                    >
                      {item.status === "Completed" ? (
                        <Check className="h-3 w-3" />
                      ) : item.status === "Cancelled" ? (
                        <XCircle className="h-3 w-3" />
                      ) : isOverdue ? (
                        <AlertTriangle className="h-2.5 w-2.5" />
                      ) : (
                        <Clock className="h-2.5 w-2.5" />
                      )}
                    </span>

                    {/* Timeline card details */}
                    <div
                      className={cn(
                        "p-5 rounded-2xl border bg-card/50 backdrop-blur-xl transition-all space-y-3",
                        isOverdue ? "border-rose-500/30 bg-rose-500/[0.01]" : "border-border/40",
                        isToday ? "border-amber-500/30 bg-amber-500/[0.01]" : ""
                      )}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        {/* Highlights badge */}
                        <div className="flex flex-wrap gap-2 items-center">
                          <span
                            className={cn(
                              "text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                              item.status === "Completed" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                              item.status === "Cancelled" && "bg-muted/10 text-muted-foreground border-border",
                              item.status === "Pending" && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                            )}
                          >
                            {item.status}
                          </span>
                          {isOverdue && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse uppercase tracking-wider">
                              Overdue
                            </span>
                          )}
                          {isToday && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">
                              Today
                            </span>
                          )}
                        </div>

                        {/* Date and time */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> {item.follow_up_date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> {item.follow_up_time}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                        {item.message}
                      </p>

                      <hr className="border-border/10" />

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                          Created by: {item.profiles?.name || "System"} ({item.profiles?.email || "-"})
                        </span>

                        {/* Action buttons to toggle status if pending */}
                        {item.status === "Pending" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateFollowUpStatus(item.id, "Completed")}
                              disabled={statusPending}
                              className="px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 text-xs font-bold rounded-lg transition-all hover:text-white"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleUpdateFollowUpStatus(item.id, "Cancelled")}
                              disabled={statusPending}
                              className="px-2.5 py-1.5 bg-muted/10 border border-border text-muted-foreground hover:bg-muted-foreground text-xs font-bold rounded-lg transition-all hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

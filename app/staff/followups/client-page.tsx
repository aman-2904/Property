"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  CalendarClock,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  ArrowUpDown
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { updateFollowUpStatus } from "@/lib/actions/staff";

interface LeadFollowUp {
  id: string;
  lead_id: string;
  message: string;
  follow_up_date: string;
  follow_up_time: string;
  status: string;
  created_at: string;
  customer_leads: {
    id: string;
    name: string;
    phone: string;
  } | null;
}

interface StaffFollowUpsClientProps {
  initialFollowUps: LeadFollowUp[];
  totalCount: number;
  currentPage: number;
}

export function StaffFollowUpsClient({
  initialFollowUps,
  totalCount,
  currentPage,
}: StaffFollowUpsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = React.useState(searchParams.get("search") || "");
  const [selectedStatus, setSelectedStatus] = React.useState(searchParams.get("status") || "all");
  const [isPending, startTransition] = React.useTransition();

  const limit = 10;
  const totalPages = Math.ceil(totalCount / limit);

  const updateFilters = (newSearch: string, newStatus: string, newPage: number) => {
    const params = new URLSearchParams(searchParams);
    
    if (newSearch) {
      params.set("search", newSearch);
    } else {
      params.delete("search");
    }

    if (newStatus && newStatus !== "all") {
      params.set("status", newStatus);
    } else {
      params.delete("status");
    }

    if (newPage > 1) {
      params.set("page", newPage.toString());
    } else {
      params.delete("page");
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(searchQuery, selectedStatus, 1);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    updateFilters(searchQuery, status, 1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      updateFilters(searchQuery, selectedStatus, page);
    }
  };

  const handleMarkCompleted = async (followUpId: string, leadId: string) => {
    startTransition(async () => {
      try {
        const res = await updateFollowUpStatus(followUpId, leadId, "Completed");
        if (res && res.error) {
          alert(res.error);
        } else {
          router.refresh();
        }
      } catch (err: any) {
        alert(err?.message || "Failed to update status.");
      }
    });
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const getStatusBadge = (item: LeadFollowUp) => {
    const isOverdue = item.status === "Pending" && item.follow_up_date < todayStr;

    if (item.status === "Completed") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3" /> Completed
        </span>
      );
    }

    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertCircle className="h-3 w-3 animate-pulse" /> Overdue
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Upcoming Follow-ups</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your callbacks and customer communications schedule
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 rounded-2xl border border-border/40 bg-card/30 backdrop-blur-xl">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search by customer name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-24 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-emerald-500/50 transition-all"
          />
          <button
            type="submit"
            className="absolute top-1.5 right-1.5 h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold active:scale-[0.98] transition-all"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: "all", label: "All Schedules" },
            { value: "Pending", label: "Pending" },
            { value: "Overdue", label: "Overdue" },
            { value: "Completed", label: "Completed" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              className={cn(
                "h-11 px-4 rounded-xl border border-border/50 text-xs font-semibold transition-all hover:bg-muted/30",
                selectedStatus === opt.value
                  ? "bg-emerald-600/10 text-emerald-400 border-emerald-500/30"
                  : "bg-muted/10 text-muted-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Follow-ups List */}
      <div className="rounded-3xl border border-border/40 bg-card/30 backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/10">
                <th className="p-4 pl-6">Customer Name</th>
                <th className="p-4">Contact Phone</th>
                <th className="p-4">Schedule Date & Time</th>
                <th className="p-4">Message / Purpose</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialFollowUps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20">
                    <CalendarClock className="h-10 w-10 text-emerald-500/60 mx-auto mb-3" />
                    <p className="text-base font-bold">No follow-ups found</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      There are no callbacks matching your search or filters. You are completely caught up!
                    </p>
                  </td>
                </tr>
              ) : (
                initialFollowUps.map((item) => {
                  const isPendingStatus = item.status === "Pending";
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-border/40 last:border-0 hover:bg-muted/5 transition-colors text-sm"
                    >
                      <td className="p-4 pl-6 font-bold">
                        {item.customer_leads ? (
                          <Link
                            href={`/staff/leads/${item.lead_id}`}
                            className="hover:text-emerald-400 hover:underline"
                          >
                            {item.customer_leads.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground font-normal italic">Unknown Lead</span>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {item.customer_leads ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-emerald-500/50" />
                            {item.customer_leads.phone}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-foreground">{item.follow_up_date}</span>
                        <span className="text-xs text-muted-foreground block font-mono">{item.follow_up_time}</span>
                      </td>
                      <td className="p-4 text-muted-foreground max-w-xs truncate italic">
                        &quot;{item.message}&quot;
                      </td>
                      <td className="p-4">{getStatusBadge(item)}</td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <Link
                            href={`/staff/leads/${item.lead_id}`}
                            className="p-2 rounded-lg border border-border/40 hover:bg-card/60 text-muted-foreground hover:text-foreground transition-all"
                            title="View Lead Timeline"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          {isPendingStatus && (
                            <button
                              onClick={() => handleMarkCompleted(item.id, item.lead_id)}
                              disabled={isPending}
                              className="px-3 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold active:scale-[0.98] transition-all flex items-center gap-1"
                              title="Mark Completed"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Done
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border/40 bg-muted/5 flex justify-between items-center text-xs text-muted-foreground">
            <div>
              Showing Page <strong className="text-foreground">{currentPage}</strong> of{" "}
              <strong className="text-foreground">{totalPages}</strong> ({totalCount} total follow-ups)
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isPending}
                className="p-2 rounded-lg border border-border/40 bg-card/60 hover:text-foreground disabled:opacity-50 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isPending}
                className="p-2 rounded-lg border border-border/40 bg-card/60 hover:text-foreground disabled:opacity-50 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

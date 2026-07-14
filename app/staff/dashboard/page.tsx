import * as React from "react";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { getStaffStats, getDashboardFollowUps } from "@/lib/actions/staff";
import { UserPlus, Clock, AlertTriangle, CheckCircle2, ChevronRight, Phone, Calendar } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage() {
  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/staff/login");
  }

  // Parallel fetch stats and active follow ups
  const [stats, followUps] = await Promise.all([
    getStaffStats(),
    getDashboardFollowUps(),
  ]);

  const todayStr = new Date().toISOString().split("T")[0];

  // Separate follow-ups into overdue and today/upcoming
  const overdueFollowUps = followUps.filter(f => f.follow_up_date < todayStr);
  const todaysFollowUps = followUps.filter(f => f.follow_up_date === todayStr);
  const futureFollowUps = followUps.filter(f => f.follow_up_date > todayStr);



  const kpis = [
    {
      label: "Today's Leads",
      value: stats.todaysLeads,
      icon: UserPlus,
      color: "from-violet-500/10 to-purple-500/10 text-violet-500 border-violet-500/20",
    },
    {
      label: "Pending Follow-ups",
      value: stats.pendingFollowUps,
      icon: Clock,
      color: "from-blue-500/10 to-indigo-500/10 text-blue-500 border-blue-500/20",
    },
    {
      label: "Overdue Follow-ups",
      value: stats.overdueFollowUps,
      icon: AlertTriangle,
      color: "from-rose-500/10 to-red-500/10 text-rose-500 border-rose-500/20",
      highlight: stats.overdueFollowUps > 0,
    },
    {
      label: "Closed Leads",
      value: stats.closedLeads,
      icon: CheckCircle2,
      color: "from-emerald-500/10 to-teal-500/10 text-emerald-500 border-emerald-500/20",
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Staff Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back! Here is a summary of your leads and follow-ups for today.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={cn(
                "p-6 rounded-2xl border bg-card/50 backdrop-blur-xl relative overflow-hidden transition-all hover:scale-[1.02]",
                kpi.highlight ? "border-rose-500/50 shadow-lg shadow-rose-500/5" : "border-border/40"
              )}
            >
              {/* Subtle gradient glow */}
              <div className={cn("absolute inset-0 bg-gradient-to-br -z-10 opacity-30", kpi.color.split(" ")[0] + " " + kpi.color.split(" ")[1])} />
              
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {kpi.label}
                  </p>
                  <p className="text-3xl font-extrabold mt-2 tracking-tight">
                    {kpi.value}
                  </p>
                </div>
                <div className={cn("p-2.5 rounded-xl border", kpi.color)}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leads follow ups and urgent action required section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Overdue Follow-ups Card */}
        <div className="p-6 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Overdue Follow-ups</h2>
                <p className="text-xs text-muted-foreground">Action required immediately</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
              {overdueFollowUps.length} Overdue
            </span>
          </div>

          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {overdueFollowUps.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border/40 rounded-xl">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-75" />
                <p className="text-sm font-semibold text-muted-foreground">No overdue follow-ups!</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Great job keeping up with your schedule.</p>
              </div>
            ) : (
              overdueFollowUps.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.02] hover:bg-rose-500/[0.04] transition-colors flex justify-between items-center gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <p className="font-bold text-sm truncate">
                      {item.customer_leads?.name}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> {item.customer_leads?.phone}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-rose-400">
                        <Calendar className="h-3.5 w-3.5" /> Overdue: {item.follow_up_date} ({item.follow_up_time})
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 italic">
                      &quot;{item.message}&quot;
                    </p>
                  </div>
                  <Link
                    href={`/staff/leads/${item.lead_id}`}
                    className="p-2 rounded-lg border border-border/40 bg-card/60 text-muted-foreground hover:text-foreground transition-all shrink-0 hover:scale-105"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Today's Follow-ups Card */}
        <div className="p-6 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Today&apos;s Follow-ups</h2>
                <p className="text-xs text-muted-foreground">Scheduled for today</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              {todaysFollowUps.length} Today
            </span>
          </div>

          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {todaysFollowUps.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border/40 rounded-xl">
                <Calendar className="h-8 w-8 text-amber-500/75 mx-auto mb-2" />
                <p className="text-sm font-semibold text-muted-foreground">No follow-ups for today.</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Check leads tab to plan upcoming callbacks.</p>
              </div>
            ) : (
              todaysFollowUps.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.01] hover:bg-amber-500/[0.03] transition-colors flex justify-between items-center gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <p className="font-bold text-sm truncate">
                      {item.customer_leads?.name}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> {item.customer_leads?.phone}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-amber-400">
                        <Clock className="h-3.5 w-3.5" /> Today at: {item.follow_up_time}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 italic">
                      &quot;{item.message}&quot;
                    </p>
                  </div>
                  <Link
                    href={`/staff/leads/${item.lead_id}`}
                    className="p-2 rounded-lg border border-border/40 bg-card/60 text-muted-foreground hover:text-foreground transition-all shrink-0 hover:scale-105"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Upcoming / General Schedule Section */}
      <div className="p-6 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Upcoming Follow-ups</h2>
            <p className="text-xs text-muted-foreground">Scheduled for future dates</p>
          </div>
        </div>

        {futureFollowUps.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border/40 rounded-xl">
            <Calendar className="h-8 w-8 text-blue-500/75 mx-auto mb-2 opacity-75" />
            <p className="text-sm font-semibold text-muted-foreground">No upcoming follow-ups.</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">You are all caught up!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {futureFollowUps.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-border/40 bg-card/30 hover:bg-card/50 transition-colors flex justify-between items-center gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <p className="font-bold text-sm truncate">{item.customer_leads?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.message}</p>
                  <div className="text-[10px] font-semibold text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded-full inline-block font-mono">
                    {item.follow_up_date} at {item.follow_up_time}
                  </div>
                </div>
                <Link
                  href={`/staff/leads/${item.lead_id}`}
                  className="p-2 rounded-lg border border-border/40 bg-card/60 text-muted-foreground hover:text-foreground transition-all shrink-0 hover:scale-105"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

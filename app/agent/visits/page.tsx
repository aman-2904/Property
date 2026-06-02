import * as React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProperties } from "@/lib/actions/properties";
import { getVisits } from "@/lib/actions/visits";
import { VisitForm } from "@/components/forms/visit-form";
import { AgentVisitsClient } from "@/components/dashboard/agent-visits-client";

export default async function AgentVisitsPage() {
  const supabase = createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch properties (only available listings for visit setup)
  const properties = await getProperties(undefined, "available");

  // 2. Fetch logged visits for this agent
  const visits = await getVisits(user.id);

  // Map to select options format
  const mappedProperties = (properties || []).map((p: any) => ({
    id: p.id,
    title: `${p.title} (${p.location})`,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Customer Visits Log
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Record property tours with your prospective customers and maintain photo verification.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left column: Submit visit form */}
        <div className="lg:col-span-1 p-6 rounded-3xl border border-border/40 bg-zinc-950/10 glass-premium h-fit">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-foreground">Log New Visit</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter customer details and upload a tour selfie or proof sheet.
            </p>
          </div>
          <VisitForm properties={mappedProperties} />
        </div>

        {/* Right column: Logged visits list */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Logged Visit Records</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              History of site visits you have registered for commissions tracking.
            </p>
          </div>
          <AgentVisitsClient initialVisits={visits as any[]} />
        </div>
      </div>
    </div>
  );
}

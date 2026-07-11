import * as React from "react";
import { redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { getAgentSales, getAgentSalesSummary } from "@/lib/actions/sales";
import { getProperties } from "@/lib/actions/properties";
import { AgentSalesClient } from "@/components/dashboard/agent-sales-client";

export const metadata = {
  title: "Sales Management | Elit buildtech Agent Portal",
  description: "Track, manage, and monitor all your submitted property sales and commissions.",
};

export default async function AgentSalesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch sales, summary, and available properties in parallel
  const [sales, summary, allProperties] = await Promise.all([
    getAgentSales(user.id),
    getAgentSalesSummary(user.id),
    getProperties(),
  ]);

  // Map properties for filter dropdown & modal
  const propertyOptions = (allProperties || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    price: p.price,
  }));

  return (
    <AgentSalesClient
      initialSales={sales as any[]}
      summary={summary}
      properties={propertyOptions}
    />
  );
}

import * as React from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAgentSaleById } from "@/lib/actions/sales";
import { AgentSaleDetailClient } from "@/components/dashboard/agent-sale-detail-client";

export const metadata = {
  title: "Sale Details | Elit buildtech Agent Portal",
  description: "View property sale details, buyer information, commission breakdown, and approval timeline.",
};

interface SaleDetailPageProps {
  params: { id: string };
}

export default async function AgentSaleDetailPage({ params }: SaleDetailPageProps) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sale = await getAgentSaleById(params.id, user.id);

  // If the sale doesn't exist or doesn't belong to this agent, show 404
  if (!sale) {
    notFound();
  }

  return <AgentSaleDetailClient sale={sale as any} />;
}

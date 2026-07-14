import * as React from "react";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { getLeads, getPropertiesForSelect } from "@/lib/actions/staff";
import { LeadsClientPage } from "./client-page";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    page?: string;
    search?: string;
    status?: string;
    propertyId?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
}

export default async function StaffLeadsPage({ searchParams }: PageProps) {
  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/staff/login");
  }

  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || "";
  const status = searchParams.status || "all";
  const propertyId = searchParams.propertyId || "all";
  const sortBy = searchParams.sortBy || "created_at";
  const sortOrder = searchParams.sortOrder || "desc";

  // Fetch leads and properties in parallel
  const [leadsRes, properties] = await Promise.all([
    getLeads({
      page,
      limit: 10,
      search,
      status,
      propertyId,
      sortBy,
      sortOrder,
    }),
    getPropertiesForSelect(),
  ]);

  return (
    <LeadsClientPage
      initialLeads={leadsRes.data}
      totalLeads={leadsRes.count}
      properties={properties}
      currentPage={page}
      search={search}
      status={status}
      propertyId={propertyId}
      sortBy={sortBy}
      sortOrder={sortOrder}
    />
  );
}

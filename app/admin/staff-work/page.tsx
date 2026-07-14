import * as React from "react";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { getStaffMembers, getStaffPerformanceMetrics, getAdminLeadActivities, getPropertiesForSelect, getLeads } from "@/lib/actions/staff";
import { StaffWorkClient } from "./staff-work-client";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    dateFrom?: string;
    dateTo?: string;
    staffId?: string;
    propertyId?: string;
    status?: string;
  };
}

export default async function AdminStaffWorkPage({ searchParams }: PageProps) {
  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/admin/login");
  }

  const dateFrom = searchParams.dateFrom || "";
  const dateTo = searchParams.dateTo || "";
  const staffId = searchParams.staffId || "all";
  const propertyId = searchParams.propertyId || "all";
  const status = searchParams.status || "all";

  // Parallel fetch stats, properties, activities, and all leads for reassignment
  const [staffStats, staffList, properties, activities, leadsRes] = await Promise.all([
    getStaffPerformanceMetrics(dateFrom || undefined, dateTo || undefined),
    getStaffMembers(),
    getPropertiesForSelect(),
    getAdminLeadActivities({
      staffId: staffId !== "all" ? staffId : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit: 50,
    }),
    getLeads({
      limit: 100, // retrieve a good list of leads for reassignment options
      status: status !== "all" ? status : undefined,
      propertyId: propertyId !== "all" ? propertyId : undefined,
      staffId: staffId !== "all" ? staffId : undefined,
    }),
  ]);

  return (
    <StaffWorkClient
      staffStats={staffStats}
      staffList={staffList}
      properties={properties}
      initialActivities={activities}
      initialLeads={leadsRes.data}
      dateFrom={dateFrom}
      dateTo={dateTo}
      staffId={staffId}
      propertyId={propertyId}
      status={status}
    />
  );
}

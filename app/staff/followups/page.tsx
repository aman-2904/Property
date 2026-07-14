import * as React from "react";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { getStaffFollowUps } from "@/lib/actions/staff";
import { StaffFollowUpsClient } from "./client-page";

export const metadata = {
  title: "Upcoming Follow-ups | Elit buildtech",
  description: "View and manage all upcoming, pending, and overdue lead follow-up callbacks.",
};

interface PageProps {
  searchParams: {
    page?: string;
    search?: string;
    status?: string;
  };
}

export default async function StaffFollowUpsPage({ searchParams }: PageProps) {
  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/staff/login");
  }

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const search = searchParams.search || "";
  const status = searchParams.status || "all";

  const { data: followUps, count } = await getStaffFollowUps({
    page,
    limit: 10,
    search,
    status,
  });

  return (
    <StaffFollowUpsClient
      initialFollowUps={followUps}
      totalCount={count}
      currentPage={page}
    />
  );
}

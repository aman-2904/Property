import * as React from "react";
import { notFound, redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { getLeadDetail, getFollowUps } from "@/lib/actions/staff";
import { LeadTimelineClient } from "./lead-timeline-client";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function LeadDetailPage({ params }: PageProps) {
  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/staff/login");
  }

  const [lead, followUps] = await Promise.all([
    getLeadDetail(params.id),
    getFollowUps(params.id),
  ]);

  if (!lead) {
    notFound();
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Back button */}
      <div>
        <Link
          href="/staff/leads"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Leads List
        </Link>
      </div>

      <LeadTimelineClient lead={lead} initialFollowUps={followUps} />
    </div>
  );
}

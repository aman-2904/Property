import * as React from "react";
import { getPropertyById } from "@/lib/actions/properties";
import { PropertyDetailsClient } from "@/components/dashboard/property-details-client";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface AdminPropertyPageProps {
  params: {
    id: string;
  };
}

export default async function AdminPropertyDetailPage({ params }: AdminPropertyPageProps) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const property = await getPropertyById(params.id);

  if (!property) {
    redirect("/admin/properties");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Property Details Audit
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review listing parameters, image galleries, and active commission splits.
        </p>
      </div>

      <PropertyDetailsClient property={property} isAdmin={true} />
    </div>
  );
}

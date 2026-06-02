import * as React from "react";
import { getProperties } from "@/lib/actions/properties";
import { AdminPropertiesClient } from "@/components/dashboard/admin-properties-client";

export default async function AdminPropertiesPage() {
  const properties = await getProperties();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Manage Properties
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create, edit, search, and delete platform real estate listings.
        </p>
      </div>

      <AdminPropertiesClient initialProperties={properties as any[]} />
    </div>
  );
}

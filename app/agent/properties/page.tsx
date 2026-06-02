import * as React from "react";
import { getProperties } from "@/lib/actions/properties";
import { PropertiesCatalog } from "@/components/dashboard/properties-catalog";

export default async function AgentPropertiesPage() {
  const properties = await getProperties();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Properties & Sales
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse active real estate listings and register closed transaction sales.
        </p>
      </div>

      <PropertiesCatalog initialProperties={properties as any[]} />
    </div>
  );
}

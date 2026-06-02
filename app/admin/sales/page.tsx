import * as React from "react";
import { getSalesWithDetails } from "@/lib/actions/sales";
import { AdminSalesClient } from "@/components/dashboard/admin-sales-client";

export default async function AdminSalesPage() {
  const sales = await getSalesWithDetails();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Sales Ledger
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track agent sales, view buyer/seller info, approve pending sales, and audit commissions.
        </p>
      </div>

      <AdminSalesClient initialSales={sales as any[]} />
    </div>
  );
}

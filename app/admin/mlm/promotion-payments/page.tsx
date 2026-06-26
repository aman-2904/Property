import * as React from "react";
import { getPendingPromotionPayments, getPaymentHistory } from "@/lib/actions/promotions";
import { AdminPromotionPaymentsClient } from "./client-page";

export default async function AdminPromotionPaymentsPage() {
  const pending = await getPendingPromotionPayments();
  const history = await getPaymentHistory();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Promotion Payments Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review pending per-sale incentives, approve payment credits, mark payouts as paid, and view payment history.
        </p>
      </div>

      <AdminPromotionPaymentsClient 
        initialPending={pending as any[]} 
        initialHistory={history as any[]} 
      />
    </div>
  );
}

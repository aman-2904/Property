"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { requestPayout } from "@/lib/actions/payouts";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface PayoutFormProps {
  balance: number;
  hasBankDetails: boolean;
}

export function PayoutForm({ balance, hasBankDetails }: PayoutFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const payoutSchema = z.object({
    amount: z.coerce
      .number()
      .min(10, "Minimum withdrawal is ₹10")
      .max(balance, `Maximum withdrawal is your current balance (₹${balance.toLocaleString("en-US")})`),
    paymentMethod: z.string().min(1, "Please choose a payment method"),
  });

  type PayoutFormValues = z.infer<typeof payoutSchema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PayoutFormValues>({
    resolver: zodResolver(payoutSchema) as any,
    defaultValues: {
      amount: 0,
      paymentMethod: "",
    },
  });

  const onSubmit = (data: PayoutFormValues) => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await requestPayout({
        amount: data.amount,
        paymentMethod: data.paymentMethod,
      });

      if (res && res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        reset();
        router.refresh();
        setTimeout(() => setSuccess(false), 5000);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm flex items-start gap-2.5">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <span>Payout request submitted! Pending admin review.</span>
        </div>
      )}

      {!hasBankDetails && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 text-sm flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
          <span>Bank details (Bank Name, Account Number, and IFSC Code) are mandatory for withdrawals. Please update them in Settings.</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
          Withdrawal Amount (₹)
        </label>
        <input
          type="number"
          step="0.01"
          {...register("amount")}
          disabled={isPending || balance < 10 || !hasBankDetails}
          className={cn(
            "w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all font-semibold",
            errors.amount && "border-destructive/50"
          )}
        />
        {errors.amount && (
          <p className="text-xs text-destructive pl-1">{errors.amount.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
          Payment Method
        </label>
        <select
          {...register("paymentMethod")}
          disabled={isPending || balance < 10 || !hasBankDetails}
          className="w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all text-foreground cursor-pointer appearance-none"
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundPosition: "right 0.75rem center",
            backgroundSize: "1rem",
            backgroundRepeat: "no-repeat",
          }}
        >
          <option value="">Choose method...</option>
          <option value="Bank Transfer">Bank Transfer (ACH)</option>
          <option value="USDT (TRC-20)">USDT (TRC-20) Crypto</option>
          <option value="PayPal">PayPal</option>
        </select>
        {errors.paymentMethod && (
          <p className="text-xs text-destructive pl-1">{errors.paymentMethod.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending || balance < 10 || !hasBankDetails}
        className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all active:scale-[0.99] disabled:opacity-50 mt-6"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting request...
          </>
        ) : (
          "Request Withdrawal"
        )}
      </button>

      {balance < 10 && hasBankDetails && (
        <p className="text-[10px] text-muted-foreground text-center">
          You must have a balance of at least ₹10.00 to request a payout.
        </p>
      )}
    </form>
  );
}

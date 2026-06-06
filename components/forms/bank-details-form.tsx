"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { saveBankAccount } from "@/lib/actions/payouts";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface BankDetailsFormProps {
  onSuccessCallback?: () => void;
  defaultValues?: {
    id?: string;
    account_holder_name?: string | null;
    bank_name?: string | null;
    account_number?: string | null;
    ifsc_code?: string | null;
  };
}

export function BankDetailsForm({ onSuccessCallback, defaultValues }: BankDetailsFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const bankDetailsSchema = z
    .object({
      accountHolderName: z.string().trim().min(2, "Account holder name must be at least 2 characters"),
      bankName: z.string().trim().min(2, "Bank name must be at least 2 characters"),
      accountNumber: z.string().trim().min(5, "Account number must be at least 5 characters"),
      confirmAccountNumber: z.string().trim().min(5, "Confirm account number must be at least 5 characters"),
      ifscCode: z
        .string()
        .trim()
        .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, "Invalid IFSC code format (e.g. SBIN0001234)"),
    })
    .refine((data) => data.accountNumber === data.confirmAccountNumber, {
      message: "Account numbers do not match",
      path: ["confirmAccountNumber"],
    });

  type BankDetailsFormValues = z.infer<typeof bankDetailsSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BankDetailsFormValues>({
    resolver: zodResolver(bankDetailsSchema) as any,
    defaultValues: {
      accountHolderName: defaultValues?.account_holder_name || "",
      bankName: defaultValues?.bank_name || "",
      accountNumber: defaultValues?.account_number || "",
      confirmAccountNumber: defaultValues?.account_number || "",
      ifscCode: defaultValues?.ifsc_code || "",
    },
  });

  const onSubmit = (data: BankDetailsFormValues) => {
    if (isPending) return; // Prevent duplicate submissions
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await saveBankAccount({
        id: defaultValues?.id,
        accountHolderName: data.accountHolderName,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode.toUpperCase(),
      });

      if (res && res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        router.refresh();
        if (onSuccessCallback) {
          setTimeout(() => {
            onSuccessCallback();
          }, 1500);
        }
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
          <span>Bank details updated successfully!</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
          Account Holder Name
        </label>
        <input
          type="text"
          placeholder="e.g. John Doe"
          {...register("accountHolderName")}
          disabled={isPending}
          className={cn(
            "w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all font-semibold",
            errors.accountHolderName && "border-destructive/50"
          )}
        />
        {errors.accountHolderName && (
          <p className="text-xs text-destructive pl-1">{errors.accountHolderName.message as string}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
          Bank Name
        </label>
        <input
          type="text"
          placeholder="e.g. HDFC Bank"
          {...register("bankName")}
          disabled={isPending}
          className={cn(
            "w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all font-semibold",
            errors.bankName && "border-destructive/50"
          )}
        />
        {errors.bankName && (
          <p className="text-xs text-destructive pl-1">{errors.bankName.message as string}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
          Bank Account Number
        </label>
        <input
          type="text"
          placeholder="Enter Account Number"
          {...register("accountNumber")}
          disabled={isPending}
          className={cn(
            "w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all font-semibold",
            errors.accountNumber && "border-destructive/50"
          )}
        />
        {errors.accountNumber && (
          <p className="text-xs text-destructive pl-1">{errors.accountNumber.message as string}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
          Confirm Account Number
        </label>
        <input
          type="text"
          placeholder="Confirm Account Number"
          {...register("confirmAccountNumber")}
          disabled={isPending}
          className={cn(
            "w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all font-semibold",
            errors.confirmAccountNumber && "border-destructive/50"
          )}
        />
        {errors.confirmAccountNumber && (
          <p className="text-xs text-destructive pl-1">{errors.confirmAccountNumber.message as string}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
          IFSC Code
        </label>
        <input
          type="text"
          placeholder="e.g. HDFC0001234"
          {...register("ifscCode")}
          disabled={isPending}
          className={cn(
            "w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all font-semibold",
            errors.ifscCode && "border-destructive/50"
          )}
        />
        {errors.ifscCode && (
          <p className="text-xs text-destructive pl-1">{errors.ifscCode.message as string}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary to-violet-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/35 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Bank Details"
        )}
      </button>
    </form>
  );
}

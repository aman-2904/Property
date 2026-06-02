"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateBankDetails } from "@/lib/actions/payouts";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface BankDetailsFormProps {
  onSuccessCallback?: () => void;
  defaultValues?: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  };
}

export function BankDetailsForm({ onSuccessCallback, defaultValues }: BankDetailsFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const bankDetailsSchema = z.object({
    bankName: z.string().min(2, "Bank name must be at least 2 characters"),
    accountNumber: z.string().min(5, "Account number must be at least 5 characters"),
    ifscCode: z.string().min(4, "IFSC code must be at least 4 characters"),
  });

  type BankDetailsFormValues = z.infer<typeof bankDetailsSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BankDetailsFormValues>({
    resolver: zodResolver(bankDetailsSchema) as any,
    defaultValues: defaultValues || {
      bankName: "",
      accountNumber: "",
      ifscCode: "",
    },
  });

  const onSubmit = (data: BankDetailsFormValues) => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await updateBankDetails(data);

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
          Bank Name
        </label>
        <input
          type="text"
          placeholder="e.g. JPMorgan Chase"
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
          Account Number
        </label>
        <input
          type="text"
          placeholder="e.g. 1234567890"
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
          IFSC / Routing Code
        </label>
        <input
          type="text"
          placeholder="e.g. CHAS0123456"
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

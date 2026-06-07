"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, AlertCircle } from "lucide-react";
import { submitSale } from "@/lib/actions/sales";
import { cn, numberToIndianWords } from "@/lib/utils";

const saleSchema = z.object({
  buyerName: z.string().min(2, "Buyer name must be at least 2 characters"),
  buyerPhone: z.string().min(6, "Please enter a valid phone number"),
  salePrice: z.coerce.number().min(1, "Sale price must be greater than 0"),
  bookingAmount: z.coerce.number().min(1, "Booking amount must be greater than 0"),
}).refine((data) => data.bookingAmount <= data.salePrice, {
  message: "Booking amount cannot exceed the sale value",
  path: ["bookingAmount"],
});

type SaleFormValues = z.infer<typeof saleSchema>;

interface SaleFormProps {
  propertyId: string;
  propertyTitle: string;
  propertyPrice: number;
  onSuccess: () => void;
}

export function SaleForm({
  propertyId,
  propertyTitle,
  propertyPrice,
  onSuccess,
}: SaleFormProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema) as any,
    defaultValues: {
      buyerName: "",
      buyerPhone: "",
      salePrice: propertyPrice,
      bookingAmount: "" as any,
    },
  });

  const bookingAmountValue = watch("bookingAmount");

  const onSubmit = (data: SaleFormValues) => {
    setError(null);
    startTransition(async () => {
      const res = await submitSale({
        propertyId,
        buyerName: data.buyerName,
        buyerPhone: data.buyerPhone,
        salePrice: propertyPrice,
        bookingAmount: data.bookingAmount,
      });

      if (res && res.error) {
        setError(res.error);
      } else {
        onSuccess();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
        <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
          Property Selection
        </span>
        <h4 className="font-bold text-foreground mt-0.5">{propertyTitle}</h4>
        <p className="text-xs text-primary font-semibold mt-1">
          Base Listing Price: ₹{propertyPrice.toLocaleString("en-US")}
        </p>
        <p className="text-[10px] text-muted-foreground font-semibold leading-tight">
          {numberToIndianWords(propertyPrice)}
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Buyer Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
          Buyer Name
        </label>
        <input
          type="text"
          {...register("buyerName")}
          disabled={isPending}
          placeholder="Jane Smith"
          className={cn(
            "w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all",
            errors.buyerName && "border-destructive/50"
          )}
        />
        {errors.buyerName && (
          <p className="text-xs text-destructive pl-1">{errors.buyerName.message}</p>
        )}
      </div>

      {/* Buyer Phone */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
          Buyer Phone Number
        </label>
        <input
          type="tel"
          {...register("buyerPhone")}
          disabled={isPending}
          placeholder="+1 (555) 019-2834"
          className={cn(
            "w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all",
            errors.buyerPhone && "border-destructive/50"
          )}
        />
        {errors.buyerPhone && (
          <p className="text-xs text-destructive pl-1">{errors.buyerPhone.message}</p>
        )}
      </div>

      {/* Sale Price */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
          Actual Sale Price (₹)
        </label>
        <input
          type="text"
          value={`₹${propertyPrice.toLocaleString("en-US")}`}
          disabled
          readOnly
          className="w-full px-4 py-2.5 bg-muted/40 border border-border/50 rounded-xl text-sm outline-none transition-all font-semibold text-muted-foreground cursor-not-allowed"
        />
        <p className="text-[10px] text-muted-foreground font-semibold pl-1 leading-tight">
          {numberToIndianWords(propertyPrice)}
        </p>
      </div>

      {/* Booking Amount */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
          Booking Amount (₹) *
        </label>
        <input
          type="number"
          step="0.01"
          {...register("bookingAmount")}
          disabled={isPending}
          placeholder="e.g. 50000"
          className={cn(
            "w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all font-semibold",
            errors.bookingAmount && "border-destructive/50"
          )}
        />
        {bookingAmountValue && Number(bookingAmountValue) > 0 && (
          <p className="text-[10px] text-muted-foreground font-semibold pl-1 leading-tight mt-1 animate-in fade-in duration-200">
            {numberToIndianWords(Number(bookingAmountValue))}
          </p>
        )}
        {errors.bookingAmount && (
          <p className="text-xs text-destructive pl-1">{errors.bookingAmount.message}</p>
        )}
      </div>


      <button
        type="submit"
        disabled={isPending}
        className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all active:scale-[0.99] disabled:opacity-50 mt-6"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Registering sale...
          </>
        ) : (
          "Register Sale Transaction"
        )}
      </button>
    </form>
  );
}

"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FileUpload } from "@/components/ui/file-upload";
import { createVisit } from "@/lib/actions/visits";
import { Loader2, Image as ImageIcon, CheckCircle } from "lucide-react";

const visitSchema = z.object({
  property_id: z.string().min(1, "Please select a property"),
  customer_name: z.string().min(1, "Customer name is required"),
  customer_contact: z.string().min(1, "Customer contact is required"),
  visit_mode: z.enum(["physical", "virtual"]),
  coordinator_name: z.string().min(1, "Coordinator name is required"),
  people_count: z.number().int().min(1, "Must be at least 1 person"),
  photo_url: z.string().min(1, "Photo proof of visit is required"),
});

type VisitFormValues = z.infer<typeof visitSchema>;

interface VisitFormProps {
  properties: { id: string; title: string }[];
  onSuccess?: () => void;
}

export function VisitForm({ properties, onSuccess }: VisitFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<VisitFormValues>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      visit_mode: "physical",
      people_count: 1,
      photo_url: "",
    },
  });

  const photoUrl = watch("photo_url");

  const onSubmit = async (values: VisitFormValues) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await createVisit({
      property_id: values.property_id,
      customer_name: values.customer_name,
      customer_contact: values.customer_contact,
      visit_mode: values.visit_mode,
      coordinator_name: values.coordinator_name,
      people_count: values.people_count,
      photo_url: values.photo_url,
    });

    setIsLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg("Site visit logged successfully!");
      reset({
        property_id: "",
        customer_name: "",
        customer_contact: "",
        visit_mode: "physical",
        coordinator_name: "",
        people_count: 1,
        photo_url: "",
      });
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-semibold">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          {successMsg}
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* Customer Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider pl-1">
            Customer Information
          </h3>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
              Customer Name
            </label>
            <input
              type="text"
              {...register("customer_name")}
              placeholder="e.g. John Doe"
              className="w-full h-11 px-4 rounded-xl border border-border/50 bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            />
            {errors.customer_name && (
              <p className="text-xs text-destructive pl-1">{errors.customer_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
              Customer Contact / Phone
            </label>
            <input
              type="text"
              {...register("customer_contact")}
              placeholder="e.g. +1 555-0199"
              className="w-full h-11 px-4 rounded-xl border border-border/50 bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            />
            {errors.customer_contact && (
              <p className="text-xs text-destructive pl-1">{errors.customer_contact.message}</p>
            )}
          </div>
        </div>

        {/* Visit Setup */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider pl-1">
            Visit Parameters
          </h3>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
              Select Property
            </label>
            <select
              {...register("property_id")}
              className="w-full h-11 px-3.5 rounded-xl border border-border/50 bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            >
              <option value="">-- Choose Listing --</option>
              {properties.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  {prop.title}
                </option>
              ))}
            </select>
            {errors.property_id && (
              <p className="text-xs text-destructive pl-1">{errors.property_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                Coordinator Name
              </label>
              <input
                type="text"
                {...register("coordinator_name")}
                placeholder="Staff Member"
                className="w-full h-11 px-4 rounded-xl border border-border/50 bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
              {errors.coordinator_name && (
                <p className="text-xs text-destructive pl-1">{errors.coordinator_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                Number of People
              </label>
              <input
                type="number"
                min="1"
                {...register("people_count", { valueAsNumber: true })}
                className="w-full h-11 px-4 rounded-xl border border-border/50 bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
              {errors.people_count && (
                <p className="text-xs text-destructive pl-1">{errors.people_count.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Visit Mode Toggle */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
            Visit Mode
          </label>
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-background/50 hover:bg-zinc-800/10 cursor-pointer transition-all">
              <span className="text-sm font-semibold text-foreground">Physical Site Visit</span>
              <input
                type="radio"
                value="physical"
                {...register("visit_mode")}
                className="h-4 w-4 text-primary focus:ring-primary"
              />
            </label>
            <label className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-background/50 hover:bg-zinc-800/10 cursor-pointer transition-all">
              <span className="text-sm font-semibold text-foreground">Virtual Walkthrough</span>
              <input
                type="radio"
                value="virtual"
                {...register("visit_mode")}
                className="h-4 w-4 text-primary focus:ring-primary"
              />
            </label>
          </div>
          {errors.visit_mode && (
            <p className="text-xs text-destructive pl-1">{errors.visit_mode.message}</p>
          )}
        </div>

        {/* Photo Proof Upload */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
            Photo Proof / Screenshot
          </label>
          
          {photoUrl ? (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <span className="text-xs font-medium truncate max-w-[280px] flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4" />
                Proof Image Uploaded
              </span>
              <button
                type="button"
                onClick={() => setValue("photo_url", "")}
                className="text-xs font-bold underline hover:text-primary/80"
              >
                Replace
              </button>
            </div>
          ) : (
            <FileUpload
              bucket="properties"
              onUploadComplete={(url) => setValue("photo_url", url)}
              allowedTypes={["image/jpeg", "image/png", "image/webp"]}
            />
          )}
          {errors.photo_url && (
            <p className="text-xs text-destructive pl-1">{errors.photo_url.message}</p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/95 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Logging Visit...
          </>
        ) : (
          "Submit Visit Record"
        )}
      </button>
    </form>
  );
}

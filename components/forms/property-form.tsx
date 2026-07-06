"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FileUpload } from "@/components/ui/file-upload";
import { Loader2, AlertCircle, Trash2, FileText, PlusCircle, Check } from "lucide-react";
import { createProperty, updateProperty, PropertyData } from "@/lib/actions/properties";
import { cn, numberToIndianWords } from "@/lib/utils";

const propertyFormSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    location: z.string().min(3, "Location must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    price: z.coerce.number().min(0, "Price must be positive"),
    total_commission_percent: z.coerce
      .number()
      .min(0, "Percentage must be positive")
      .max(100, "Percentage cannot exceed 100%"),
    seller_percent: z.coerce.number().min(0).max(100),
    level1_percent: z.coerce.number().min(0).max(100),
    level2_percent: z.coerce.number().min(0).max(100),
    level3_percent: z.coerce.number().min(0).max(100),
    level4_percent: z.coerce.number().min(0).max(100),
    level5_percent: z.coerce.number().min(0).max(100),
    level6_percent: z.coerce.number().min(0).max(100),
    level7_percent: z.coerce.number().min(0).max(100),
    level8_percent: z.coerce.number().min(0).max(100),
    level9_percent: z.coerce.number().min(0).max(100),
    level10_percent: z.coerce.number().min(0).max(100),
    image_urls: z.array(z.string()).min(1, "Please upload at least one image"),
    brochure_url: z.string().nullable().optional().or(z.literal("")),
    status: z.enum(["draft", "available", "sold"]),
  })
  .refine(
    (data) => {
      const sum =
        Number(data.seller_percent) +
        Number(data.level1_percent) +
        Number(data.level2_percent) +
        Number(data.level3_percent) +
        Number(data.level4_percent) +
        Number(data.level5_percent) +
        Number(data.level6_percent) +
        Number(data.level7_percent) +
        Number(data.level8_percent) +
        Number(data.level9_percent) +
        Number(data.level10_percent);
      return sum <= Number(data.total_commission_percent);
    },
    {
      message: "Sum of individual splits (Seller + Levels 1-10) cannot exceed Total Commission Percentage.",
      path: ["total_commission_percent"],
    }
  );

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

interface PropertyFormProps {
  property?: PropertyData | null;
  onSuccess: () => void;
}

export function PropertyForm({ property, onSuccess }: PropertyFormProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const isEditMode = !!property;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema) as any,
    defaultValues: {
      title: property?.title || "",
      location: property?.location || "",
      description: property?.description || "",
      price: property?.price || 0,
      total_commission_percent: property ? property.total_commission_percent : 0,
      seller_percent: property ? property.seller_percent : 0,
      level1_percent: property ? property.level1_percent : 0,
      level2_percent: property ? property.level2_percent : 0,
      level3_percent: property ? property.level3_percent : 0,
      level4_percent: property ? property.level4_percent : 0,
      level5_percent: property ? property.level5_percent : 0,
      level6_percent: property ? property.level6_percent : 0,
      level7_percent: property ? property.level7_percent : 0,
      level8_percent: property ? property.level8_percent : 0,
      level9_percent: property ? property.level9_percent : 0,
      level10_percent: property ? property.level10_percent : 0,
      image_urls: property?.image_urls || [],
      brochure_url: property?.brochure_url || "",
      status: property?.status || "available",
    },
  });

  const image_urls = watch("image_urls") || [];
  const brochure_url = watch("brochure_url");
  const priceValue = watch("price");

  // Add uploaded image url to list
  const handleImageUploadComplete = (url: string) => {
    setValue("image_urls", [...image_urls, url], { shouldValidate: true });
  };

  // Remove image from gallery
  const handleRemoveImage = (index: number) => {
    const updated = [...image_urls];
    updated.splice(index, 1);
    setValue("image_urls", updated, { shouldValidate: true });
  };

  const handleBrochureUploadComplete = (url: string) => {
    setValue("brochure_url", url, { shouldValidate: true });
  };

  const onSubmit = (data: PropertyFormValues) => {
    setError(null);
    startTransition(async () => {
      let res;
      if (isEditMode && property?.id) {
        res = await updateProperty(property.id, data);
      } else {
        res = await createProperty(data);
      }

      if (res && res.error) {
        setError(res.error);
      } else {
        onSuccess();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Basic details */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-primary uppercase tracking-wider pl-1">
          1. General Information
        </h3>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
            Listing Title
          </label>
          <input
            type="text"
            {...register("title")}
            disabled={isPending}
            placeholder="elitebuildtech Green Valley Penthouse"
            className={cn(
              "w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all",
              errors.title && "border-destructive/50"
            )}
          />
          {errors.title && (
            <p className="text-xs text-destructive pl-1">{errors.title.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
              Location
            </label>
            <input
              type="text"
              {...register("location")}
              disabled={isPending}
              placeholder="Beverly Hills, CA"
              className={cn(
                "w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all",
                errors.location && "border-destructive/50"
              )}
            />
            {errors.location && (
              <p className="text-xs text-destructive pl-1">{errors.location.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
              Listing Price (₹)
            </label>
            <input
              type="number"
              {...register("price")}
              disabled={isPending}
              placeholder="1250000"
              className={cn(
                "w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all font-semibold",
                errors.price && "border-destructive/50"
              )}
            />
            {priceValue && Number(priceValue) > 0 && (
              <p className="text-[10px] text-muted-foreground font-semibold pl-1 leading-tight mt-1 animate-in fade-in duration-200">
                {numberToIndianWords(Number(priceValue))}
              </p>
            )}
            {errors.price && (
              <p className="text-xs text-destructive pl-1">{errors.price.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
            Status
          </label>
          <select
            {...register("status")}
            disabled={isPending}
            className="w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all text-foreground cursor-pointer"
          >
            <option value="available">Available</option>
            <option value="sold">Sold</option>
            <option value="draft">Draft (Archived)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
            Property Description
          </label>
          <textarea
            {...register("description")}
            disabled={isPending}
            rows={3}
            placeholder="Provide amenities, luxury parameters, and other marketing details..."
            className={cn(
              "w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all resize-none",
              errors.description && "border-destructive/50"
            )}
          />
          {errors.description && (
            <p className="text-xs text-destructive pl-1">{errors.description.message}</p>
          )}
        </div>
      </div>

      {/* Media and documents */}
      <div className="space-y-4 pt-2 border-t border-border/40">
        <h3 className="text-sm font-bold text-primary uppercase tracking-wider pl-1">
          2. Media & Brochures
        </h3>

        {/* Gallery */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
            Property Image Gallery
          </label>
          
          {/* Gallery Previews */}
          {image_urls.length > 0 && (
            <div className="grid grid-cols-4 gap-3 p-3 rounded-2xl bg-muted/20 border border-border/50 mb-3">
              {image_urls.map((url, idx) => (
                <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-border/40 group bg-muted/30">
                  <img src={url} alt={`Preview ${idx + 1}`} className="object-cover w-full h-full" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 rounded-lg"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <FileUpload
            bucket="properties"
            onUploadComplete={handleImageUploadComplete}
            allowedTypes={["image/jpeg", "image/png", "image/webp"]}
          />
          {errors.image_urls && (
            <p className="text-xs text-destructive pl-1">{errors.image_urls.message}</p>
          )}
        </div>

        {/* Brochure */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
            Brochure PDF (Optional)
          </label>
          
          {brochure_url ? (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <span className="text-xs font-medium truncate max-w-[280px] flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                Brochure Uploaded
              </span>
              <button
                type="button"
                onClick={() => setValue("brochure_url", null)}
                className="text-xs font-bold underline hover:text-primary/80"
              >
                Replace
              </button>
            </div>
          ) : (
            <FileUpload
              bucket="properties"
              onUploadComplete={handleBrochureUploadComplete}
              allowedTypes={["application/pdf"]}
            />
          )}
        </div>
      </div>

      {/* Commissions */}
      <div className="space-y-4 pt-2 border-t border-border/40">
        <div className="flex items-center justify-between pl-1">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
            3. MLM Commission Structure
          </h3>
          {errors.total_commission_percent && (
            <span className="text-xs text-destructive font-semibold flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Check Splits Sum
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
              Total Commission (%)
            </label>
            <input
              type="number"
              step="0.01"
              {...register("total_commission_percent")}
              disabled={isPending}
              placeholder="6.0"
              className={cn(
                "w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all font-bold text-primary",
                errors.total_commission_percent && "border-destructive/50"
              )}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
              Direct Seller Split (%)
            </label>
            <input
              type="number"
              step="0.01"
              {...register("seller_percent")}
              disabled={isPending}
              placeholder="50.0"
              className="w-full px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm outline-none focus:border-primary/50 transition-all font-semibold"
            />
          </div>
        </div>

        {errors.total_commission_percent && (
          <p className="text-xs text-destructive pl-1">{errors.total_commission_percent.message}</p>
        )}

        {/* Upline override levels */}
        <div className="space-y-3">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider pl-1">
            Recursive Upline Overrides (Levels 1 to 10)
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => {
              const levelNum = i + 1;
              return (
                <div key={levelNum} className="space-y-1 p-2 rounded-xl bg-muted/10 border border-border/30">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wide block text-center">
                    L{levelNum} Override %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`level${levelNum}_percent` as any)}
                    disabled={isPending}
                    className="w-full text-center py-1 bg-transparent border-b border-border/40 focus:border-primary/60 outline-none text-xs font-semibold"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all active:scale-[0.99] disabled:opacity-50 mt-8"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {isEditMode ? "Saving changes..." : "Creating listing..."}
          </>
        ) : (
          <>
            {isEditMode ? <Check className="h-4.5 w-4.5" /> : <PlusCircle className="h-4.5 w-4.5" />}
            {isEditMode ? "Save Property Changes" : "Publish Property Listing"}
          </>
        )}
      </button>
    </form>
  );
}

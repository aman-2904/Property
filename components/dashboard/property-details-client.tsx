"use client";

import * as React from "react";
import { PropertyData } from "@/lib/actions/properties";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal, ModalPortal, ModalOverlay, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal-system";
import { SaleForm } from "@/components/forms/sale-form";
import { 
  Building2, 
  MapPin, 
  Landmark, 
  FileDown, 
  ArrowLeft, 
  Users, 
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface PropertyDetailsClientProps {
  property: PropertyData;
  isAdmin?: boolean;
}

export function PropertyDetailsClient({ property, isAdmin = false }: PropertyDetailsClientProps) {
  const [activeImage, setActiveImage] = React.useState(
    property.image_urls && property.image_urls[0] ? property.image_urls[0] : ""
  );
  
  const [isRegisterOpen, setIsRegisterOpen] = React.useState(false);
  const [showSuccessToast, setShowSuccessToast] = React.useState(false);

  const price = Number(property.price);
  const totalCommissionPool = price * (Number(property.total_commission_percent) / 100);

  // Commission splits details array
  const splits = React.useMemo(() => {
    const list = [
      { name: "Direct Seller Commission", percent: Number(property.seller_percent), level: "Level 0" },
      { name: "Level 1 Direct Sponsor Override", percent: Number(property.level1_percent), level: "Level 1" },
      { name: "Level 2 Grand Sponsor Override", percent: Number(property.level2_percent), level: "Level 2" },
      { name: "Level 3 Override", percent: Number(property.level3_percent), level: "Level 3" },
      { name: "Level 4 Override", percent: Number(property.level4_percent), level: "Level 4" },
      { name: "Level 5 Override", percent: Number(property.level5_percent), level: "Level 5" },
      { name: "Level 6 Override", percent: Number(property.level6_percent), level: "Level 6" },
      { name: "Level 7 Override", percent: Number(property.level7_percent), level: "Level 7" },
      { name: "Level 8 Override", percent: Number(property.level8_percent), level: "Level 8" },
      { name: "Level 9 Override", percent: Number(property.level9_percent), level: "Level 9" },
      { name: "Level 10 Override", percent: Number(property.level10_percent), level: "Level 10" },
    ];
    // Filter out zero percent overrides to keep the list clean
    return list.filter((s) => s.percent > 0);
  }, [property]);

  const handleSaleSuccess = () => {
    setIsRegisterOpen(false);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 5000);
  };

  const backLink = isAdmin ? "/admin/properties" : "/agent/properties";

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link 
        href={backLink}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to listings catalog
      </Link>

      {/* Main layout */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Side: Images gallery & Description */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Cover Image */}
          <div className="relative aspect-[16/9] w-full rounded-3xl border border-border/40 overflow-hidden bg-muted/40 shadow-xl">
            {activeImage ? (
              <img 
                src={activeImage} 
                alt={property.title} 
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                <Building2 className="h-16 w-16 opacity-40" />
              </div>
            )}
            <div className="absolute top-4 right-4">
              <StatusBadge status={property.status} />
            </div>
          </div>

          {/* Gallery Thumbnails */}
          {property.image_urls && property.image_urls.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1.5 scrollbar-thin">
              {property.image_urls.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(url)}
                  className={cn(
                    "relative aspect-video w-24 rounded-xl border-2 overflow-hidden bg-muted/40 shrink-0 transition-all",
                    activeImage === url 
                      ? "border-primary opacity-100 scale-102"
                      : "border-transparent opacity-60 hover:opacity-90"
                  )}
                >
                  <img src={url} alt={`Thumbnail ${idx + 1}`} className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
          )}

          {/* Property description */}
          <div className="p-6 rounded-3xl border border-border/40 bg-zinc-950/20 glass-premium space-y-4">
            <h3 className="text-lg font-bold text-foreground">Property Overview</h3>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {property.description}
            </p>
          </div>
        </div>

        {/* Right Side: Price, splits, brochures, registry */}
        <div className="space-y-6">
          
          {/* Detail card */}
          <div className="p-6 rounded-3xl border border-border/40 bg-zinc-950/20 glass-premium space-y-6 shadow-xl">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-1">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span>{property.location}</span>
              </div>
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight pl-1">
                {property.title}
              </h2>
            </div>

            <div className="pt-4 border-t border-border/40 grid grid-cols-2 gap-4 pl-1">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Listing Price
                </span>
                <span className="text-2xl font-extrabold text-foreground mt-0.5 block">
                  ${price.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Comm. Rate
                </span>
                <span className="text-2xl font-extrabold text-primary mt-0.5 block">
                  {property.total_commission_percent}%
                </span>
              </div>
            </div>

            {/* Total Commission Pool Value */}
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-between mx-1">
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">
                    Total Override Pool
                  </span>
                  <span className="text-lg font-extrabold text-foreground">
                    ${totalCommissionPool.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Brochure button if present */}
            {property.brochure_url && (
              <a
                href={property.brochure_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-border/50 hover:bg-muted/40 text-foreground font-semibold text-sm transition-all shadow"
              >
                <FileDown className="h-4.5 w-4.5 text-muted-foreground" />
                Download Brochure PDF
              </a>
            )}

            {/* Register sale action */}
            {!isAdmin && property.status === "available" && (
              <button
                onClick={() => setIsRegisterOpen(true)}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/95 transition-all shadow-lg active:scale-[0.98]"
              >
                Register Closed Sale
              </button>
            )}
          </div>

          {/* Commission Splits breakdown card */}
          <div className="p-6 rounded-3xl border border-border/40 bg-zinc-950/20 glass-premium space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Users className="h-4.5 w-4.5 text-primary" />
              Override Splits Breakdown
            </h3>

            <div className="space-y-3">
              {splits.map((s, idx) => {
                const dollarAmt = totalCommissionPool * (s.percent / 100);
                return (
                  <div key={idx} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-muted/15 border border-border/30">
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground/90">{s.name}</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">{s.level}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-primary">{s.percent}%</span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        ${dollarAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Sale Registration modal */}
      <Modal open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <ModalPortal>
          <ModalOverlay />
          <ModalContent isOpen={isRegisterOpen} className="max-w-md">
            <ModalHeader>
              <ModalTitle>Register Property Transaction</ModalTitle>
            </ModalHeader>
            <div className="mt-4">
              <SaleForm
                propertyId={property.id!}
                propertyTitle={property.title}
                propertyPrice={property.price}
                onSuccess={handleSaleSuccess}
              />
            </div>
          </ModalContent>
        </ModalPortal>
      </Modal>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl bg-emerald-500 text-white font-semibold text-sm shadow-2xl"
          >
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span>Sale transaction registered successfully! Undergoing admin review.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

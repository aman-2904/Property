"use client";

import * as React from "react";
import { SearchFilter } from "@/components/tables/search-filter";
import { StatusBadge } from "@/components/ui/status-badge";
import { Building2, Landmark, MapPin, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PropertyData } from "@/lib/actions/properties";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PropertiesCatalogProps {
  initialProperties: PropertyData[];
}

export function PropertiesCatalog({ initialProperties }: PropertiesCatalogProps) {
  const router = useRouter();
  const [properties, setProperties] = React.useState(initialProperties);
  
  // Search / filter / pagination states
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("");
  const [priceFilter, setPriceFilter] = React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 6;

  React.useEffect(() => {
    setProperties(initialProperties);
  }, [initialProperties]);

  // Subscribe to Realtime Updates on the properties table
  React.useEffect(() => {
    const supabase = createClient();
    
    const channel = supabase
      .channel("realtime-properties-catalog")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "properties",
        },
        () => {
          // Instantly refresh server state and fetch updated listings
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  // Filter properties (agents only see available/sold listings; draft is hidden unless they are admin)
  const filteredProperties = React.useMemo(() => {
    return properties.filter((prop) => {
      // Exclude draft listings for standard catalog agents views
      if (prop.status === "draft") return false;

      const matchesSearch =
        prop.title.toLowerCase().includes(search.toLowerCase()) ||
        prop.location.toLowerCase().includes(search.toLowerCase()) ||
        prop.description.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = filter === "" ? true : prop.status === filter;

      let matchesPrice = true;
      const price = Number(prop.price);
      if (priceFilter === "under-500k") {
        matchesPrice = price < 500000;
      } else if (priceFilter === "500k-1m") {
        matchesPrice = price >= 500000 && price <= 1000000;
      } else if (priceFilter === "over-1m") {
        matchesPrice = price > 1000000;
      }

      return matchesSearch && matchesStatus && matchesPrice;
    });
  }, [properties, search, filter, priceFilter]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, filter, priceFilter]);

  // Calculate Paginated List
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
  const paginatedProperties = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProperties.slice(start, start + itemsPerPage);
  }, [filteredProperties, currentPage]);

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <SearchFilter
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search properties by title or location..."
          filterValue={filter}
          onFilterChange={setFilter}
          filterOptions={[
            { value: "available", label: "Available" },
            { value: "sold", label: "Sold" },
          ]}
          filterPlaceholder="All Listings"
          className="pb-0"
        />
        
        {/* Additional Price Filter Bar */}
        <div className="flex items-center gap-2 pl-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Price Range:
          </span>
          <div className="flex items-center gap-1.5">
            {[
              { value: "all", label: "All Prices" },
              { value: "under-500k", label: "Under $500K" },
              { value: "500k-1m", label: "$500K - $1M" },
              { value: "over-1m", label: "Over $1M" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPriceFilter(opt.value)}
                className={cn(
                  "px-3 py-1 text-xs rounded-full border transition-all font-medium",
                  priceFilter === opt.value
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted/10 border-border/50 text-muted-foreground hover:bg-muted/20"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid List */}
      <motion.div 
        layout
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        <AnimatePresence mode="popLayout">
          {paginatedProperties.map((prop) => {
            const coverImage = prop.image_urls && prop.image_urls[0];
            return (
              <motion.div
                key={prop.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col rounded-3xl border border-border/40 overflow-hidden glass-premium hover:border-primary/20 hover:scale-[1.01] transition-all duration-300 group shadow-xl bg-zinc-950/20"
              >
                {/* Image Preview */}
                <div className="relative aspect-video bg-muted/40 overflow-hidden">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={prop.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-muted-foreground bg-muted/30">
                      <Building2 className="h-10 w-10 opacity-40" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 z-10">
                    <StatusBadge status={prop.status} />
                  </div>
                </div>

                {/* Detail Content */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">{prop.location}</span>
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground line-clamp-1">
                      {prop.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                      {prop.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">
                        Listing Price
                      </span>
                      <span className="text-lg font-extrabold text-foreground">
                        ${Number(prop.price).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">
                        Comm. Rate
                      </span>
                      <span className="text-sm font-bold text-primary flex items-center gap-1">
                        <Landmark className="h-3.5 w-3.5" />
                        {prop.total_commission_percent}%
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/agent/properties/${prop.id}`}
                    className="w-full mt-5 h-10 flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-bold text-xs transition-all active:scale-[0.98] group"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Details & Splits
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {filteredProperties.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border/50 rounded-2xl min-h-[300px] glass-premium">
          <Building2 className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="font-semibold text-foreground">No properties match your filters</p>
          <p className="text-xs text-muted-foreground mt-1">Try resetting search keyword or filter options</p>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="pt-4 border-t border-border/40 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            Page {currentPage} of {totalPages} ({filteredProperties.length} listings)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
            
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

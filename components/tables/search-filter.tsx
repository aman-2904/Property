"use client";

import * as React from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
}

interface SearchFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: FilterOption[];
  filterPlaceholder?: string;
  className?: string;
}

export function SearchFilter({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filterValue = "",
  onFilterChange,
  filterOptions = [],
  filterPlaceholder = "All Statuses",
  className,
}: SearchFilterProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row gap-3 items-center justify-between w-full pb-4",
        className
      )}
    >
      <div className="relative w-full sm:max-w-xs">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
          <Search className="h-4 w-4" />
        </span>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-8 py-2 bg-muted/20 hover:bg-muted/30 focus:bg-background border border-border/50 focus:border-primary/50 rounded-xl text-sm placeholder-muted-foreground outline-none transition-all"
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {onFilterChange && filterOptions.length > 0 && (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <select
            value={filterValue}
            onChange={(e) => onFilterChange(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 bg-muted/20 hover:bg-muted/30 focus:bg-background border border-border/50 focus:border-primary/50 rounded-xl text-sm outline-none transition-all text-foreground cursor-pointer appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundPosition: "right 0.75rem center",
              backgroundSize: "1rem",
              backgroundRepeat: "no-repeat",
              paddingRight: "2.5rem",
            }}
          >
            <option value="" className="bg-card text-foreground">
              {filterPlaceholder}
            </option>
            {filterOptions.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="bg-card text-foreground"
              >
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

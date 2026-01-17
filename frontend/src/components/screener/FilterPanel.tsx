"use client";

import { useState, useMemo, useCallback } from "react";
import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stock } from "@/types";

export interface FilterCriteria {
  sector: string;
  industry: string;
  marketCapMin: number | null;
  marketCapMax: number | null;
  rsiMin: number | null;
  rsiMax: number | null;
  changeMin: number | null;
  changeMax: number | null;
}

export const defaultFilters: FilterCriteria = {
  sector: "Any",
  industry: "Any",
  marketCapMin: null,
  marketCapMax: null,
  rsiMin: null,
  rsiMax: null,
  changeMin: null,
  changeMax: null,
};

interface FilterPanelProps<TData> {
  data: Stock[];
  filters: FilterCriteria;
  onFilterChange: (filters: FilterCriteria) => void;
  table: Table<TData>;
}

export function FilterPanel<TData>({ data, filters, onFilterChange, table }: FilterPanelProps<TData>) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract unique sectors and industries from data
  const { sectors, industries } = useMemo(() => {
    const sectorSet = new Set<string>();
    const industrySet = new Set<string>();

    data.forEach((stock) => {
      if (stock.sector) sectorSet.add(stock.sector);
      if (stock.industry) industrySet.add(stock.industry);
    });

    return {
      sectors: ["Any", ...Array.from(sectorSet).sort()],
      industries: ["Any", ...Array.from(industrySet).sort()],
    };
  }, [data]);

  // Filter industries based on selected sector
  const filteredIndustries = useMemo(() => {
    if (filters.sector === "Any") return industries;

    const industrySet = new Set<string>();
    data.forEach((stock) => {
      if (stock.sector === filters.sector && stock.industry) {
        industrySet.add(stock.industry);
      }
    });

    return ["Any", ...Array.from(industrySet).sort()];
  }, [data, filters.sector, industries]);

  const updateFilter = useCallback(
    <K extends keyof FilterCriteria>(key: K, value: FilterCriteria[K]) => {
      const newFilters = { ...filters, [key]: value };
      // Reset industry when sector changes
      if (key === "sector" && value !== filters.sector) {
        newFilters.industry = "Any";
      }
      onFilterChange(newFilters);
    },
    [filters, onFilterChange]
  );

  const resetFilters = useCallback(() => {
    onFilterChange(defaultFilters);
  }, [onFilterChange]);

  const hasActiveFilters =
    filters.sector !== "Any" ||
    filters.industry !== "Any" ||
    filters.marketCapMin !== null ||
    filters.marketCapMax !== null ||
    filters.rsiMin !== null ||
    filters.rsiMax !== null ||
    filters.changeMin !== null ||
    filters.changeMax !== null;

  const activeFilterCount = [
    filters.sector !== "Any",
    filters.industry !== "Any",
    filters.marketCapMin !== null || filters.marketCapMax !== null,
    filters.rsiMin !== null || filters.rsiMax !== null,
    filters.changeMin !== null || filters.changeMax !== null,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Toggle Button and Quick Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          <FilterIcon />
          Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
              {activeFilterCount}
            </span>
          )}
          <ChevronIcon className={isExpanded ? "rotate-180" : ""} />
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <XIcon />
            Clear all
          </Button>
        )}
      </div>

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Sector Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Sector
              </label>
              <select
                value={filters.sector}
                onChange={(e) => updateFilter("sector", e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {sectors.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
            </div>

            {/* Industry Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Industry
              </label>
              <select
                value={filters.industry}
                onChange={(e) => updateFilter("industry", e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {filteredIndustries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>

            {/* Market Cap Range */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Market Cap (B)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.marketCapMin ?? ""}
                  onChange={(e) =>
                    updateFilter(
                      "marketCapMin",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  className="h-9 text-sm"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.marketCapMax ?? ""}
                  onChange={(e) =>
                    updateFilter(
                      "marketCapMax",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* RSI Range */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                RSI (14)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  min={0}
                  max={100}
                  value={filters.rsiMin ?? ""}
                  onChange={(e) =>
                    updateFilter(
                      "rsiMin",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  className="h-9 text-sm"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  min={0}
                  max={100}
                  value={filters.rsiMax ?? ""}
                  onChange={(e) =>
                    updateFilter(
                      "rsiMax",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Change % Range */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Change %
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  step={0.1}
                  value={filters.changeMin ?? ""}
                  onChange={(e) =>
                    updateFilter(
                      "changeMin",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  className="h-9 text-sm"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  step={0.1}
                  value={filters.changeMax ?? ""}
                  onChange={(e) =>
                    updateFilter(
                      "changeMax",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mt-4 pt-4 border-t border-border">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Quick Presets
            </label>
            <div className="flex flex-wrap gap-2">
              <PresetButton
                label="Overbought"
                onClick={() => {
                  onFilterChange({
                    ...defaultFilters,
                    rsiMin: 70,
                    rsiMax: 100,
                  });
                }}
                active={filters.rsiMin === 70 && filters.rsiMax === 100}
              />
              <PresetButton
                label="Oversold"
                onClick={() => {
                  onFilterChange({
                    ...defaultFilters,
                    rsiMin: 0,
                    rsiMax: 30,
                  });
                }}
                active={filters.rsiMin === 0 && filters.rsiMax === 30}
              />
              <PresetButton
                label="Large Cap"
                onClick={() => {
                  onFilterChange({
                    ...defaultFilters,
                    marketCapMin: 10,
                  });
                }}
                active={filters.marketCapMin === 10 && filters.marketCapMax === null}
              />
              <PresetButton
                label="Top Gainers"
                onClick={() => {
                  onFilterChange(defaultFilters);
                  table.setSorting([{ id: "change", desc: true }]);
                }}
                active={table.getState().sorting[0]?.id === "change" && table.getState().sorting[0]?.desc === true}
              />
              <PresetButton
                label="Top Losers"
                onClick={() => {
                  onFilterChange(defaultFilters);
                  table.setSorting([{ id: "change", desc: false }]);
                }}
                active={table.getState().sorting[0]?.id === "change" && table.getState().sorting[0]?.desc === false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Preset button component
function PresetButton({
  label,
  onClick,
  active,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

// Apply filters to data
export function applyFilters(data: Stock[], filters: FilterCriteria): Stock[] {
  return data.filter((stock) => {
    // Sector filter
    if (filters.sector !== "Any" && stock.sector !== filters.sector) {
      return false;
    }

    // Industry filter
    if (filters.industry !== "Any" && stock.industry !== filters.industry) {
      return false;
    }

    // Market cap filter (convert billions to actual value)
    const marketCap = stock.market_cap_basic;
    if (filters.marketCapMin !== null && marketCap !== null) {
      if (marketCap < filters.marketCapMin * 1_000_000_000) {
        return false;
      }
    }
    if (filters.marketCapMax !== null && marketCap !== null) {
      if (marketCap > filters.marketCapMax * 1_000_000_000) {
        return false;
      }
    }

    // RSI filter
    const rsi = stock.RSI;
    if (filters.rsiMin !== null && rsi !== null) {
      if (rsi < filters.rsiMin) {
        return false;
      }
    }
    if (filters.rsiMax !== null && rsi !== null) {
      if (rsi > filters.rsiMax) {
        return false;
      }
    }

    // Change % filter
    const change = stock.change;
    if (filters.changeMin !== null && change !== null) {
      if (change < filters.changeMin) {
        return false;
      }
    }
    if (filters.changeMax !== null && change !== null) {
      if (change > filters.changeMax) {
        return false;
      }
    }

    return true;
  });
}

// Icon Components
function FilterIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 transition-transform ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

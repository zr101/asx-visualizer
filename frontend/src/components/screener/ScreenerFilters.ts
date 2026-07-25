import type { ScreenerRow } from "@/types/data";

/**
 * Numeric filters are tri-state on nulls.
 *
 * The previous implementation compared only when a value was non-null, so a
 * stock with no RSI passed an "RSI between 0 and 30" filter - the oversold
 * screen silently returned every stock whose RSI was missing. Nulls now fail a
 * numeric filter by default, and the count of rows excluded for missing data is
 * reported so the behaviour is visible rather than surprising.
 */
export type NullPolicy = "exclude" | "include";

export interface NumericFilter {
  min: number | null;
  max: number | null;
}

export interface FilterState {
  query: string;
  sector: string | null;
  nullPolicy: NullPolicy;
  ranges: Partial<Record<NumericFilterKey, NumericFilter>>;
}

export const NUMERIC_FILTERS = {
  market_cap_basic: { label: "Market cap", scale: 1e9, unit: "$B", step: 0.1 },
  close: { label: "Price", scale: 1, unit: "$", step: 0.01 },
  change: { label: "Change", scale: 1, unit: "%", step: 0.1 },
  RSI: { label: "RSI", scale: 1, unit: "", step: 1 },
  dividend_yield_recent: { label: "Dividend yield", scale: 1, unit: "%", step: 0.1 },
  price_earnings_ttm: { label: "P/E", scale: 1, unit: "", step: 0.5 },
  earnings_yield: { label: "Earnings yield", scale: 1, unit: "%", step: 0.5 },
  Perf_3M: { label: "3-month return", scale: 1, unit: "%", step: 1 },
  pct_vs_sma200: { label: "vs 200-day average", scale: 1, unit: "%", step: 1 },
  rs_rating: { label: "RS rating", scale: 1, unit: "", step: 1 },
  turnover: { label: "Turnover", scale: 1e6, unit: "$M", step: 0.1 },
} as const;

export type NumericFilterKey = keyof typeof NUMERIC_FILTERS;

export const EMPTY_FILTERS: FilterState = {
  query: "",
  sector: null,
  nullPolicy: "exclude",
  ranges: {},
};

export interface FilterResult {
  rows: ScreenerRow[];
  excludedForMissingData: number;
}

export function applyFilters(rows: ScreenerRow[], filters: FilterState): FilterResult {
  const needle = filters.query.trim().toLowerCase();
  const activeRanges = Object.entries(filters.ranges).filter(
    ([, range]) => range && (range.min !== null || range.max !== null),
  ) as Array<[NumericFilterKey, NumericFilter]>;

  let excludedForMissingData = 0;

  const result = rows.filter((row) => {
    if (needle) {
      const ticker = row.symbol.toLowerCase();
      const name = (row.description || "").toLowerCase();
      if (!ticker.includes(needle) && !name.includes(needle)) return false;
    }

    if (filters.sector && row.sector !== filters.sector) return false;

    for (const [key, range] of activeRanges) {
      const value = row[key] as number | null;

      if (value === null || value === undefined || !Number.isFinite(value)) {
        if (filters.nullPolicy === "include") continue;
        excludedForMissingData += 1;
        return false;
      }
      const scale = NUMERIC_FILTERS[key].scale;
      if (range.min !== null && value < range.min * scale) return false;
      if (range.max !== null && value > range.max * scale) return false;
    }

    return true;
  });

  return { rows: result, excludedForMissingData };
}

export function activeFilterCount(filters: FilterState): number {
  let count = 0;
  if (filters.query.trim()) count += 1;
  if (filters.sector) count += 1;
  for (const range of Object.values(filters.ranges)) {
    if (range && (range.min !== null || range.max !== null)) count += 1;
  }
  return count;
}

/** Serialise filters into query params so a screen is shareable. */
export function toSearchParams(filters: FilterState, sort?: string): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.sector) params.set("sector", filters.sector);
  if (filters.nullPolicy === "include") params.set("nulls", "include");
  for (const [key, range] of Object.entries(filters.ranges)) {
    if (!range) continue;
    if (range.min !== null) params.set(`${key}_min`, String(range.min));
    if (range.max !== null) params.set(`${key}_max`, String(range.max));
  }
  if (sort) params.set("sort", sort);
  return params;
}

export function fromSearchParams(params: URLSearchParams): {
  filters: FilterState;
  sort: string | null;
} {
  const ranges: FilterState["ranges"] = {};
  for (const key of Object.keys(NUMERIC_FILTERS) as NumericFilterKey[]) {
    const min = params.get(`${key}_min`);
    const max = params.get(`${key}_max`);
    if (min !== null || max !== null) {
      ranges[key] = {
        min: min !== null && min !== "" ? Number(min) : null,
        max: max !== null && max !== "" ? Number(max) : null,
      };
    }
  }
  return {
    filters: {
      query: params.get("q") ?? "",
      sector: params.get("sector"),
      nullPolicy: params.get("nulls") === "include" ? "include" : "exclude",
      ranges,
    },
    sort: params.get("sort"),
  };
}

export function toCsv(rows: ScreenerRow[], fields: string[]): string {
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [fields.join(",")];
  for (const row of rows) {
    lines.push(fields.map((field) => escape(row[field as keyof ScreenerRow])).join(","));
  }
  return lines.join("\n");
}

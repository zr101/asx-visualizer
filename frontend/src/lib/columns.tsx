"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Stock, getRatingLabel } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Format large numbers with suffixes (K, M, B, T)
 */
function formatLargeNumber(value: number | null): string {
  if (value === null || value === undefined) return "-";

  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1_000_000_000_000) {
    return `${sign}$${(absValue / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (absValue >= 1_000_000_000) {
    return `${sign}$${(absValue / 1_000_000_000).toFixed(2)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}$${(absValue / 1_000_000).toFixed(2)}M`;
  }
  if (absValue >= 1_000) {
    return `${sign}$${(absValue / 1_000).toFixed(2)}K`;
  }
  return `${sign}$${absValue.toFixed(2)}`;
}

/**
 * Format volume with commas
 */
function formatVolume(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/**
 * Format price with 2 decimal places
 */
function formatPrice(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return `$${value.toFixed(2)}`;
}

/**
 * Format percentage with color
 */
function formatPercentage(value: number | null): string {
  if (value === null || value === undefined) return "-";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Cell component for percentage values with color coding
 */
function PercentageCell({ value }: { value: number | null }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <span
      className={cn(
        "font-medium",
        value > 0 && "text-positive",
        value < 0 && "text-negative",
        value === 0 && "text-muted-foreground"
      )}
    >
      {formatPercentage(value)}
    </span>
  );
}

/**
 * Cell component for technical ratings
 */
function RatingCell({ value }: { value: number | null }) {
  const label = getRatingLabel(value);
  if (!label) {
    return <span className="text-muted-foreground">-</span>;
  }

  const colorClass =
    label === "Strong Buy"
      ? "text-positive bg-positive/10"
      : label === "Buy"
        ? "text-positive/80 bg-positive/5"
        : label === "Neutral"
          ? "text-muted-foreground bg-muted"
          : label === "Sell"
            ? "text-negative/80 bg-negative/5"
            : "text-negative bg-negative/10";

  return (
    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", colorClass)}>
      {label}
    </span>
  );
}

/**
 * Extract ticker from symbol (e.g., "ASX:CBA" -> "CBA")
 */
function extractTicker(symbol: string): string {
  const parts = symbol.split(":");
  return parts.length > 1 ? parts[1] : symbol;
}

/**
 * Column definitions for the stock screener table
 * Organized by category as per SPEC.md Section 2
 * Note: All accessorKey values use underscores instead of dots
 */
export const columns: ColumnDef<Stock>[] = [
  // === BASIC INFO ===
  {
    id: "ticker",
    accessorFn: (row) => extractTicker(row.symbol),
    header: "Ticker",
    cell: ({ getValue }) => (
      <span className="font-mono font-semibold text-primary">
        {getValue() as string}
      </span>
    ),
    enableHiding: false, // Always visible
    size: 100,
    minSize: 100,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ getValue }) => (
      <span className="truncate max-w-[200px] block" title={getValue() as string}>
        {getValue() as string}
      </span>
    ),
    size: 200,
    minSize: 200,
  },
  {
    accessorKey: "description",
    header: "Company",
    cell: ({ getValue }) => (
      <span className="truncate max-w-[250px] block text-muted-foreground" title={getValue() as string}>
        {getValue() as string}
      </span>
    ),
  },

  // === PRICE DATA ===
  {
    accessorKey: "close",
    header: "Price",
    cell: ({ getValue }) => (
      <span className="font-mono">{formatPrice(getValue() as number | null)}</span>
    ),
  },
  {
    accessorKey: "open",
    header: "Open",
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground">
        {formatPrice(getValue() as number | null)}
      </span>
    ),
  },
  {
    accessorKey: "high",
    header: "High",
    cell: ({ getValue }) => (
      <span className="font-mono text-positive/80">
        {formatPrice(getValue() as number | null)}
      </span>
    ),
  },
  {
    accessorKey: "low",
    header: "Low",
    cell: ({ getValue }) => (
      <span className="font-mono text-negative/80">
        {formatPrice(getValue() as number | null)}
      </span>
    ),
  },
  {
    accessorKey: "change",
    header: "Change %",
    cell: ({ getValue }) => <PercentageCell value={getValue() as number | null} />,
  },
  {
    accessorKey: "change_abs",
    header: "Change",
    cell: ({ row }) => {
      const value = row.original.change_abs;
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }
      const sign = value >= 0 ? "+" : "";
      return (
        <span
          className={cn(
            "font-mono",
            value > 0 && "text-positive",
            value < 0 && "text-negative"
          )}
        >
          {sign}${value.toFixed(2)}
        </span>
      );
    },
  },

  // === VOLUME ===
  {
    accessorKey: "volume",
    header: "Volume",
    cell: ({ getValue }) => (
      <span className="font-mono">{formatVolume(getValue() as number | null)}</span>
    ),
  },
  {
    accessorKey: "average_volume_10d_calc",
    header: "Avg Vol (10D)",
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground">
        {formatVolume(getValue() as number | null)}
      </span>
    ),
  },
  {
    accessorKey: "average_volume_30d_calc",
    header: "Avg Vol (30D)",
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground">
        {formatVolume(getValue() as number | null)}
      </span>
    ),
  },
  {
    accessorKey: "relative_volume_10d_calc",
    header: "Rel Volume",
    cell: ({ getValue }) => {
      const value = getValue() as number | null;
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }
      return (
        <span
          className={cn("font-mono", value >= 2 && "text-primary font-semibold")}
        >
          {value.toFixed(2)}x
        </span>
      );
    },
  },
  {
    accessorKey: "VWAP",
    header: "VWAP",
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground">
        {formatPrice(getValue() as number | null)}
      </span>
    ),
  },

  // === FUNDAMENTALS - VALUATION ===
  {
    accessorKey: "market_cap_basic",
    header: "Market Cap",
    cell: ({ getValue }) => (
      <span className="font-mono font-medium">
        {formatLargeNumber(getValue() as number | null)}
      </span>
    ),
  },
  {
    accessorKey: "price_earnings_ttm",
    header: "P/E (TTM)",
    cell: ({ getValue }) => {
      const value = getValue() as number | null;
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }
      return <span className="font-mono">{value.toFixed(2)}</span>;
    },
  },
  {
    accessorKey: "price_sales_ratio",
    header: "P/S",
    cell: ({ getValue }) => {
      const value = getValue() as number | null;
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }
      return <span className="font-mono">{value.toFixed(2)}</span>;
    },
  },
  {
    accessorKey: "price_book_ratio",
    header: "P/B",
    cell: ({ getValue }) => {
      const value = getValue() as number | null;
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }
      return <span className="font-mono">{value.toFixed(2)}</span>;
    },
  },
  {
    accessorKey: "dividend_yield_recent",
    header: "Div Yield",
    cell: ({ getValue }) => {
      const value = getValue() as number | null;
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }
      return (
        <span className={cn("font-mono", value > 0 && "text-positive")}>
          {value.toFixed(2)}%
        </span>
      );
    },
  },
  {
    accessorKey: "earnings_per_share_basic_ttm",
    header: "EPS (TTM)",
    cell: ({ getValue }) => {
      const value = getValue() as number | null;
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }
      return (
        <span
          className={cn(
            "font-mono",
            value > 0 && "text-positive",
            value < 0 && "text-negative"
          )}
        >
          ${value.toFixed(2)}
        </span>
      );
    },
  },
  {
    accessorKey: "enterprise_value_fq",
    header: "EV",
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground">
        {formatLargeNumber(getValue() as number | null)}
      </span>
    ),
  },
  {
    accessorKey: "beta_1_year",
    header: "Beta (1Y)",
    cell: ({ getValue }) => {
      const value = getValue() as number | null;
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }
      return <span className="font-mono">{value.toFixed(2)}</span>;
    },
  },

  // === FUNDAMENTALS - FINANCIALS ===
  {
    accessorKey: "total_revenue_ttm",
    header: "Revenue (TTM)",
    cell: ({ getValue }) => (
      <span className="font-mono">{formatLargeNumber(getValue() as number | null)}</span>
    ),
  },
  {
    accessorKey: "gross_profit_fq",
    header: "Gross Profit",
    cell: ({ getValue }) => (
      <span className="font-mono">{formatLargeNumber(getValue() as number | null)}</span>
    ),
  },
  {
    accessorKey: "net_income_fq",
    header: "Net Income",
    cell: ({ getValue }) => {
      const value = getValue() as number | null;
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }
      return (
        <span
          className={cn(
            "font-mono",
            value > 0 && "text-positive",
            value < 0 && "text-negative"
          )}
        >
          {formatLargeNumber(value)}
        </span>
      );
    },
  },
  {
    accessorKey: "total_debt_fq",
    header: "Total Debt",
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground">
        {formatLargeNumber(getValue() as number | null)}
      </span>
    ),
  },

  // === PERFORMANCE ===
  {
    accessorKey: "Perf_W",
    header: "Perf (1W)",
    cell: ({ getValue }) => <PercentageCell value={getValue() as number | null} />,
  },
  {
    accessorKey: "Perf_1M",
    header: "Perf (1M)",
    cell: ({ getValue }) => <PercentageCell value={getValue() as number | null} />,
  },
  {
    accessorKey: "Perf_3M",
    header: "Perf (3M)",
    cell: ({ getValue }) => <PercentageCell value={getValue() as number | null} />,
  },
  {
    accessorKey: "Perf_6M",
    header: "Perf (6M)",
    cell: ({ getValue }) => <PercentageCell value={getValue() as number | null} />,
  },
  {
    accessorKey: "Perf_Y",
    header: "Perf (1Y)",
    cell: ({ getValue }) => <PercentageCell value={getValue() as number | null} />,
  },
  {
    accessorKey: "Perf_YTD",
    header: "Perf (YTD)",
    cell: ({ getValue }) => <PercentageCell value={getValue() as number | null} />,
  },
  {
    accessorKey: "Perf_5Y",
    header: "Perf (5Y)",
    cell: ({ getValue }) => <PercentageCell value={getValue() as number | null} />,
  },
  {
    accessorKey: "Perf_All",
    header: "Perf (All)",
    cell: ({ getValue }) => <PercentageCell value={getValue() as number | null} />,
  },

  // === PRICE EXTREMES ===
  {
    accessorKey: "price_52_week_high",
    header: "52W High",
    cell: ({ getValue }) => (
      <span className="font-mono text-positive/80">
        {formatPrice(getValue() as number | null)}
      </span>
    ),
  },
  {
    accessorKey: "price_52_week_low",
    header: "52W Low",
    cell: ({ getValue }) => (
      <span className="font-mono text-negative/80">
        {formatPrice(getValue() as number | null)}
      </span>
    ),
  },
  {
    accessorKey: "High_All",
    header: "ATH",
    cell: ({ getValue }) => (
      <span className="font-mono text-positive/80">
        {formatPrice(getValue() as number | null)}
      </span>
    ),
  },
  {
    accessorKey: "Low_All",
    header: "ATL",
    cell: ({ getValue }) => (
      <span className="font-mono text-negative/80">
        {formatPrice(getValue() as number | null)}
      </span>
    ),
  },

  // === TECHNICAL INDICATORS ===
  {
    accessorKey: "RSI",
    header: "RSI (14)",
    cell: ({ getValue }) => {
      const value = getValue() as number | null;
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }
      return (
        <span
          className={cn(
            "font-mono",
            value >= 70 && "text-negative font-semibold",
            value <= 30 && "text-positive font-semibold"
          )}
        >
          {value.toFixed(1)}
        </span>
      );
    },
  },
  {
    accessorKey: "RSI7",
    header: "RSI (7)",
    cell: ({ getValue }) => {
      const value = getValue() as number | null;
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }
      return <span className="font-mono">{value.toFixed(1)}</span>;
    },
  },
  {
    accessorKey: "Stoch_K",
    header: "Stoch %K",
    cell: ({ getValue }) => {
      const value = getValue() as number | null;
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }
      return <span className="font-mono">{value.toFixed(1)}</span>;
    },
  },
  {
    accessorKey: "Stoch_D",
    header: "Stoch %D",
    cell: ({ getValue }) => {
      const value = getValue() as number | null;
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }
      return <span className="font-mono">{value.toFixed(1)}</span>;
    },
  },
  {
    accessorKey: "CCI20",
    header: "CCI (20)",
    cell: ({ getValue }) => {
      const value = getValue() as number | null;
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }
      return <span className="font-mono">{value.toFixed(1)}</span>;
    },
  },
  {
    accessorKey: "MACD_macd",
    header: "MACD",
    cell: ({ getValue }) => {
      const value = getValue() as number | null;
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }
      return (
        <span
          className={cn(
            "font-mono",
            value > 0 && "text-positive",
            value < 0 && "text-negative"
          )}
        >
          {value.toFixed(3)}
        </span>
      );
    },
  },
  {
    accessorKey: "ADX",
    header: "ADX (14)",
    cell: ({ getValue }) => {
      const value = getValue() as number | null;
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }
      return (
        <span className={cn("font-mono", value >= 25 && "font-semibold text-primary")}>
          {value.toFixed(1)}
        </span>
      );
    },
  },
  {
    accessorKey: "ATR",
    header: "ATR (14)",
    cell: ({ getValue }) => {
      const value = getValue() as number | null;
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }
      return <span className="font-mono">{value.toFixed(2)}</span>;
    },
  },
  {
    accessorKey: "Volatility_D",
    header: "Volatility",
    cell: ({ getValue }) => {
      const value = getValue() as number | null;
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }
      return <span className="font-mono">{value.toFixed(2)}%</span>;
    },
  },

  // === MOVING AVERAGES ===
  {
    accessorKey: "SMA20",
    header: "SMA (20)",
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground">
        {formatPrice(getValue() as number | null)}
      </span>
    ),
  },
  {
    accessorKey: "SMA50",
    header: "SMA (50)",
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground">
        {formatPrice(getValue() as number | null)}
      </span>
    ),
  },
  {
    accessorKey: "SMA200",
    header: "SMA (200)",
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground">
        {formatPrice(getValue() as number | null)}
      </span>
    ),
  },
  {
    accessorKey: "EMA20",
    header: "EMA (20)",
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground">
        {formatPrice(getValue() as number | null)}
      </span>
    ),
  },
  {
    accessorKey: "EMA50",
    header: "EMA (50)",
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground">
        {formatPrice(getValue() as number | null)}
      </span>
    ),
  },
  {
    accessorKey: "EMA200",
    header: "EMA (200)",
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground">
        {formatPrice(getValue() as number | null)}
      </span>
    ),
  },
  {
    accessorKey: "BB_upper",
    header: "BB Upper",
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground">
        {formatPrice(getValue() as number | null)}
      </span>
    ),
  },
  {
    accessorKey: "BB_lower",
    header: "BB Lower",
    cell: ({ getValue }) => (
      <span className="font-mono text-muted-foreground">
        {formatPrice(getValue() as number | null)}
      </span>
    ),
  },

  // === TECHNICAL RATINGS ===
  {
    accessorKey: "Recommend_All",
    header: "Rating",
    cell: ({ getValue }) => <RatingCell value={getValue() as number | null} />,
  },
  {
    accessorKey: "Recommend_MA",
    header: "MA Rating",
    cell: ({ getValue }) => <RatingCell value={getValue() as number | null} />,
  },
  {
    accessorKey: "Recommend_Other",
    header: "Osc Rating",
    cell: ({ getValue }) => <RatingCell value={getValue() as number | null} />,
  },

  // === COMPANY INFO ===
  {
    accessorKey: "sector",
    header: "Sector",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{(getValue() as string) || "-"}</span>
    ),
  },
  {
    accessorKey: "industry",
    header: "Industry",
    cell: ({ getValue }) => (
      <span className="truncate max-w-[150px] block text-muted-foreground" title={getValue() as string}>
        {(getValue() as string) || "-"}
      </span>
    ),
  },
  {
    accessorKey: "exchange",
    header: "Exchange",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{(getValue() as string) || "-"}</span>
    ),
  },
];

/**
 * Default visible columns for initial table render
 */
export const defaultVisibleColumns: string[] = [
  "ticker",
  "name",
  "close",
  "change",
  "volume",
  "market_cap_basic",
  "price_earnings_ttm",
  "dividend_yield_recent",
  "RSI",
  "Recommend_All",
  "sector",
];

/**
 * Column groups for the column visibility toggle panel
 * Note: All column IDs use underscores instead of dots
 */
export const columnGroups = {
  basic: {
    label: "Basic Info",
    columns: ["ticker", "name", "description", "exchange"],
  },
  price: {
    label: "Price",
    columns: ["close", "open", "high", "low", "change", "change_abs"],
  },
  volume: {
    label: "Volume",
    columns: [
      "volume",
      "average_volume_10d_calc",
      "average_volume_30d_calc",
      "relative_volume_10d_calc",
      "VWAP",
    ],
  },
  fundamentals: {
    label: "Fundamentals",
    columns: [
      "market_cap_basic",
      "price_earnings_ttm",
      "price_sales_ratio",
      "price_book_ratio",
      "dividend_yield_recent",
      "earnings_per_share_basic_ttm",
      "enterprise_value_fq",
      "beta_1_year",
      "total_revenue_ttm",
      "gross_profit_fq",
      "net_income_fq",
      "total_debt_fq",
    ],
  },
  performance: {
    label: "Performance",
    columns: [
      "Perf_W",
      "Perf_1M",
      "Perf_3M",
      "Perf_6M",
      "Perf_Y",
      "Perf_YTD",
      "Perf_5Y",
      "Perf_All",
    ],
  },
  priceExtremes: {
    label: "Price Extremes",
    columns: ["price_52_week_high", "price_52_week_low", "High_All", "Low_All"],
  },
  technicals: {
    label: "Technical Indicators",
    columns: [
      "RSI",
      "RSI7",
      "Stoch_K",
      "Stoch_D",
      "CCI20",
      "MACD_macd",
      "ADX",
      "ATR",
      "Volatility_D",
    ],
  },
  movingAverages: {
    label: "Moving Averages",
    columns: [
      "SMA20",
      "SMA50",
      "SMA200",
      "EMA20",
      "EMA50",
      "EMA200",
      "BB_upper",
      "BB_lower",
    ],
  },
  ratings: {
    label: "Ratings",
    columns: ["Recommend_All", "Recommend_MA", "Recommend_Other"],
  },
  info: {
    label: "Company Info",
    columns: ["sector", "industry"],
  },
};

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import {
  changeTone,
  formatCompact,
  formatLargeNumber,
  formatPercentage,
  formatPrice,
  formatRatio,
  formatScore,
  formatShare,
  tickerOf,
} from "@/lib/format";
import type { ScreenerRow } from "@/types/data";

type Column = ColumnDef<ScreenerRow>;

const numeric = (
  key: keyof ScreenerRow,
  header: string,
  render: (value: number | null) => string,
  options: { tone?: boolean; group: string } = { group: "Other" },
): Column => ({
  accessorKey: key,
  header,
  meta: { group: options.group, align: "right" },
  cell: ({ getValue }) => {
    const value = getValue<number | null>();
    return (
      <span
        className={`font-mono tabular-nums ${options.tone ? changeTone(value) : ""}`}
      >
        {render(value)}
      </span>
    );
  },
});

/** Colour a 0-100 percentile score so a row can be scanned without reading digits. */
function ScoreCell({ value }: { value: number | null }) {
  if (value === null || !Number.isFinite(value)) {
    return <span className="text-muted-foreground">–</span>;
  }
  const tone =
    value >= 80 ? "var(--positive)" : value <= 20 ? "var(--negative)" : "var(--chart-axis)";
  return (
    <span className="inline-flex items-center justify-end gap-1.5 font-mono tabular-nums">
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: tone }}
      />
      {formatScore(value)}
    </span>
  );
}

export const screenerColumns: Column[] = [
  {
    accessorKey: "symbol",
    header: "Ticker",
    enableHiding: false,
    meta: { group: "Identity", align: "left" },
    cell: ({ row }) => (
      <Link
        href={`/stock/${tickerOf(row.original.symbol)}`}
        className="font-mono font-medium hover:underline"
      >
        {tickerOf(row.original.symbol)}
      </Link>
    ),
  },
  {
    accessorKey: "description",
    header: "Company",
    meta: { group: "Identity", align: "left" },
    cell: ({ getValue }) => (
      <span className="block max-w-[16rem] truncate text-muted-foreground">
        {getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: "sector",
    header: "Sector",
    meta: { group: "Identity", align: "left" },
    cell: ({ getValue }) => (
      <span className="block max-w-[11rem] truncate text-muted-foreground">
        {getValue<string>() ?? "–"}
      </span>
    ),
  },
  numeric("close", "Price", formatPrice, { group: "Price" }),
  numeric("change", "Change", formatPercentage, { tone: true, group: "Price" }),
  numeric("volume", "Volume", formatCompact, { group: "Volume" }),
  numeric("turnover", "Turnover", formatLargeNumber, { group: "Volume" }),
  numeric("market_cap_basic", "Market cap", formatLargeNumber, { group: "Size" }),

  numeric("Perf_W", "1W", formatPercentage, { tone: true, group: "Performance" }),
  numeric("Perf_1M", "1M", formatPercentage, { tone: true, group: "Performance" }),
  numeric("Perf_3M", "3M", formatPercentage, { tone: true, group: "Performance" }),
  numeric("Perf_6M", "6M", formatPercentage, { tone: true, group: "Performance" }),
  numeric("Perf_YTD", "YTD", formatPercentage, { tone: true, group: "Performance" }),
  numeric("Perf_Y", "1Y", formatPercentage, { tone: true, group: "Performance" }),

  {
    accessorKey: "RSI",
    header: "RSI",
    meta: { group: "Technicals", align: "right" },
    cell: ({ getValue }) => {
      const value = getValue<number | null>();
      if (value === null) return <span className="text-muted-foreground">–</span>;
      const tone = value >= 70 ? "text-negative" : value <= 30 ? "text-positive" : "";
      return <span className={`font-mono tabular-nums ${tone}`}>{value.toFixed(1)}</span>;
    },
  },
  numeric("ADX", "ADX", (v) => formatRatio(v, 1), { group: "Technicals" }),
  numeric("atr_pct", "ATR %", (v) => formatShare(v, 2), { group: "Technicals" }),
  numeric("Volatility_D", "Volatility", (v) => formatShare(v, 2), { group: "Technicals" }),
  numeric("pct_vs_sma50", "vs 50DMA", formatPercentage, { tone: true, group: "Trend" }),
  numeric("pct_vs_sma200", "vs 200DMA", formatPercentage, { tone: true, group: "Trend" }),
  numeric("pct_from_52w_high", "From high", formatPercentage, { tone: true, group: "Trend" }),
  numeric("range_position_52w", "52w range", (v) => formatShare(v, 0), { group: "Trend" }),

  numeric("price_earnings_ttm", "P/E", (v) => formatRatio(v, 1), { group: "Valuation" }),
  numeric("earnings_yield", "Earnings yield", (v) => formatShare(v, 2), { group: "Valuation" }),
  numeric("book_yield", "Book yield", (v) => formatShare(v, 1), { group: "Valuation" }),
  numeric("price_book_ratio", "P/B", (v) => formatRatio(v, 2), { group: "Valuation" }),
  numeric("dividend_yield_recent", "Dividend yield", (v) => formatShare(v, 2), {
    group: "Valuation",
  }),
  numeric("beta_1_year", "Beta", (v) => formatRatio(v, 2), { group: "Valuation" }),

  {
    accessorKey: "rs_rating",
    header: "RS rating",
    meta: { group: "Scores", align: "right" },
    cell: ({ getValue }) => <ScoreCell value={getValue<number | null>()} />,
  },
  {
    accessorKey: "momentum_score",
    header: "Momentum",
    meta: { group: "Scores", align: "right" },
    cell: ({ getValue }) => <ScoreCell value={getValue<number | null>()} />,
  },
  {
    accessorKey: "value_score",
    header: "Value",
    meta: { group: "Scores", align: "right" },
    cell: ({ getValue }) => <ScoreCell value={getValue<number | null>()} />,
  },
  {
    accessorKey: "trend_score",
    header: "Trend",
    meta: { group: "Scores", align: "right" },
    cell: ({ getValue }) => <ScoreCell value={getValue<number | null>()} />,
  },
  {
    accessorKey: "income_score",
    header: "Income",
    meta: { group: "Scores", align: "right" },
    cell: ({ getValue }) => <ScoreCell value={getValue<number | null>()} />,
  },
  numeric("relative_volume_10d_calc", "Rel volume", (v) => `${formatRatio(v, 1)}×`, {
    group: "Volume",
  }),
];

/** Shown by default. The rest are available from the column picker. */
export const DEFAULT_COLUMNS = [
  "symbol",
  "description",
  "sector",
  "close",
  "change",
  "market_cap_basic",
  "Perf_1M",
  "Perf_3M",
  "RSI",
  "pct_vs_sma200",
  "dividend_yield_recent",
  "rs_rating",
];

/**
 * Display formatters.
 *
 * Extracted from columns.tsx, which is a client component - meaning these could
 * not previously be used from a server component, and every new page needed its
 * own copy. Pure functions, no React, safe to import anywhere.
 */

const DASH = "–";

export function formatLargeNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(2)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
}

/** ASX prices span $0.001 explorers to $150 banks, so precision scales. */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  const abs = Math.abs(value);
  if (abs > 0 && abs < 0.01) return `$${value.toFixed(4)}`;
  if (abs < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}

export function formatPercentage(
  value: number | null | undefined,
  digits = 2,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

/** Percentage with no forced sign - for shares of a whole, not changes. */
export function formatShare(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  return `${value.toFixed(digits)}%`;
}

export function formatRatio(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  return value.toFixed(digits);
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  return value.toFixed(0);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return DASH;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function tickerOf(symbol: string): string {
  return symbol.includes(":") ? symbol.split(":")[1] : symbol;
}

export function changeTone(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0) {
    return "text-muted-foreground";
  }
  return value > 0 ? "text-positive" : "text-negative";
}

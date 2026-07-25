"use client";

import Link from "next/link";
import { useMemo } from "react";

import { WatchlistButton } from "@/components/watchlist/WatchlistButton";
import { useWatchlist } from "@/hooks/useWatchlist";
import {
  changeTone,
  formatLargeNumber,
  formatPercentage,
  formatPrice,
  formatShare,
  tickerOf,
} from "@/lib/format";
import type { ScreenerRow } from "@/types/data";

export function WatchlistView({ rows }: { rows: ScreenerRow[] }) {
  const { symbols } = useWatchlist();

  const watched = useMemo(() => {
    const wanted = new Set(symbols);
    return rows.filter((row) => wanted.has(row.symbol));
  }, [rows, symbols]);

  const summary = useMemo(() => {
    const withChange = watched.filter((row) => row.change !== null);
    if (!withChange.length) return null;
    const mean =
      withChange.reduce((total, row) => total + (row.change ?? 0), 0) / withChange.length;
    return {
      mean,
      advancing: withChange.filter((row) => (row.change ?? 0) > 0).length,
      total: withChange.length,
    };
  }, [watched]);

  if (!symbols.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Your watchlist is empty. Star a stock from its page or the screener to track it
          here.
        </p>
        <Link
          href="/screener"
          className="mt-3 inline-block text-sm text-chart-accent hover:underline"
        >
          Browse the screener →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Average change
            </p>
            <p
              className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${changeTone(summary.mean)}`}
            >
              {formatPercentage(summary.mean)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Advancing
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
              {summary.advancing}/{summary.total}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Tracked
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
              {symbols.length}
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card">
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th scope="col" className="px-3 py-2 text-left font-medium">Ticker</th>
              <th scope="col" className="px-3 py-2 text-left font-medium">Company</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Price</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Change</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">3M</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">RSI</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Yield</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Market cap</th>
              <th scope="col" className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {watched.map((row) => (
              <tr key={row.symbol} className="border-b border-border last:border-0">
                <td className="px-3 py-1.5">
                  <Link
                    href={`/stock/${tickerOf(row.symbol)}`}
                    className="font-mono font-medium hover:underline"
                  >
                    {tickerOf(row.symbol)}
                  </Link>
                </td>
                <td className="max-w-[16rem] truncate px-3 py-1.5 text-muted-foreground">
                  {row.description}
                </td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                  {formatPrice(row.close)}
                </td>
                <td className={`px-3 py-1.5 text-right font-mono tabular-nums ${changeTone(row.change)}`}>
                  {formatPercentage(row.change)}
                </td>
                <td className={`px-3 py-1.5 text-right font-mono tabular-nums ${changeTone(row.Perf_3M)}`}>
                  {formatPercentage(row.Perf_3M)}
                </td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                  {row.RSI === null ? "–" : row.RSI.toFixed(1)}
                </td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                  {formatShare(row.dividend_yield_recent, 2)}
                </td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                  {formatLargeNumber(row.market_cap_basic)}
                </td>
                <td className="px-1 py-1.5 text-right">
                  <WatchlistButton symbol={row.symbol} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {watched.length < symbols.length && (
        <p className="text-xs text-muted-foreground">
          {symbols.length - watched.length} watched{" "}
          {symbols.length - watched.length === 1 ? "ticker is" : "tickers are"} not in the
          latest session — they may have been delisted or suspended.
        </p>
      )}
    </div>
  );
}

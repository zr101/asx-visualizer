import { notFound } from "next/navigation";
import Link from "next/link";

import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { WatchlistButton } from "@/components/watchlist/WatchlistButton";
import { Stat } from "@/components/ui/stat";
import { getScreener, getSeries, getStockSeries } from "@/lib/data";
import {
  changeTone,
  formatCompact,
  formatDate,
  formatLargeNumber,
  formatPercentage,
  formatPrice,
  formatRatio,
  formatScore,
  formatShare,
  tickerOf,
} from "@/lib/format";
import { unpackColumnar } from "@/lib/columnar";
import type { ScreenerRow } from "@/types/data";

/**
 * Statically render every ticker in the archive.
 *
 * The price series is read through a module-scope memo in lib/data.ts, so the
 * 4.6 MB file is parsed once for the whole build rather than once per page -
 * the difference between a few seconds and a few thousand.
 */
export async function generateStaticParams() {
  const { series } = await getSeries();
  return Object.keys(series).map((symbol) => ({ ticker: tickerOf(symbol) }));
}

export const dynamicParams = false;

async function findRow(ticker: string): Promise<ScreenerRow | undefined> {
  const rows = unpackColumnar<ScreenerRow>(await getScreener());
  return rows.find((row) => tickerOf(row.symbol) === ticker.toUpperCase());
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const row = await findRow(ticker);
  if (!row) return { title: ticker.toUpperCase() };
  return {
    title: `${tickerOf(row.symbol)} · ${row.description}`,
    description: `${row.description} (${tickerOf(row.symbol)}) — price, technical position, factor percentiles and sector context on the ASX.`,
  };
}

export default async function StockPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const upper = ticker.toUpperCase();
  const [row, series] = await Promise.all([
    findRow(upper),
    getStockSeries(`ASX:${upper}`),
  ]);

  if (!series.length) notFound();

  const priceData = series.map((point) => ({ date: point.date, close: point.close }));
  const last = priceData.at(-1);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{upper}</h1>
            <WatchlistButton symbol={`ASX:${upper}`} />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {row?.description ?? "Not in the latest session"}
            {row?.sector && ` · ${row.sector}`}
            {row?.industry && ` · ${row.industry}`}
          </p>
        </div>
        {row && (
          <div className="text-right">
            <p className="font-mono text-2xl font-semibold tabular-nums">
              {formatPrice(row.close)}
            </p>
            <p className={`font-mono text-sm tabular-nums ${changeTone(row.change)}`}>
              {formatPercentage(row.change)}
            </p>
          </div>
        )}
      </header>

      {!row && (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          This ticker appears in the historical archive but not in the most recent
          session — it may have been delisted or suspended. The price history below is
          what was captured while it was listed.
        </p>
      )}

      <section aria-labelledby="price" className="space-y-2">
        <h2 id="price" className="text-lg font-semibold">
          Price history
        </h2>
        <div className="rounded-lg border border-border bg-card p-4">
          <TimeSeriesChart
            series={[
              {
                label: `${upper} close`,
                data: priceData.map((p) => ({ date: p.date, value: p.close })),
                colorVar: "--chart-accent",
                type: "area",
                precision: (last?.close ?? 1) < 1 ? 3 : 2,
              },
            ]}
            height={280}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {series.length} sessions from {formatDate(series[0]?.date)}. Closes are
            unadjusted, so a share consolidation or a large dividend appears as a step in
            this line rather than a smooth transition.
          </p>
        </div>
      </section>

      {row && (
        <>
          <section aria-labelledby="position" className="space-y-3">
            <h2 id="position" className="text-lg font-semibold">
              Where it stands
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="From 52-week high"
                value={formatPercentage(row.pct_from_52w_high)}
                hint={`High ${formatPrice(row.price_52_week_high)}`}
                tone={(row.pct_from_52w_high ?? 0) > -10 ? "positive" : "negative"}
              />
              <Stat
                label="52-week range position"
                value={formatShare(row.range_position_52w, 0)}
                hint={`Low ${formatPrice(row.price_52_week_low)}`}
              />
              <Stat
                label="vs 200-day average"
                value={formatPercentage(row.pct_vs_sma200)}
                hint={formatPrice(row.SMA200)}
                tone={(row.pct_vs_sma200 ?? 0) >= 0 ? "positive" : "negative"}
              />
              <Stat
                label="RSI"
                value={formatRatio(row.RSI, 1)}
                hint={
                  row.RSI === null
                    ? undefined
                    : row.RSI >= 70
                      ? "Overbought"
                      : row.RSI <= 30
                        ? "Oversold"
                        : "Neutral"
                }
              />
            </div>
          </section>

          <section aria-labelledby="factors" className="space-y-3">
            <h2 id="factors" className="text-lg font-semibold">
              Factor percentiles
            </h2>
            <p className="text-sm text-muted-foreground">
              Ranked 0–100 against the liquid ASX universe on the same day. A blank score
              means the inputs weren&apos;t reported for this company.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(
                [
                  ["RS rating", row.rs_rating],
                  ["Momentum", row.momentum_score],
                  ["Value", row.value_score],
                  ["Trend", row.trend_score],
                  ["Income", row.income_score],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
                    {formatScore(value)}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, value ?? 0))}%`,
                        backgroundColor:
                          (value ?? 0) >= 80
                            ? "var(--positive)"
                            : (value ?? 0) <= 20
                              ? "var(--negative)"
                              : "var(--chart-accent)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="fundamentals" className="space-y-3">
            <h2 id="fundamentals" className="text-lg font-semibold">
              Key figures
            </h2>
            <dl className="grid gap-x-6 gap-y-2 rounded-lg border border-border bg-card p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["Market cap", formatLargeNumber(row.market_cap_basic)],
                  ["Turnover today", formatLargeNumber(row.turnover)],
                  ["Volume", formatCompact(row.volume)],
                  [
                    "P/E",
                    row.price_earnings_ttm === null
                      ? row.is_profitable === false
                        ? "n/a — loss-making"
                        : "–"
                      : formatRatio(row.price_earnings_ttm, 1),
                  ],
                  ["Earnings yield", formatShare(row.earnings_yield, 2)],
                  ["Price / book", formatRatio(row.price_book_ratio, 2)],
                  ["Dividend yield", formatShare(row.dividend_yield_recent, 2)],
                  ["Beta (1y)", formatRatio(row.beta_1_year, 2)],
                  ["Revenue (ttm)", formatLargeNumber(row.total_revenue_ttm)],
                  ["ATR %", formatShare(row.atr_pct, 2)],
                  ["Relative volume", `${formatRatio(row.relative_volume_10d_calc, 1)}×`],
                  ["ADX", formatRatio(row.ADX, 1)],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-border/50 py-1 last:border-0">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-mono tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            {row.is_profitable === false && (
              <p className="text-xs text-muted-foreground">
                This company reported negative earnings, so it has no meaningful P/E.
                Earnings yield is shown instead — it stays defined through the sign change,
                which is why it is what the value factor ranks on.
              </p>
            )}
          </section>
        </>
      )}

      <Link href="/screener" className="inline-block text-sm text-muted-foreground hover:text-foreground">
        ← Back to screener
      </Link>
    </div>
  );
}

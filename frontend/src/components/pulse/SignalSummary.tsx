import Link from "next/link";

import { changeTone, formatPercentage, formatPrice, tickerOf } from "@/lib/format";
import { SIGNAL_TONE, type SignalGroup } from "@/types/data";

// Ordered by how much a reader should care, so a "top signals" view is
// meaningful without further sorting. Crossovers of the long-term trend rank
// above single-day noise like gaps.
const FEATURED = [
  "golden_cross",
  "death_cross",
  "new_52w_high",
  "new_52w_low",
  "crossed_above_sma200",
  "crossed_below_sma200",
  "rsi_oversold",
  "rsi_overbought",
];

export function SignalSummary({
  counts,
  signals,
}: {
  counts: Record<string, number>;
  signals: Record<string, SignalGroup>;
}) {
  const present = Object.keys(counts).filter((key) => counts[key] > 0);
  if (!present.length) {
    return (
      <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        No signals fired today. This needs two consecutive sessions to compute.
      </p>
    );
  }

  const featured = FEATURED.filter((key) => counts[key] > 0);
  const rest = present.filter((key) => !FEATURED.includes(key));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {present.map((key) => {
          const tone = SIGNAL_TONE[key] ?? "neutral";
          return (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs"
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor:
                    tone === "positive"
                      ? "var(--positive)"
                      : tone === "negative"
                        ? "var(--negative)"
                        : "var(--chart-axis)",
                }}
              />
              <span className="text-muted-foreground">
                {signals[key]?.label ?? key.replace(/_/g, " ")}
              </span>
              <span className="font-mono font-medium tabular-nums">{counts[key]}</span>
            </span>
          );
        })}
      </div>

      {featured.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {featured.slice(0, 4).map((key) => {
            const group = signals[key];
            if (!group?.rows.length) return null;
            return (
              <div key={key} className="rounded-lg border border-border bg-card">
                <h3 className="flex items-baseline justify-between border-b border-border px-4 py-2.5 text-sm font-medium">
                  <span>{group.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {group.total}
                  </span>
                </h3>
                <ul className="divide-y divide-border">
                  {group.rows.slice(0, 6).map((row) => (
                    <li key={row.symbol}>
                      <Link
                        href={`/stock/${tickerOf(row.symbol)}`}
                        className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent/40"
                      >
                        <span className="w-12 shrink-0 font-mono font-medium">
                          {tickerOf(row.symbol)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-muted-foreground">
                          {row.description}
                        </span>
                        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                          {formatPrice(row.close)}
                        </span>
                        <span
                          className={`w-16 shrink-0 text-right font-mono text-xs tabular-nums ${changeTone(row.change)}`}
                        >
                          {formatPercentage(row.change)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {rest.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Signals are computed against the previous session over the liquid universe, and
          only for securities that actually traded — a crossover on a carried-forward row
          is an artefact of the feed, not an event.
        </p>
      )}
    </div>
  );
}

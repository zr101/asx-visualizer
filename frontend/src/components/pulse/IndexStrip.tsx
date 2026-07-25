import { changeTone, formatPercentage, formatRatio } from "@/lib/format";
import type { IndexQuote } from "@/types/data";

// The benchmarks worth surfacing first, in reading order. The size family
// (20 / 50 / MidCap / Small Ords) is what makes a large-vs-small divergence
// visible at a glance, which a single index level cannot show.
const HEADLINE = ["ASX:XJO", "ASX:XAO", "ASX:XTL", "ASX:XFL", "ASX:XMD", "ASX:XSO", "ASX:XVI"];

const SHORT_NAMES: Record<string, string> = {
  "ASX:XJO": "ASX 200",
  "ASX:XAO": "All Ordinaries",
  "ASX:XTL": "ASX 20",
  "ASX:XFL": "ASX 50",
  "ASX:XMD": "MidCap 50",
  "ASX:XSO": "Small Ordinaries",
  "ASX:XVI": "ASX 200 VIX",
};

export function IndexStrip({ indices }: { indices: IndexQuote[] }) {
  if (!indices.length) return null;

  const bySymbol = new Map(indices.map((index) => [index.symbol, index]));
  const rows = HEADLINE.map((symbol) => bySymbol.get(symbol)).filter(
    (index): index is IndexQuote => Boolean(index),
  );

  return (
    <section aria-label="Index levels">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {rows.map((index) => (
          <div key={index.symbol} className="rounded-lg border border-border bg-card p-3">
            <p className="truncate text-xs text-muted-foreground" title={index.description ?? undefined}>
              {SHORT_NAMES[index.symbol] ?? index.description ?? index.symbol}
            </p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
              {formatRatio(index.close, index.symbol === "ASX:XVI" ? 2 : 1)}
            </p>
            <p className={`font-mono text-xs tabular-nums ${changeTone(index.change)}`}>
              {formatPercentage(index.change)}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Size indices side by side show whether a move is broad. A large-cap index holding
        up while Small Ordinaries falls is a narrowing market, not a healthy one.
      </p>
    </section>
  );
}

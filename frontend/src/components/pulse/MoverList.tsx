import Link from "next/link";

import {
  changeTone,
  formatCompact,
  formatLargeNumber,
  formatPercentage,
  formatPrice,
  formatRatio,
  tickerOf,
} from "@/lib/format";
import type { Mover } from "@/types/data";

interface Props {
  title: string;
  rows: Mover[];
  metric: "change" | "turnover" | "relative_volume_10d_calc";
}

function metricValue(row: Mover, metric: Props["metric"]): string {
  if (metric === "turnover") return formatLargeNumber(row.turnover);
  if (metric === "relative_volume_10d_calc") {
    return `${formatRatio(row.relative_volume_10d_calc, 1)}×`;
  }
  return formatPercentage(row.change);
}

export function MoverList({ title, rows, metric }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <h3 className="border-b border-border px-4 py-2.5 text-sm font-medium">{title}</h3>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">Nothing to show today.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.slice(0, 10).map((row) => (
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
                  className={`w-20 shrink-0 text-right font-mono tabular-nums ${
                    metric === "change" ? changeTone(row.change) : ""
                  }`}
                >
                  {metricValue(row, metric)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {rows.length > 0 && (
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          {metric === "turnover"
            ? "Ranked by dollar value traded, not share count."
            : metric === "relative_volume_10d_calc"
              ? "Turnover against each stock's own 10-day average."
              : `Leader traded ${formatCompact(rows[0]?.volume)} shares.`}
        </p>
      )}
    </div>
  );
}

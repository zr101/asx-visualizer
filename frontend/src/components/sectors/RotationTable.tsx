import { formatPercentage } from "@/lib/format";
import type { RotationRow } from "@/types/data";

// Keys are typed against the generated RotationRow rather than `string`, so a
// window that does not exist in the payload no longer compiles.
type WindowKey = "1d" | "1w" | "1m" | "3m" | "6m" | "ytd" | "1y";
type RankKey = `${WindowKey}_rank`;

const WINDOWS: Array<{ key: WindowKey; label: string }> = [
  { key: "1d", label: "1D" },
  { key: "1w", label: "1W" },
  { key: "1m", label: "1M" },
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "ytd", label: "YTD" },
  { key: "1y", label: "1Y" },
];

/** Shade by rank rather than magnitude, so one extreme sector can't wash out the rest. */
function rankShade(rank: number | null, total: number): string {
  if (!rank || !total) return "transparent";
  const position = 1 - (rank - 1) / Math.max(total - 1, 1);
  // Diverging: leaders green, laggards red, neutral in the middle.
  const strength = Math.abs(position - 0.5) * 2;
  const color = position >= 0.5 ? "var(--positive)" : "var(--negative)";
  return `color-mix(in oklab, ${color} ${(strength * 55).toFixed(0)}%, transparent)`;
}

export function RotationTable({ rows }: { rows: RotationRow[] }) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No rotation data available.</p>;
  }

  const ordered = [...rows].sort(
    (a, b) => (b["3m"] ?? -Infinity) - (a["3m"] ?? -Infinity),
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[42rem] text-sm">
        <caption className="sr-only">
          Sector returns by time window, shaded by rank within each window
        </caption>
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th scope="col" className="px-4 py-2 text-left font-medium">
              Sector
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              n
            </th>
            {WINDOWS.map((window) => (
              <th key={window.key} scope="col" className="px-3 py-2 text-right font-medium">
                {window.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordered.map((row) => (
            <tr key={row.sector} className="border-b border-border last:border-0">
              <th scope="row" className="max-w-[12rem] truncate px-4 py-2 text-left font-normal">
                {row.sector}
              </th>
              <td className="px-2 py-2 text-right font-mono text-xs text-muted-foreground">
                {row.count}
              </td>
              {WINDOWS.map((window) => {
                const value = row[window.key] ?? null;
                const rank = row[`${window.key}_rank` as RankKey] ?? null;
                return (
                  <td
                    key={window.key}
                    className="px-3 py-2 text-right font-mono tabular-nums"
                    style={{ backgroundColor: rankShade(rank, rows.length) }}
                    title={rank ? `Rank ${rank} of ${rows.length}` : undefined}
                  >
                    {formatPercentage(value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

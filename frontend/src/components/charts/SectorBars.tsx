"use client";

import { useState } from "react";

import { formatLargeNumber, formatPercentage, formatShare } from "@/lib/format";
import type { SectorRow } from "@/types/data";

interface Props {
  sectors: SectorRow[];
  /** Which return to plot. Cap-weighted answers "as an investment"; equal-weighted "the typical company". */
  metric?: "cap_weighted_1d" | "equal_weighted_1d";
}

/**
 * Sector returns as a sorted diverging bar chart.
 *
 * A treemap is the conventional "market map", but with 20 ASX sectors where
 * Finance is 35% of capitalisation and several sectors are under 1%, the small
 * cells end up too small to label. Sorted bars keep every sector legible and
 * make the ranking - the actual question - readable at a glance.
 */
export function SectorBars({ sectors, metric = "cap_weighted_1d" }: Props) {
  const [active, setActive] = useState<string | null>(null);

  const rows = [...sectors]
    .filter((s) => s[metric] !== null && s[metric] !== undefined)
    .sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0));

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No sector data available.</p>;
  }

  const extent = Math.max(...rows.map((s) => Math.abs(s[metric] ?? 0)), 0.5);

  return (
    <div className="space-y-px">
      {rows.map((sector) => {
        const value = sector[metric] ?? 0;
        const width = (Math.abs(value) / extent) * 50;
        const positive = value >= 0;
        const isActive = active === sector.sector;

        return (
          <div
            key={sector.sector}
            className="group relative grid grid-cols-[minmax(0,9rem)_1fr_4.5rem] items-center gap-2 rounded px-1 py-1 text-xs hover:bg-accent/40"
            onMouseEnter={() => setActive(sector.sector)}
            onMouseLeave={() => setActive(null)}
          >
            <span className="truncate text-muted-foreground" title={sector.sector}>
              {sector.sector}
            </span>

            <div className="relative h-4">
              {/* Zero line - the reference the bars diverge from. */}
              <div className="absolute inset-y-0 left-1/2 w-px bg-border" aria-hidden />
              <div
                className="absolute inset-y-[3px] rounded-[3px]"
                style={{
                  width: `${width}%`,
                  left: positive ? "50%" : `${50 - width}%`,
                  backgroundColor: positive ? "var(--positive)" : "var(--negative)",
                }}
              />
            </div>

            <span
              className="text-right font-mono tabular-nums"
              style={{ color: positive ? "var(--positive)" : "var(--negative)" }}
            >
              {formatPercentage(value)}
            </span>

            {isActive && (
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lg">
                <p className="font-medium text-popover-foreground">{sector.sector}</p>
                <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-muted-foreground">
                  <dt>Cap-weighted</dt>
                  <dd className="text-right font-mono text-foreground">
                    {formatPercentage(sector.cap_weighted_1d)}
                  </dd>
                  <dt>Equal-weighted</dt>
                  <dd className="text-right font-mono text-foreground">
                    {formatPercentage(sector.equal_weighted_1d)}
                  </dd>
                  <dt>Companies</dt>
                  <dd className="text-right font-mono text-foreground">{sector.count}</dd>
                  <dt>Advancing</dt>
                  <dd className="text-right font-mono text-foreground">
                    {formatShare(sector.advancing_pct)}
                  </dd>
                  <dt>Above 200DMA</dt>
                  <dd className="text-right font-mono text-foreground">
                    {formatShare(sector.pct_above_sma200)}
                  </dd>
                  <dt>Market cap</dt>
                  <dd className="text-right font-mono text-foreground">
                    {formatLargeNumber(sector.market_cap)}
                  </dd>
                  <dt>Weight</dt>
                  <dd className="text-right font-mono text-foreground">
                    {formatShare(sector.market_cap_weight)}
                  </dd>
                </dl>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

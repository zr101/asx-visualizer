import Link from "next/link";

import { SectorBars } from "@/components/charts/SectorBars";
import { MoverList } from "@/components/pulse/MoverList";
import { SignalSummary } from "@/components/pulse/SignalSummary";
import { Gauge, Stat } from "@/components/ui/stat";
import { getBreadthHistory, getPulse, getSignals } from "@/lib/data";
import { formatDate, formatPercentage, formatShare } from "@/lib/format";
import { BreadthStrip } from "@/components/pulse/BreadthStrip";
import { IndexStrip } from "@/components/pulse/IndexStrip";

export const metadata = { title: "Daily Pulse" };

export default async function HomePage() {
  const [pulse, signals, breadthHistory] = await Promise.all([
    getPulse(),
    getSignals(),
    getBreadthHistory(),
  ]);

  const { breadth } = pulse;
  const first = breadthHistory[0];
  const latest = breadthHistory.at(-1);

  // The headline of this whole project: the index has gone nowhere while
  // participation has collapsed underneath it.
  const indexChange = latest ? latest.market_index - 100 : null;
  const participationDrop =
    first?.pct_above_sma200 != null && latest?.pct_above_sma200 != null
      ? latest.pct_above_sma200 - first.pct_above_sma200
      : null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Daily Pulse</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDate(pulse.date)} · {breadth.universe_size.toLocaleString()} common stocks
          {" · "}
          {pulse.universe.funds_and_etfs.toLocaleString()} funds and ETFs excluded from
          market statistics
        </p>
      </header>

      <IndexStrip indices={pulse.indices} />

      {/* Breadth: the answer to "was the move broad or narrow?" */}
      <section aria-labelledby="breadth-heading" className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 id="breadth-heading" className="text-lg font-semibold">
            Market breadth
          </h2>
          <Link href="/internals" className="text-sm text-muted-foreground hover:text-foreground">
            Full internals →
          </Link>
        </div>

        <BreadthStrip breadth={breadth} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Gauge
            label="Above 50-day average"
            percent={breadth.pct_above_sma50}
            hint="Short-term participation"
          />
          <Gauge
            label="Above 200-day average"
            percent={breadth.pct_above_sma200}
            hint="The primary trend gauge"
          />
          <Stat
            label="New 52-week highs"
            value={String(breadth.new_highs_52w)}
            hint={`vs ${breadth.new_lows_52w} new lows`}
            tone={breadth.net_new_highs >= 0 ? "positive" : "negative"}
          />
          <Stat
            label="Up/down volume"
            value={breadth.up_down_volume_ratio?.toFixed(2) ?? "–"}
            hint={
              breadth.trin != null
                ? `TRIN ${breadth.trin.toFixed(2)} · ${breadth.trin < 1 ? "buying where the gains are" : "selling pressure"}`
                : "Dollar volume, advancers vs decliners"
            }
            tone={
              breadth.up_down_volume_ratio == null
                ? "neutral"
                : breadth.up_down_volume_ratio >= 1
                  ? "positive"
                  : "negative"
            }
          />
        </div>

        {indexChange !== null && participationDrop !== null && (
          <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Since inception:</span> the
            cap-weighted market index is {formatPercentage(indexChange)} over{" "}
            {breadthHistory.length} sessions, while the share of stocks above their
            200-day average moved from {formatShare(first?.pct_above_sma200)} to{" "}
            {formatShare(latest?.pct_above_sma200)}
            {participationDrop < -10
              ? " — the index is being carried by a shrinking group of large caps."
              : "."}
          </p>
        )}
      </section>

      {/* Sectors */}
      <section aria-labelledby="sectors-heading" className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 id="sectors-heading" className="text-lg font-semibold">
            Sector performance
          </h2>
          <Link href="/sectors" className="text-sm text-muted-foreground hover:text-foreground">
            Rotation →
          </Link>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-3 text-xs text-muted-foreground">
            Cap-weighted daily return. Hover a sector for its equal-weighted return —
            where the two diverge, a few large companies are driving the sector.
          </p>
          <SectorBars sectors={pulse.sectors} />
        </div>
      </section>

      {/* Signals */}
      <section aria-labelledby="signals-heading" className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 id="signals-heading" className="text-lg font-semibold">
            Today&apos;s signals
          </h2>
          <span className="text-sm text-muted-foreground">
            {Object.values(pulse.signal_counts).reduce((a, b) => a + b, 0)} fired
          </span>
        </div>
        <SignalSummary counts={pulse.signal_counts} signals={signals.signals} />
      </section>

      {/* Movers */}
      <section aria-labelledby="movers-heading" className="space-y-3">
        <h2 id="movers-heading" className="text-lg font-semibold">
          Movers
        </h2>
        <p className="text-xs text-muted-foreground">
          Restricted to stocks trading over $50,000 a day. Without that floor these lists
          are dominated by shells where a single small parcel moves the price 30%.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <MoverList title="Top gainers" rows={pulse.gainers} metric="change" />
          <MoverList title="Top losers" rows={pulse.losers} metric="change" />
          <MoverList title="Most traded" rows={pulse.most_active} metric="turnover" />
          <MoverList
            title="Unusual volume"
            rows={pulse.unusual_volume}
            metric="relative_volume_10d_calc"
          />
        </div>
      </section>
    </div>
  );
}

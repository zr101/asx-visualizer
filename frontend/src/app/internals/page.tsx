import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { Stat } from "@/components/ui/stat";
import { getBreadthHistory, getManifest } from "@/lib/data";
import { formatDate, formatPercentage, formatShare } from "@/lib/format";

export const metadata = {
  title: "Market Internals",
  description:
    "Advance/decline line, participation above moving averages, and new highs "
    + "versus new lows across every ASX common stock.",
};

export default async function InternalsPage() {
  const [history, manifest] = await Promise.all([getBreadthHistory(), getManifest()]);

  const first = history[0];
  const latest = history.at(-1);
  if (!latest) return <p>No history available.</p>;

  const series = (key: keyof typeof latest) =>
    history.map((point) => ({ date: point.date, value: point[key] as number | null }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Market Internals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {history.length} trading sessions · {formatDate(first?.date)} to{" "}
          {formatDate(latest.date)}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Market index"
          value={latest.market_index.toFixed(2)}
          hint={`${formatPercentage(latest.market_index - 100)} since inception (base 100)`}
          tone={latest.market_index >= 100 ? "positive" : "negative"}
        />
        <Stat
          label="Advance/decline line"
          value={latest.ad_line.toLocaleString()}
          hint="Cumulative net advances"
          tone={latest.ad_line >= 0 ? "positive" : "negative"}
        />
        <Stat
          label="Above 200-day"
          value={formatShare(latest.pct_above_sma200)}
          hint={`from ${formatShare(first?.pct_above_sma200)} at inception`}
          tone={(latest.pct_above_sma200 ?? 0) >= 50 ? "positive" : "negative"}
        />
        <Stat
          label="Net new highs"
          value={String(latest.net_new_highs)}
          hint={`${latest.new_highs_52w} highs vs ${latest.new_lows_52w} lows`}
          tone={latest.net_new_highs >= 0 ? "positive" : "negative"}
        />
      </div>

      {/*
        The divergence, as two stacked charts on a shared x-axis rather than one
        chart with two y-axes. A dual-axis chart lets whoever drew it slide the
        crossover point anywhere by rescaling — the comparison here is real, so
        it does not need that help.
      */}
      <section aria-labelledby="divergence" className="space-y-3">
        <h2 id="divergence" className="text-lg font-semibold">
          Index versus participation
        </h2>
        <p className="text-sm text-muted-foreground">
          The index level says where the market closed. The share of stocks above their
          own 200-day average says how many of them earned it.
        </p>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-1 text-sm font-medium">
            Cap-weighted market index{" "}
            <span className="font-normal text-muted-foreground">(base 100)</span>
          </h3>
          <TimeSeriesChart
            series={[
              {
                label: "Market index",
                data: series("market_index"),
                colorVar: "--chart-accent",
                type: "area",
              },
            ]}
            height={200}
          />
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-1 text-sm font-medium">
            Stocks above their 200-day average{" "}
            <span className="font-normal text-muted-foreground">(% of common stocks)</span>
          </h3>
          <TimeSeriesChart
            series={[
              {
                label: "% above 200DMA",
                data: series("pct_above_sma200"),
                colorVar: "--positive",
              },
              {
                label: "10-day average",
                data: series("pct_above_sma200_ma10"),
                colorVar: "--foreground",
              },
            ]}
            height={200}
            range={[0, 100]}
          />
        </div>
      </section>

      <section aria-labelledby="ad-line" className="space-y-3">
        <h2 id="ad-line" className="text-lg font-semibold">
          Advance/decline line
        </h2>
        <p className="text-sm text-muted-foreground">
          Cumulative advancers minus decliners. A falling line while the index holds means
          the average stock is losing ground regardless of what the headline number does.
        </p>
        <div className="rounded-lg border border-border bg-card p-4">
          <TimeSeriesChart
            series={[
              {
                label: "A/D line",
                data: series("ad_line"),
                colorVar: latest.ad_line >= 0 ? "--positive" : "--negative",
                type: "area",
                precision: 0,
              },
            ]}
            height={220}
          />
        </div>
      </section>

      <section aria-labelledby="highs-lows" className="space-y-3">
        <h2 id="highs-lows" className="text-lg font-semibold">
          New highs versus new lows
        </h2>
        <p className="text-sm text-muted-foreground">
          Expanding new lows during an index advance is one of the earliest signs of a
          narrowing market.
        </p>
        <div className="rounded-lg border border-border bg-card p-4">
          <TimeSeriesChart
            series={[
              { label: "New 52-week highs", data: series("new_highs_52w"), colorVar: "--positive", precision: 0 },
              { label: "New 52-week lows", data: series("new_lows_52w"), colorVar: "--negative", precision: 0 },
            ]}
            height={220}
          />
        </div>
      </section>

      <section aria-labelledby="participation" className="space-y-3">
        <h2 id="participation" className="text-lg font-semibold">
          Daily participation
        </h2>
        <div className="rounded-lg border border-border bg-card p-4">
          <TimeSeriesChart
            series={[
              { label: "Advancing %", data: series("advancing_pct"), colorVar: "--chart-accent" },
              { label: "10-day average", data: series("advancing_pct_ma10"), colorVar: "--foreground" },
            ]}
            height={200}
            range={[0, 100]}
          />
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Computed over {latest.universe_size.toLocaleString()} common stocks — ETFs and
        listed funds are excluded, because a fund mechanically tracking the market would
        damp every breadth reading. Built from {manifest.session_count} genuine trading
        sessions; carried-forward public holidays are removed.
      </p>
    </div>
  );
}

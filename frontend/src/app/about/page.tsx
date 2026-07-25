import { getCoverage, getManifest } from "@/lib/data";
import { formatDate, formatShare } from "@/lib/format";

export const metadata = {
  title: "Method & data quality",
  description:
    "How every figure on this site is computed, what the underlying data does and "
    + "does not support, and the known limitations of the archive.",
};

const FIELD_LABELS: Record<string, string> = {
  close: "Close price",
  volume: "Volume",
  market_cap_basic: "Market capitalisation",
  sector: "Sector",
  RSI: "RSI (14)",
  SMA50: "50-day average",
  SMA200: "200-day average",
  price_52_week_high: "52-week high",
  beta_1_year: "Beta (1 year)",
  price_book_ratio: "Price / book",
  earnings_per_share_basic_ttm: "Earnings per share (ttm)",
  total_revenue_ttm: "Revenue (ttm)",
  total_debt_fq: "Total debt",
  price_earnings_ttm: "Price / earnings",
  dividend_yield_recent: "Dividend yield",
  price_sales_ratio: "Price / sales",
  enterprise_value_fq: "Enterprise value",
  gross_profit_fq: "Gross profit",
  net_income_fq: "Net income",
};

export default async function AboutPage() {
  const [coverage, manifest] = await Promise.all([getCoverage(), getManifest()]);
  const { generated_from: source } = coverage;

  const fields = Object.entries(coverage.coverage.fields).sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Method &amp; data quality</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every number on this site is derived from a point-in-time archive of the whole
          ASX, rebuilt from source on each run. This page documents how, and where the
          data will not support a conclusion.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">The archive</h2>
        <dl className="grid gap-x-6 gap-y-2 rounded-lg border border-border bg-card p-4 text-sm sm:grid-cols-2">
          {[
            ["Trading sessions", source.sessions.toLocaleString()],
            ["First session", formatDate(source.first_session)],
            ["Latest session", formatDate(source.latest_session)],
            ["Ticker-days recorded", source.ticker_days.toLocaleString()],
            ["Distinct tickers seen", source.distinct_tickers.toLocaleString()],
            ["In the latest session", manifest.universe.total_listings.toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-mono tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted-foreground">
          Because every listing is captured every day, tickers that later delist stay in
          the record. That makes the archive free of survivorship bias — the usual failing
          of a dataset assembled from today&apos;s constituents backwards.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Universe</h2>
        <p className="text-sm text-muted-foreground">
          The daily scan returns{" "}
          <strong className="text-foreground">
            {manifest.universe.total_listings.toLocaleString()}
          </strong>{" "}
          securities, but only{" "}
          <strong className="text-foreground">
            {manifest.universe.common_stocks.toLocaleString()}
          </strong>{" "}
          are operating companies. The remaining{" "}
          {manifest.universe.funds_and_etfs.toLocaleString()} funds and ETFs are excluded
          from every market statistic: a fund that mechanically tracks the index would
          otherwise damp every breadth reading toward the market average it is copying.
        </p>
        <p className="text-sm text-muted-foreground">
          Rankings, signals and factor scores use a narrower{" "}
          <strong className="text-foreground">
            {manifest.universe.liquid_stocks.toLocaleString()}
          </strong>{" "}
          stocks clearing $50,000 of average daily turnover. The ASX has a long tail of
          microcaps where a single small parcel moves the price 20%; those prints are
          real, but they are noise in any aggregate.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Corrections applied</h2>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Carried-forward days are removed.</strong>{" "}
            When the market is shut the feed repeats the previous session verbatim. Four
            such days — Australia Day, Good Friday, Easter Monday and the King&apos;s
            Birthday — were being stored as if they were sessions. Counting them would
            double a day&apos;s advances in the cumulative advance/decline line.
          </li>
          <li>
            <strong className="text-foreground">Untraded securities are excluded.</strong>{" "}
            About 16% of common stocks do not trade on a given day, and their rows still
            report the previous session&apos;s change. Advancer and decliner counts use
            only securities whose price or volume actually moved.
          </li>
          <li>
            <strong className="text-foreground">Duplicate rows are dropped.</strong> The
            scan was previously sorted by market capitalisation, which is null for roughly
            460 listings, making paged reads overlap — around 100 duplicated tickers and a
            similar number silently missing every day. Sorting by ticker fixed it going
            forward; the historical gaps cannot be recovered.
          </li>
          <li>
            <strong className="text-foreground">
              Index returns use the adjusted change.
            </strong>{" "}
            Stored closes are unadjusted, so a share consolidation appears as an enormous
            single-day move. The market index weights each stock&apos;s provider-adjusted
            change by its prior-day capitalisation, which reproduces the ASX 200&apos;s
            six-month move to within half a percentage point.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Known limitations</h2>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Prices are unadjusted.</strong> A chart
            spanning a dividend, split or consolidation will show a step rather than a
            smooth transition. Multi-period returns come from the provider&apos;s adjusted
            fields wherever a clean figure is needed.
          </li>
          <li>
            <strong className="text-foreground">
              {coverage.tickers_with_gaps.toLocaleString()} tickers have gaps
            </strong>{" "}
            in the archive, against {coverage.tickers_complete.toLocaleString()} complete
            ones — mostly a legacy of the pagination fault above. Because of that, a
            single day&apos;s absence is not treated as a delisting; doing so would
            produce roughly a hundred false alarms a day across the historical period.
          </li>
          <li>
            <strong className="text-foreground">No quality factor is published.</strong>{" "}
            It would need margins, return on equity or accruals. Gross profit and net
            income are reported for under 1% of ASX common stocks, so a quality score
            built on this data would be fiction. It is omitted rather than approximated.
          </li>
          <li>
            <strong className="text-foreground">Sector labels are not GICS.</strong> They
            come from the data provider&apos;s own taxonomy, so they do not map one-to-one
            onto the official S&amp;P/ASX sector indices, and the two should not be
            compared as though they measured the same basket.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Field coverage</h2>
        <p className="text-sm text-muted-foreground">
          Share of the {coverage.coverage.rows.toLocaleString()} common stocks in the
          latest session reporting each field. Low coverage on the earnings ratios is not
          missing data: two-thirds of ASX-listed companies lose money, so they have no
          meaningful P/E. That is exactly why the value factor ranks on earnings yield,
          which stays defined through the sign change.
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card">
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2 text-left font-medium">Field</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Coverage</th>
                <th scope="col" className="w-1/3 px-4 py-2 text-left font-medium">
                  <span className="sr-only">Coverage bar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {fields.map(([field, share]) => (
                <tr key={field} className="border-b border-border last:border-0">
                  <th scope="row" className="px-4 py-1.5 text-left font-normal">
                    {FIELD_LABELS[field] ?? field}
                  </th>
                  <td className="px-4 py-1.5 text-right font-mono tabular-nums">
                    {formatShare(share * 100)}
                  </td>
                  <td className="px-4 py-1.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${share * 100}%`,
                          backgroundColor:
                            share >= 0.9
                              ? "var(--positive)"
                              : share >= 0.3
                                ? "var(--chart-accent)"
                                : "var(--negative)",
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Definitions</h2>
        <dl className="space-y-3 text-sm">
          {[
            ["Advance/decline line", "Running total of advancers minus decliners, over common stocks that traded. A falling line while the index holds means the average stock is losing ground."],
            ["% above 200-day average", "Share of common stocks closing above their own 200-day moving average — the standard gauge of how broad a trend is."],
            ["Market index", "Capitalisation-weighted return of all common stocks, chained daily from a base of 100 and using prior-day weights."],
            ["TRIN (Arms Index)", "(advancers/decliners) ÷ (up volume/down volume). Below 1 means advancing stocks are attracting more than their share of turnover."],
            ["RS rating", "Percentile 1–99 of a weighted blend of 1-week to 1-year returns, ranked across the liquid universe. Recent performance is weighted most heavily."],
            ["Factor scores", "Mean percentile rank of each factor's components, computed across the liquid universe on the same day. Blank where inputs were not reported."],
            ["Earnings yield", "Earnings per share ÷ price. The inverse of P/E, but defined for loss-making companies, which raises usable coverage from 32% to 97%."],
          ].map(([term, definition]) => (
            <div key={term}>
              <dt className="font-medium">{term}</dt>
              <dd className="text-muted-foreground">{definition}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Source</h2>
        <p className="text-sm text-muted-foreground">
          Market data is collected from TradingView&apos;s public scanner endpoint once
          per trading day after the close and committed to the repository, which is what
          makes the archive point-in-time. This is a demonstration project; the data is
          not licensed for redistribution and nothing here is financial advice.
        </p>
      </section>
    </div>
  );
}

# ASX Market Intelligence

Daily breadth, sector rotation and signals across every company listed on the Australian
Securities Exchange, built on a point-in-time archive of the whole market.

**Live:** https://asx-visualizer.vercel.app

---

## What this is

A scheduled job captures every ASX listing once per trading day and commits it. Because
nothing is ever reconstructed from today's constituents backwards, the archive is
**point-in-time and free of survivorship bias** — the tickers that have since delisted are
still in the record, with the prices they had while they were listed.

That archive is what makes the interesting numbers possible. A screener can tell you a
stock's RSI is 29; only two consecutive sessions can tell you it *crossed below* 30 today.
An index level tells you where the market closed; only the full cross-section tells you
whether the whole market earned that close or five large caps did.

As of the most recent session the cap-weighted market index sits **−1.3% over 130
sessions**, while the share of stocks above their own 200-day average has fallen from
**64.7% to 23.7%** — an index going nowhere on top of a market that is quietly narrowing.
That divergence is invisible from the index alone, and surfacing it is the point of the
project.

## Pages

| Route | What it answers |
|---|---|
| `/` | What happened today — breadth, index levels, sector moves, signals, movers |
| `/internals` | Is the trend healthy? A/D line, participation above moving averages, highs vs lows |
| `/sectors` | Where is money rotating? Cap- and equal-weighted returns, ranked by window |
| `/screener` | Filter ~2,200 securities on price, momentum, valuation and factor scores |
| `/stock/[ticker]` | One company: price history, technical position, factor percentiles |
| `/watchlist` | A personal set of tickers, stored in the browser |
| `/about` | Methodology, field coverage, and the limitations of the data |

## Architecture

```
TradingView scanner API
        │  once per trading day (GitHub Actions)
        ▼
python/src/scrapers      ~2,200 listings x 89 fields, plus 14 ASX indices
        ▼
python/src/storage       one Parquet file per session  →  data/history/daily/
        ▼
python/src/analysis      Archive → Session → Readings
                         (breadth · sectors · ranking · signals)
        ▼
python/src/contracts     one Pydantic model per payload → schemas/*.schema.json
        ▼
python/src/publish       validated JSON                →  frontend/public/data/
        ▼                                              ↘  generated TS types
Next.js (App Router)     static pages, server components, no client data fetching
```

**Two ideas hold this together.**

A **Session** is one trading day with its row-local facts established, exposing three
named universes. An **Archive** is the ordered run of Sessions, and the only thing that
can say two are adjacent. Every Reading takes one of them, so the ordering rules that
used to live in prose — *mark traded before counting, derive before ranking* — are no
longer something a caller can get wrong. Getting them wrong previously produced a
plausible wrong number rather than an error.

The **contract** is declared once as Pydantic models. TypeScript types are generated
from their JSON Schema, and CI fails if either is stale. Before that, the hand-written
frontend types declared three fields that were never emitted and omitted the ones
driving the rotation-table shading — all of which type-checked, because every formatter
renders a missing value as an en-dash.

There is no database and no API server. Every page is statically rendered from files in the
repository, so the whole site is reproducible: delete the generated output, re-run the
pipeline, and the bytes come back identical.

**Stack:** Python 3.12 · pandas · PyArrow · Pydantic · Next.js 16 · React 19 ·
TypeScript · Tailwind v4 · TanStack Table · lightweight-charts

## Numbers that shaped the design

| | Before | After |
|---|---|---|
| Archive on disk | 985 MB JSON + CSV | **86 MB** Parquet |
| Added to git per session | ~10 MB | **~0.7 MB** |
| Data shipped to the browser | 6.5 MB, bundled at build time | **0** — pages are pre-rendered |
| Home page payload | 6.5 MB | **~21 KB** |
| Trading sessions counted | 134 | **130** (four were public holidays) |
| Tickers per session | 2,218 rows, 2,110 unique | **2,218 unique, 0 duplicates** |
| Python analysis code | none | 9 modules, **74 tests** |
| Published data contract | hand-written on both sides, unverified | generated from one declaration, CI-enforced |

## Correctness work

Four defects were found and fixed. Each had been silently wrong since the project started.

**Pagination dropped ~100 tickers every day.** The scan was sorted by market capitalisation,
which is null for roughly 460 listings, so pages were not ordered deterministically and
overlapped — producing ~108 duplicated rows and a similar number of tickers that never
appeared at all. Sorting by ticker made it stable. The historical gaps cannot be recovered:
the upstream scanner only ever returns the current state.

**Four public holidays were stored as trading days.** When the market is shut the feed
repeats the previous session verbatim, which double-counted those days' advances in every
cumulative series.

**16% of securities don't trade on a given day** yet still report their previous session's
change. Advance/decline counts included them, inflating both sides.

**Share consolidations broke the index.** Stored closes are unadjusted, so a 1-for-N
consolidation reads as a +6,249,900% single-day gain; compounding those returned +26% for a
period when the market was flat. The index now weights each stock's provider-adjusted change
by its prior-day capitalisation, which reproduces the ASX 200's six-month move to within half
a percentage point.

Each is pinned by a test in `python/tests/test_quality.py`.

## Running it

```bash
# Pipeline
cd python
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

python -m pytest                             # unit tests
python -m pytest -m network                  # live API contract checks

python scripts/fetch_daily_snapshot.py       # fetch a session and rebuild site data
python scripts/build_site_data.py            # rebuild site data from existing history

# Frontend
cd frontend
npm install
npm run dev
```

`fetch_daily_snapshot.py --dry-run` fetches and validates without writing anything.

## Automation

| Workflow | Schedule | Purpose |
|---|---|---|
| `daily-snapshot.yml` | 08:30 UTC, Mon–Fri | Fetch, verify the site builds, then commit |
| `ci.yml` | push / PR | Lint, typecheck, test, build |
| `api-contract.yml` | weekly | Check the live upstream column contract |

Both CI jobs also verify that `schemas/` and `frontend/src/types/generated/` are current.
Regenerate with `python python/scripts/export_schemas.py` and `npm run types:generate`.

The daily job builds the frontend *before* committing, because the commit is what triggers
the deploy — proving the build works first is the only way to avoid publishing data that
breaks the site. Pushes retry with a rebase: a push once failed on repository size and that
trading day was lost permanently.

The contract canary exists because rows arrive as bare positional arrays with no field names.
If a column were reordered upstream, all 89 fields would shift by one and the data would look
plausible while being wrong. Nothing else in the pipeline can detect that.

## Known limitations

Documented in full at `/about`, and worth stating here too:

- **Prices are unadjusted.** A chart spanning a dividend or consolidation shows a step.
- **736 of 2,396 tickers have gaps** in the archive, mostly from the pagination fault above.
  A single day's absence is therefore not treated as a delisting — doing so would fire around
  a hundred false alarms a day across the historical period.
- **No quality factor is published.** It needs margins or return on equity, and gross profit
  and net income are reported for under 1% of ASX common stocks. Omitted rather than
  approximated.
- **Sector labels are the data provider's taxonomy, not GICS**, so they do not map onto the
  official S&P/ASX sector indices.

Two-thirds of ASX-listed companies lose money, so P/E is populated for only 32% of them. That
is a property of this market rather than missing data — which is why the value factor ranks on
**earnings yield**, which stays defined through the sign change and covers 97%.

## Notes

`data/snapshots/` holds the original uncompressed archive and is no longer written to; the
pipeline now produces `data/history/` (Parquet) and `data/raw/` (gzipped responses). Removing
that old tree would cut about a gigabyte from a fresh clone, and it stays recoverable from git
history.

Market data comes from TradingView's public scanner endpoint. This is a demonstration
project: the data is not licensed for redistribution, and nothing here is financial advice.

Built by Zaeem Rizan.

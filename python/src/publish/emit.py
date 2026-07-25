"""
Emit the precomputed JSON the frontend reads.

Replaces the previous approach of shipping one 6.5 MB `data.json` and importing
it into a client component at build time - which put the entire dataset into the
browser bundle and rewrote a 6.5 MB file into git every afternoon.

Everything here is derived, so it can be regenerated from the Parquet store at
any time. Row-heavy payloads are written columnar (parallel arrays keyed by
field) rather than as arrays of objects: with ~2,100 rows the repeated JSON keys
would otherwise be over half the file.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import pandas as pd

from src.analysis import breadth, quality, ranking, sectors, signals, universe
from src.analysis.archive import Archive
from src.analysis.session import Session
from src.contracts import payloads as P

# Fields the screener actually renders. The store keeps all 89; shipping only
# what is displayed is the difference between a 6.5 MB payload and ~1 MB.
SCREENER_FIELDS = [
    "symbol", "name", "description", "sector", "industry",
    "close", "change", "volume", "market_cap_basic",
    "RSI", "ADX", "Perf.W", "Perf.1M", "Perf.3M", "Perf.6M", "Perf.YTD", "Perf.Y",
    "price_earnings_ttm", "price_book_ratio", "dividend_yield_recent",
    "earnings_per_share_basic_ttm", "beta_1_year", "total_revenue_ttm",
    "relative_volume_10d_calc", "average_volume_30d_calc", "VWAP", "ATR",
    "SMA20", "SMA50", "SMA200", "Volatility.D",
    "Recommend.All", "price_52_week_high", "price_52_week_low",
    # Derived
    "pct_from_52w_high", "range_position_52w", "pct_vs_sma50", "pct_vs_sma200",
    "earnings_yield", "book_yield", "atr_pct", "turnover", "is_profitable",
    "momentum_score", "value_score", "income_score", "trend_score", "volatility_score",
    "rs_rating",
]

BREADTH_FIELDS = [
    "date", "advancers", "decliners", "unchanged", "untraded",
    "advance_decline_ratio", "advance_decline_net", "advancing_pct", "traded_pct",
    "up_down_volume_ratio", "trin", "pct_above_sma50", "pct_above_sma200",
    "new_highs_52w", "new_lows_52w", "net_new_highs", "median_change",
    "ad_line", "net_new_highs_line", "market_return", "market_index",
    "pct_above_sma200_ma10", "advancing_pct_ma10", "universe_size",
]

SECTOR_FIELDS = [
    "sector", "count", "traded_count", "market_cap", "market_cap_weight",
    "advancers", "decliners", "advancing_pct", "pct_above_sma200", "turnover",
] + [f"{w}_{p}" for w in ("cap_weighted", "equal_weighted")
     for p in ("1d", "1w", "1m", "3m", "6m", "ytd", "1y")]

SECTOR_HISTORY_FIELDS = [
    "date", "sector", "cap_weighted_change", "equal_weighted_change", "cumulative_index",
]

SIGNAL_FIELDS = [
    "symbol", "name", "description", "sector", "close", "change",
    "volume", "relative_volume_10d_calc", "RSI", "market_cap_basic",
]

MOVER_FIELDS = [
    "symbol", "name", "description", "sector", "close", "change",
    "volume", "turnover", "relative_volume_10d_calc", "market_cap_basic",
]

INDEX_FIELDS = [
    "symbol", "description", "close", "change",
    "Perf.W", "Perf.1M", "Perf.3M", "Perf.6M", "Perf.YTD", "Perf.Y",
]

COVERAGE_FIELDS = [
    "close", "volume", "market_cap_basic", "sector", "RSI", "SMA50",
    "SMA200", "price_52_week_high", "beta_1_year", "price_book_ratio",
    "earnings_per_share_basic_ttm", "total_revenue_ttm", "total_debt_fq",
    "price_earnings_ttm", "dividend_yield_recent", "price_sales_ratio",
    "enterprise_value_fq", "gross_profit_fq", "net_income_fq",
]

MOVERS_COUNT = 15
SIGNALS_PER_TYPE = 25


def _clean(value):
    """JSON-safe scalar: NaN/inf become null, numpy scalars become Python ones."""
    if value is None:
        return None
    if isinstance(value, (bool, str)):
        return value
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        return value
    if isinstance(value, (int, float)):
        if isinstance(value, float) and not math.isfinite(value):
            return None
        return value
    if hasattr(value, "item"):
        scalar = value.item()
        if isinstance(scalar, float) and not math.isfinite(scalar):
            return None
        return scalar
    return str(value)


def _round(value, digits: int = 4):
    cleaned = _clean(value)
    if isinstance(cleaned, float):
        return round(cleaned, digits)
    return cleaned


def sanitize_key(key: str) -> str:
    """Make a field name safe as a JSON/table key.

    TanStack Table reads a dot in an accessor key as a nested path, so a column
    literally named `Perf.W` would be looked up as `row.Perf.W` and always come
    back undefined. Sanitising once here - at the publish boundary - keeps the
    store faithful to the source field names while giving the frontend flat keys.
    """
    return key.replace(".", "_").replace("+", "_plus_").replace("-", "_minus_")


def to_columnar(df: pd.DataFrame, fields: list[str]) -> dict:
    """Pack a frame as {field: [values]} plus a row count."""
    present = [f for f in fields if f in df.columns]
    return {
        "n": len(df),
        "fields": [sanitize_key(f) for f in present],
        "columns": {
            sanitize_key(field): [_round(v) for v in df[field].tolist()]
            for field in present
        },
    }


def records(df: pd.DataFrame, fields: list[str], limit: int | None = None) -> list[dict]:
    """Row-oriented output, for the small payloads where readability wins."""
    present = [f for f in fields if f in df.columns]
    subset = df[present].head(limit) if limit else df[present]
    return [
        {sanitize_key(field): _round(row[field]) for field in present}
        for _, row in subset.iterrows()
    ]


def write_json(payload, path: Path) -> int:
    """Write compactly (no indentation) and return the byte size."""
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, separators=(",", ":"), allow_nan=False)
    path.write_text(text)
    return len(text.encode())


def scored_listings(session: Session) -> pd.DataFrame:
    """Every listing in the Session, with the cross-sectional scores joined on.

    Scores exist only for the Liquid universe, so most listings carry nulls -
    that is the honest answer rather than a percentile computed against a
    population the listing isn't part of.
    """
    scores = ranking.of(session)
    if scores.empty or len(scores.columns) < 2:
        return session.all
    return session.all.merge(scores, on="symbol", how="left")


def _assert_screener_contract() -> None:
    """The emitted fields and the declared row type must describe the same thing.

    `SCREENER_FIELDS` names source columns; `ScreenerRow` names wire fields.
    They differ only by `sanitize_key`, so drift between them is detectable.
    """
    emitted = {sanitize_key(f) for f in SCREENER_FIELDS}
    declared = set(P.ScreenerRow.model_fields)
    if emitted != declared:
        raise AssertionError(
            f"screener contract drift - emitted only: {sorted(emitted - declared)}, "
            f"declared only: {sorted(declared - emitted)}"
        )


def build_payloads(archive: Archive, indices: pd.DataFrame | None = None) -> dict[str, P.Payload]:
    """Construct every published payload. Pure - touches no filesystem.

    This is the seam that makes the publish layer testable. Previously `build`
    wrote and returned byte counts, so asserting anything about the screener
    rows meant writing to a tmpdir and re-parsing JSON; there was no function
    that returned a payload at all.
    """
    if not len(archive):
        raise ValueError("archive is empty")
    _assert_screener_contract()

    session = archive.latest
    previous = archive.pair()[0] if len(archive) > 1 else None
    latest = session.date

    listings = scored_listings(session)
    stocks = universe.common_stocks(listings)

    # --- Screener -----------------------------------------------------------
    screener = P.ScreenerFile(
        date=latest,
        **to_columnar(listings.sort_values("market_cap_basic", ascending=False),
                      SCREENER_FIELDS),
    )

    # --- Breadth series -----------------------------------------------------
    breadth_history = breadth.over(archive).copy()
    breadth_history["date"] = breadth_history["date"].astype(str)
    breadth_file = P.BreadthFile(**to_columnar(breadth_history, BREADTH_FIELDS))

    # --- Sectors ------------------------------------------------------------
    sector_latest = sectors.of(session)
    sector_history = sectors.over(archive).copy()
    if not sector_history.empty:
        sector_history["date"] = sector_history["date"].astype(str)

    sector_rows = [P.SectorRow(**row) for row in records(sector_latest, SECTOR_FIELDS)]
    sectors_file = P.SectorsFile(
        date=latest,
        latest=sector_rows,
        rotation=[P.RotationRow(**row) for row in sectors.rotation_table(sector_latest)],
        history=P.Columnar(**to_columnar(sector_history, SECTOR_HISTORY_FIELDS)),
    )

    # --- Signals ------------------------------------------------------------
    counts: dict[str, int] = {}
    groups: dict[str, P.SignalGroup] = {}
    changes = None
    if previous is not None:
        fired = signals.between(previous, session)
        counts = signals.summarise(fired)
        for name, group in fired.groupby("signal"):
            groups[name] = P.SignalGroup(
                label=signals.SIGNAL_LABELS.get(name, name),
                total=len(group),
                rows=[P.SignalRow(**r)
                      for r in records(group, SIGNAL_FIELDS, limit=SIGNALS_PER_TYPE)],
            )
        raw_changes = signals.universe_changes(session.all, previous.all)
        changes = P.UniverseChanges(
            new_listings=[P.ListingRef(**_listing_ref(r))
                          for r in raw_changes["new_listings"]],
            delistings=[P.ListingRef(**_listing_ref(r))
                        for r in raw_changes["delistings"]],
        )
    signals_file = P.SignalsFile(
        date=latest, counts=counts, signals=groups, universe_changes=changes
    )

    # --- Daily pulse --------------------------------------------------------
    # Movers come from listings that actually traded, within the Liquid universe
    # - a 30% gain on a shell that trades twice a week is not a mover.
    traded = universe.investable(listings[listings["traded"].fillna(False).astype(bool)])

    index_rows: list[P.IndexQuote] = []
    if indices is not None and not indices.empty:
        latest_indices = indices[indices["date"] == indices["date"].max()]
        index_rows = [P.IndexQuote(**row) for row in records(latest_indices, INDEX_FIELDS)]

    def movers(frame: pd.DataFrame) -> list[P.Mover]:
        return [P.Mover(**row) for row in records(frame, MOVER_FIELDS)]

    pulse = P.PulseFile(
        date=latest,
        previous_date=previous.date if previous else None,
        breadth=P.BreadthReading(**{k: _round(v) for k, v in breadth.of(session).items()}),
        universe=P.UniverseCounts(**session.composition()),
        indices=index_rows,
        sectors=sector_rows,
        gainers=movers(traded.nlargest(MOVERS_COUNT, "change")),
        losers=movers(traded.nsmallest(MOVERS_COUNT, "change")),
        most_active=movers(traded.nlargest(MOVERS_COUNT, "turnover")),
        unusual_volume=movers(traded.nlargest(MOVERS_COUNT, "relative_volume_10d_calc")),
        signal_counts=counts,
    )

    # --- Coverage / provenance ---------------------------------------------
    gaps = quality.presence_gaps(pd.concat([s.all for s in archive], ignore_index=True))
    coverage = P.CoverageFile(
        generated_from=P.ArchiveProvenance(
            sessions=len(archive),
            first_session=archive.dates[0],
            latest_session=latest,
            ticker_days=sum(len(s) for s in archive),
            distinct_tickers=int(pd.concat([s.all["symbol"] for s in archive]).nunique()),
        ),
        coverage=P.FieldCoverage(**quality.coverage_report(listings, COVERAGE_FIELDS)),
        factor_coverage={
            name: P.FactorCoverage(**value)
            for name, value in ranking.factor_coverage(
                ranking.factor_scores(session.liquid)
            ).items()
        },
        tickers_with_gaps=int((gaps["gaps"] > 0).sum()),
        tickers_complete=int((gaps["gaps"] == 0).sum()),
    )

    built: dict[str, P.Payload] = {
        "screener": screener,
        "breadth": breadth_file,
        "sectors": sectors_file,
        "signals": signals_file,
        "pulse": pulse,
        "coverage": coverage,
    }

    built["manifest"] = P.ManifestFile(
        latest_date=latest,
        previous_date=previous.date if previous else None,
        sessions=archive.dates,
        session_count=len(archive),
        universe=P.UniverseCounts(**session.composition()),
        files=sorted(f"{name}.json" for name in [*built, "manifest", "search"]),
    )

    # The search index is a bare array of tuples rather than a model - it is the
    # one payload whose shape is a list, and wrapping it would cost bytes on the
    # file the palette loads lazily.
    built["_search"] = stocks.sort_values("market_cap_basic", ascending=False)
    return built


def _listing_ref(row: dict) -> dict:
    return {k: row.get(k) for k in ("symbol", "name", "description", "sector", "close")}


def write(built: dict, out_dir: Path) -> dict[str, int]:
    """Write payloads to disk. The only part of publishing that touches IO."""
    written: dict[str, int] = {}
    search = built.pop("_search", None)

    for name, payload in built.items():
        text = payload.model_dump_json(by_alias=True, exclude_none=False)
        path = out_dir / f"{name}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
        written[f"{name}.json"] = len(text.encode())

    if search is not None:
        written["search.json"] = write_json(
            [
                [_clean(r["symbol"]), _clean(r["name"]), _clean(r["description"]),
                 _clean(r["sector"])]
                for _, r in search[["symbol", "name", "description", "sector"]].iterrows()
            ],
            out_dir / "search.json",
        )
    return written


def build(archive: Archive, out_dir: Path, indices: pd.DataFrame | None = None) -> dict:
    """Construct every payload and write it. Returns {filename: bytes}."""
    return write(build_payloads(archive, indices), out_dir)


def build_series(history: pd.DataFrame, path: Path) -> int:
    """Per-ticker price history, for statically rendering stock detail pages.

    Written to the repo but not to `public/` - the Next build reads it from disk
    and bakes the numbers into each page, so it never reaches a browser.
    """
    frame = history[["date", "symbol", "close", "volume"]].copy()
    frame["date"] = frame["date"].astype(str)

    sessions = sorted(frame["date"].unique())
    position = {date: i for i, date in enumerate(sessions)}

    series: dict[str, dict] = {}
    for symbol, group in frame.groupby("symbol"):
        group = group.sort_values("date")
        series[str(symbol)] = {
            # Store the session index rather than the date string: it is a
            # fraction of the size and the frontend has the session list already.
            "i": [position[d] for d in group["date"]],
            "c": [_round(v, 4) for v in group["close"]],
            "v": [_clean(v) for v in group["volume"]],
        }

    return write_json({"sessions": sessions, "series": series}, path)

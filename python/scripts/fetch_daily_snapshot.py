#!/usr/bin/env python3
"""
Daily ASX snapshot.

Fetches the full ASX universe plus the index family, appends both to the Parquet
history, and regenerates the site's JSON. Designed to fail loudly rather than
commit bad data: a partial fetch is worse than a missed day, because a missed day
gets retried and a partial one gets committed forever.

Usage:
    python python/scripts/fetch_daily_snapshot.py [--date YYYY-MM-DD] [--dry-run]
"""
from __future__ import annotations

import argparse
import gzip
import json
import logging
import sys
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd

sys.path.append(str(Path(__file__).parent.parent))

from src.analysis import quality  # noqa: E402
from src.analysis.archive import Archive  # noqa: E402
from src.publish import emit  # noqa: E402
from src.scrapers.tradingview import TradingViewScanner  # noqa: E402
from src.storage import parquet_store  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
logger = logging.getLogger("daily-snapshot")

# Refuse to write if the fetch came back materially short of what the API said
# was available. A silent 10% shortfall would be committed and never noticed.
MIN_COMPLETENESS = 0.98


def fetch(scanner: TradingViewScanner) -> tuple[pd.DataFrame, pd.DataFrame]:
    logger.info("Fetching ASX universe...")
    result = scanner.get_all_asx_stocks()

    total = result["totalCount"]
    fetched = result["fetchedCount"]
    logger.info("  %d rows (API reported %d), %d duplicates dropped",
                fetched, total, result["duplicatesDropped"])

    if total and fetched / total < MIN_COMPLETENESS:
        raise RuntimeError(
            f"Only fetched {fetched} of {total} rows "
            f"({100 * fetched / total:.1f}%) - refusing to write a partial snapshot"
        )

    stocks = pd.DataFrame(scanner._rows_to_records(result["data"], scanner.ALL_COLUMNS))

    logger.info("Fetching index family...")
    index_result = scanner.get_indices()
    indices = pd.DataFrame(
        scanner._rows_to_records(index_result["data"], scanner.INDEX_COLUMNS)
    )
    logger.info("  %d indices", len(indices))

    return stocks, indices


def archive_raw(payload: dict, date: str, project_root: Path) -> Path:
    """Keep the untouched API response, gzipped, as an audit trail.

    Compresses roughly 4x against the raw JSON that used to be committed.
    """
    path = project_root / "data" / "raw" / date[:7] / f"{date}.json.gz"
    path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(path, "wt", encoding="utf-8") as handle:
        json.dump(payload, handle, separators=(",", ":"))
    return path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", help="override the session date (YYYY-MM-DD)")
    parser.add_argument("--dry-run", action="store_true",
                        help="fetch and validate but write nothing")
    args = parser.parse_args()

    project_root = Path(__file__).parent.parent.parent
    date = args.date or datetime.now(UTC).astimezone().strftime("%Y-%m-%d")

    with TradingViewScanner() as scanner:
        stocks, indices = fetch(scanner)

    if stocks.empty:
        logger.error("No rows fetched - aborting")
        return 1

    # Guard against writing a public holiday as if it were a session. The feed
    # carries the previous close forward when the market is shut, and counting
    # that as a trading day corrupts every cumulative series.
    existing = parquet_store.available_dates(project_root)
    if existing:
        previous_date = existing[-1]
        previous = parquet_store.load_history(
            start=previous_date, end=previous_date, root=project_root
        )
        # Normalise first so both sides are float32. Comparing the raw float64
        # response against the float32 store makes every close look different,
        # which would let a public holiday through as a real session.
        normalised = parquet_store.normalise(stocks, date)
        stale, fraction = quality.is_stale_day(normalised, previous)
        if stale:
            logger.warning(
                "%s looks like a carried-forward copy of %s (%.1f%% of rows identical) "
                "- not a trading day, nothing written",
                date, previous_date, 100 * fraction,
            )
            return 0
        logger.info("Session check: %.1f%% of rows unchanged vs %s - a real session",
                    100 * fraction, previous_date)

    if args.dry_run:
        logger.info("Dry run - nothing written")
        return 0

    path = parquet_store.write_day(stocks, date, project_root)
    logger.info("Wrote %s (%.0f KB)", path.relative_to(project_root),
                path.stat().st_size / 1024)

    if not indices.empty:
        parquet_store.write_indices(indices, date, project_root)
        logger.info("Wrote index levels")

    archive = archive_raw(
        {"date": date, "data": stocks.to_dict(orient="records")}, date, project_root
    )
    logger.info("Archived raw response (%.0f KB gzipped)", archive.stat().st_size / 1024)

    logger.info("Rebuilding site data...")
    history = parquet_store.load_history(root=project_root)
    written = emit.build(
        Archive.from_history(history),
        project_root / "frontend" / "public" / "data",
        indices=parquet_store.load_indices(root=project_root),
    )
    emit.build_series(history, project_root / "frontend" / "data" / "series.json")

    total_kb = sum(written.values()) / 1024
    logger.info("Published %d files, %.0f KB total", len(written), total_kb)
    logger.info("Done: %d sessions in the store", len(parquet_store.available_dates(project_root)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

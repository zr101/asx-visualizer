#!/usr/bin/env python3
"""
One-time backfill: convert the existing daily JSON snapshots into the Parquet store.

The archive holds every trading day since inception but nothing has ever read it
back. This walks those files once and lands them in data/history/ so the
analytics layer has a real time series to work with.

Two corrections are applied on the way in, both of which matter for any
cumulative series:

1. Duplicate symbols are dropped. Snapshots taken before the pagination fix
   contain ~100 repeated tickers per day, because the scanner was sorted by
   market cap - which is null for ~460 listings - making paged reads overlap.
   The first occurrence is kept. The tickers that were *missed* on a given day
   cannot be recovered; that data was never captured.

2. Public holidays are excluded. Four snapshots are byte-identical copies of the
   preceding session (the feed carries rows forward when the market is shut).
   Counting them would double-count a day's advances in the A/D line.

Usage:
    python python/scripts/backfill_history.py [--force]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import pandas as pd

sys.path.append(str(Path(__file__).parent.parent))

from src.analysis import quality  # noqa: E402
from src.scrapers.tradingview import TradingViewScanner  # noqa: E402
from src.storage import parquet_store  # noqa: E402

DATE_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})$")

# The first snapshot was taken on a Saturday and holds the preceding Friday's
# close. Filed under the session it actually represents.
DATE_OVERRIDES = {"2026-01-17": "2026-01-16"}


def snapshot_files(project_root: Path) -> list[tuple[str, Path]]:
    """Every raw daily snapshot, ascending by date (excluding summaries and presets)."""
    found = []
    for path in (project_root / "data" / "snapshots").rglob("*.json"):
        if "presets" in path.parts or path.stem.endswith("-summary"):
            continue
        match = DATE_RE.match(path.stem)
        if match:
            date = match.group(1)
            found.append((DATE_OVERRIDES.get(date, date), path))
    return sorted(found)


def load_snapshot(path: Path, columns: list[str]) -> pd.DataFrame | None:
    """Parse one raw snapshot into a DataFrame, dropping duplicate symbols."""
    with open(path) as handle:
        payload = json.load(handle)

    rows = payload.get("data", [])
    if not rows:
        return None

    width = len(columns)
    records = []
    seen: set = set()
    duplicates = 0
    malformed = 0

    for row in rows:
        symbol = row.get("s")
        values = row.get("d", [])
        if len(values) != width:
            malformed += 1
            continue
        if symbol in seen:
            duplicates += 1
            continue
        seen.add(symbol)
        records.append({"symbol": symbol, **dict(zip(columns, values, strict=True))})

    frame = pd.DataFrame(records)
    frame.attrs["duplicates"] = duplicates
    frame.attrs["malformed"] = malformed
    return frame


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true",
                        help="overwrite partitions that already exist")
    args = parser.parse_args()

    project_root = Path(__file__).parent.parent.parent
    columns = TradingViewScanner.ALL_COLUMNS

    files = snapshot_files(project_root)
    if not files:
        print("No snapshots found under data/snapshots/")
        return 1

    print(f"Found {len(files)} snapshots: {files[0][0]} -> {files[-1][0]}")

    daily_dir = parquet_store.history_dir(project_root) / "daily"
    if args.force and daily_dir.exists():
        for stale in daily_dir.glob("*/*.parquet"):
            stale.unlink()
        print("Cleared existing daily partitions (--force)")

    print("\nLoading snapshots...")
    frames: dict[str, pd.DataFrame] = {}
    total_duplicates = 0
    for date, path in files:
        frame = load_snapshot(path, columns)
        if frame is None or frame.empty:
            print(f"  ! {date}: empty snapshot, skipped")
            continue
        total_duplicates += frame.attrs.get("duplicates", 0)
        frames[date] = frame

    print(f"  loaded {len(frames)} days, dropped {total_duplicates:,} duplicate rows")

    print("\nDetecting carried-forward (non-trading) days...")
    stale = quality.find_stale_days(frames)
    for date, duplicate_of in sorted(stale.items()):
        print(f"  - {date} is a copy of {duplicate_of} - excluded")
    print(f"  {len(frames)} snapshots -> {len(frames) - len(stale)} real sessions")

    print("\nWriting partitions...")
    written = 0
    total_rows = 0
    total_bytes = 0
    for date in sorted(frames):
        if date in stale:
            continue
        path = parquet_store.day_path(date, project_root)
        if path.exists() and not args.force:
            continue
        parquet_store.write_day(frames[date], date, project_root)
        written += 1
        total_rows += len(frames[date])
        total_bytes += path.stat().st_size

    print(f"  wrote {written} daily partitions, {total_rows:,} ticker-days")
    if written:
        print(f"  {total_bytes/1e6:.1f} MB total, {total_bytes/written/1e3:.0f} KB average per day")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

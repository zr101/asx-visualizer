#!/usr/bin/env python3
"""
Regenerate the JSON the frontend reads, from the Parquet history.

Replaces deploy_data.py, which flattened the newest snapshot into a single
6.5 MB `public/data.json`. Everything written here is derived and reproducible:
delete the output and re-run to get identical bytes.

Usage:
    python python/scripts/build_site_data.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from src.analysis.archive import Archive  # noqa: E402
from src.publish import emit  # noqa: E402
from src.storage import parquet_store  # noqa: E402


def main() -> int:
    project_root = Path(__file__).parent.parent.parent

    archive = Archive.load(root=project_root)
    if not len(archive):
        print("No history found. Run backfill_history.py first.")
        return 1

    indices = parquet_store.load_indices(root=project_root)

    print(f"Archive: {len(archive)} sessions "
          f"({archive.dates[0]} -> {archive.dates[-1]})")
    if archive.excluded_days:
        print(f"  excluded {len(archive.excluded_days)} carried-forward days")
    print(f"Indices: {len(indices)} rows")

    public_dir = project_root / "frontend" / "public" / "data"
    written = emit.build(archive, public_dir, indices=indices)

    print("\nPublished to frontend/public/data/:")
    total = 0
    for name in sorted(written):
        size = written[name]
        total += size
        print(f"  {name:20s} {size/1024:8.1f} KB")
    print(f"  {'TOTAL':20s} {total/1024:8.1f} KB")

    series_path = project_root / "frontend" / "data" / "series.json"
    series_bytes = emit.build_series(
        parquet_store.load_history(root=project_root), series_path
    )
    print("\nBuild-time only (not served):")
    print(f"  frontend/data/series.json  {series_bytes/1024/1024:.1f} MB")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

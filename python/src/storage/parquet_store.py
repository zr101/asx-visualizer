"""
Columnar history store.

The daily snapshots were previously kept as one 4.7 MB JSON plus a fully redundant
2.6 MB CSV per trading day, which nothing ever read back. Parquet keeps the same
rows in roughly a fifteenth of the space and makes the history actually queryable:
`load_history()` returns every ticker-day since inception as a single DataFrame.

Layout:
    data/history/daily/YYYY-MM/YYYY-MM-DD.parquet   one row per ticker
    data/history/indices.parquet                    one row per index per day

One file per trading day, not per month. This matters because the store is
committed to git: a monthly partition would be rewritten every afternoon, and
since Parquet is compressed binary it does not delta-compress, so each rewrite
costs a fresh ~15 MB object. Per-day files are append-only - one new ~350 KB
object per day, never rewritten. That distinction is the difference between
~330 MB and ~8 MB of git growth per month.
"""
from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

from src.scrapers.tradingview import TradingViewScanner

# Columns that must stay textual; everything else in ALL_COLUMNS is numeric.
TEXT_COLUMNS = {
    "symbol", "name", "description", "logoid", "exchange", "type", "typespecs",
    "sector", "industry", "country",
}

# Fields whose magnitude or precision genuinely needs float64 - market caps run to
# 1e11 and float32 carries only ~7 significant digits. Everything else (prices,
# percentages, oscillators, moving averages) is stored as float32, which costs
# nothing in accuracy at 2-decimal display precision and cuts the store by a third.
WIDE_COLUMNS = {
    "volume", "market_cap_basic", "enterprise_value_fq", "total_revenue_ttm",
    "gross_profit_fq", "net_income_fq", "total_debt_fq", "earnings_release_date",
    "average_volume_10d_calc", "average_volume_30d_calc",
    "average_volume_60d_calc", "average_volume_90d_calc",
    "Perf.All", "High.All", "Low.All",
}

COMPRESSION = "zstd"
COMPRESSION_LEVEL = 9


def _write(df: pd.DataFrame, path: Path) -> None:
    """Write a frame with encodings tuned for wide float tables.

    BYTE_STREAM_SPLIT reorders float mantissa bytes so that similar exponents sit
    together, which compresses substantially better than raw IEEE-754 layout -
    worth about 16% here at no cost in fidelity.
    """
    table = pa.Table.from_pandas(df, preserve_index=False)
    float_columns = [f.name for f in table.schema if pa.types.is_floating(f.type)]
    string_columns = [f.name for f in table.schema if pa.types.is_string(f.type)]

    pq.write_table(
        table,
        path,
        compression=COMPRESSION,
        compression_level=COMPRESSION_LEVEL,
        use_byte_stream_split=float_columns or False,
        use_dictionary=string_columns or False,
    )


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def history_dir(root: Path | None = None) -> Path:
    return (root or _project_root()) / "data" / "history"


def normalise(df: pd.DataFrame, date: str) -> pd.DataFrame:
    """Coerce a raw snapshot frame into the stable on-disk schema.

    Without this, months written on different days can end up with different
    dtypes for the same column and fail to concatenate on read.
    """
    df = df.copy()

    # typespecs arrives as a list (e.g. ["common"]); flatten so it round-trips.
    if "typespecs" in df.columns:
        df["typespecs"] = df["typespecs"].apply(
            lambda v: ",".join(v) if isinstance(v, (list, tuple)) else (v or "")
        )

    for column in TradingViewScanner.ALL_COLUMNS:
        if column not in df.columns:
            df[column] = None
        if column in TEXT_COLUMNS:
            df[column] = df[column].astype("string")
        else:
            dtype = "float64" if column in WIDE_COLUMNS else "float32"
            df[column] = pd.to_numeric(df[column], errors="coerce").astype(dtype)

    df["symbol"] = df["symbol"].astype("string")
    df["date"] = pd.to_datetime(date).date()

    ordered = ["date", "symbol"] + TradingViewScanner.ALL_COLUMNS
    return df[ordered]


def day_path(date: str, root: Path | None = None) -> Path:
    return history_dir(root) / "daily" / date[:7] / f"{date}.parquet"


def write_day(df: pd.DataFrame, date: str, root: Path | None = None) -> Path:
    """Write one trading day to its own immutable partition."""
    path = day_path(date, root)
    path.parent.mkdir(parents=True, exist_ok=True)

    frame = normalise(df, date).sort_values("symbol").reset_index(drop=True)
    _write(frame, path)
    return path


def write_indices(df: pd.DataFrame, date: str, root: Path | None = None) -> Path:
    """Upsert one trading day of index levels into the single indices partition."""
    target_dir = history_dir(root)
    target_dir.mkdir(parents=True, exist_ok=True)
    path = target_dir / "indices.parquet"

    incoming = df.copy()
    incoming["date"] = pd.to_datetime(date).date()
    incoming["symbol"] = incoming["symbol"].astype("string")
    for column in TradingViewScanner.INDEX_COLUMNS:
        if column in {"name", "description"}:
            incoming[column] = incoming[column].astype("string")
        else:
            incoming[column] = pd.to_numeric(incoming[column], errors="coerce")
    incoming = incoming[["date", "symbol"] + TradingViewScanner.INDEX_COLUMNS]

    if path.exists():
        existing = pd.read_parquet(path)
        existing = existing[existing["date"] != incoming["date"].iloc[0]]
        combined = pd.concat([existing, incoming], ignore_index=True)
    else:
        combined = incoming

    combined = combined.sort_values(["date", "symbol"]).reset_index(drop=True)
    _write(combined, path)
    return path


def day_paths(root: Path | None = None) -> list[Path]:
    """Every daily partition, ascending by date."""
    return sorted((history_dir(root) / "daily").glob("*/*.parquet"))


def load_history(
    columns: Iterable[str] | None = None,
    start: str | None = None,
    end: str | None = None,
    root: Path | None = None,
) -> pd.DataFrame:
    """Load ticker-day history across all daily partitions."""
    paths = day_paths(root)
    if start:
        paths = [p for p in paths if p.stem >= start]
    if end:
        paths = [p for p in paths if p.stem <= end]
    if not paths:
        return pd.DataFrame()

    if columns is not None:
        columns = list(dict.fromkeys(["date", "symbol", *columns]))

    frames = [pd.read_parquet(p, columns=columns) for p in paths]
    df = pd.concat(frames, ignore_index=True)
    return df.sort_values(["date", "symbol"]).reset_index(drop=True)


def load_indices(root: Path | None = None) -> pd.DataFrame:
    path = history_dir(root) / "indices.parquet"
    if not path.exists():
        return pd.DataFrame()
    return pd.read_parquet(path).sort_values(["date", "symbol"]).reset_index(drop=True)


def available_dates(root: Path | None = None) -> list:
    """Every trading date present in the store, ascending. Read from filenames."""
    return [p.stem for p in day_paths(root)]


def latest_date(root: Path | None = None) -> object | None:
    dates = available_dates(root)
    return dates[-1] if dates else None

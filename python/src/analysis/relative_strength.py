"""
Relative strength - performance measured against the market rather than zero.

In a market where the ASX 200 fell 8% over three months, a stock down 2% is
strong. Absolute performance cannot express that; relative strength can. This is
the single most useful thing the index data unlocks, and none of it was
previously fetched.

Everything here is *benchmark-relative* - excess return over an index. The
cross-sectional RS rating lives in `ranking`, because ranking a listing against
its peers is a different measure that needs no index.

NOTE: none of this is currently reachable. The publish step never supplied a
benchmark row, so no `rs_*` column has ever been produced. The Archive now
holds the index levels needed to wire it up; until that happens this module is
unused and should be treated as unfinished rather than working.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .ranking import RS_WINDOWS, add_rs_rating

BENCHMARK = "ASX:XJO"

# Window -> (stock column, weight in the composite). Recent performance carries
# more weight because leadership decays; a stock's last quarter says more about
# it now than its last year.
def benchmark_row(indices: pd.DataFrame, date, symbol: str = BENCHMARK) -> pd.Series | None:
    """The benchmark's row for a given date, or None if it wasn't captured."""
    if indices.empty:
        return None
    match = indices[(indices["date"] == date) & (indices["symbol"] == symbol)]
    if match.empty:
        return None
    return match.iloc[0]


def add_relative_strength(
    df: pd.DataFrame,
    benchmark: pd.Series | None,
) -> pd.DataFrame:
    """Append excess-return columns and a 1-99 RS rating.

    If no benchmark row is available the excess-return columns are omitted, but
    the RS rating is still produced - it is a cross-sectional rank, so it stays
    meaningful without an index (it simply measures strength against peers).
    """
    out = df.copy()

    for label, (column, _) in RS_WINDOWS.items():
        if column not in out.columns:
            continue
        stock_perf = pd.to_numeric(out[column], errors="coerce")
        if benchmark is not None and column in benchmark.index:
            index_perf = pd.to_numeric(pd.Series([benchmark[column]]), errors="coerce").iloc[0]
            if pd.notna(index_perf):
                out[f"rs_{label}"] = (stock_perf - float(index_perf)).round(3)

    return add_rs_rating(out)


def sector_relative_strength(df: pd.DataFrame, column: str = "Perf.3M") -> pd.Series:
    """Excess return versus the stock's own sector median over the same window."""
    if column not in df.columns or "sector" not in df.columns:
        return pd.Series(np.nan, index=df.index, dtype="float64")

    values = pd.to_numeric(df[column], errors="coerce")
    sector_median = values.groupby(df["sector"]).transform("median")
    return (values - sector_median).round(3)


def index_series(indices: pd.DataFrame, symbol: str = BENCHMARK) -> pd.DataFrame:
    """One index's history, rebased to 100 at the first captured date."""
    if indices.empty:
        return pd.DataFrame()

    subset = indices[indices["symbol"] == symbol].sort_values("date").copy()
    if subset.empty:
        return pd.DataFrame()

    first_close = pd.to_numeric(subset["close"], errors="coerce").dropna()
    if first_close.empty:
        return subset

    subset["rebased"] = (
        pd.to_numeric(subset["close"], errors="coerce") / first_close.iloc[0] * 100
    ).round(3)
    return subset

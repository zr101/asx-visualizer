"""
Universe selection.

Everything downstream depends on this module getting the denominator right.
The raw scan returns ~2,200 ASX listings, but only ~1,620 are common stocks -
the rest are ETFs, listed funds, REITs and depositary receipts. Including them
in market statistics quietly corrupts the result: an equal-weighted "average
change" across 2,200 rows is partly measuring index funds tracking the very
market it claims to describe.

Field coverage tells the same story. Across all rows, market cap looks 79%
populated; across common stocks alone it is 99.8%. Most apparent data quality
problems in this dataset are actually universe problems.
"""
from __future__ import annotations

import pandas as pd

# Minimum average daily turnover (AUD) for the "liquid" universe. The ASX has a
# long tail of microcaps that trade a few thousand dollars a day, where a single
# small parcel moves the price 20% - real prints, but noise in any aggregate.
DEFAULT_MIN_TURNOVER = 50_000


def common_stocks(df: pd.DataFrame) -> pd.DataFrame:
    """Operating companies only - excludes ETFs, listed funds and depositary receipts.

    This is the correct denominator for breadth, sector and ranking statistics.
    """
    if "type" not in df.columns:
        return df
    return df[df["type"] == "stock"].copy()


def funds(df: pd.DataFrame) -> pd.DataFrame:
    """ETFs, closed-end funds, mutual funds and listed REITs."""
    if "type" not in df.columns:
        return df.iloc[0:0].copy()
    return df[df["type"] == "fund"].copy()


def turnover(df: pd.DataFrame) -> pd.Series:
    """Average daily traded value (AUD), using 30-day average volume."""
    volume = df.get("average_volume_30d_calc")
    if volume is None:
        volume = df.get("volume")
    return pd.to_numeric(volume, errors="coerce") * pd.to_numeric(df["close"], errors="coerce")


def liquid(
    df: pd.DataFrame,
    min_turnover: float = DEFAULT_MIN_TURNOVER,
) -> pd.DataFrame:
    """Rows clearing a minimum average daily turnover.

    Used for views where microcap noise would distort the picture - factor
    rankings and "biggest mover" lists in particular, where an illiquid shell
    trading twice a week otherwise dominates.
    """
    return df[turnover(df) >= min_turnover].copy()


def investable(
    df: pd.DataFrame,
    min_turnover: float = DEFAULT_MIN_TURNOVER,
) -> pd.DataFrame:
    """Common stocks that also clear the liquidity floor."""
    return liquid(common_stocks(df), min_turnover)


def summarise(df: pd.DataFrame) -> dict:
    """Composition of a single day's cross-section, for provenance display."""
    total = len(df)
    stocks = common_stocks(df)
    return {
        "total_listings": total,
        "common_stocks": len(stocks),
        "funds_and_etfs": len(funds(df)),
        "other": total - len(stocks) - len(funds(df)),
        "liquid_stocks": len(liquid(stocks)),
    }

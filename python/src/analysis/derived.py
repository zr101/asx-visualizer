"""
Derived per-stock metrics.

Every value here is computable from fields already in the snapshot but is not
supplied by the source - the raw feed gives you `close`, `SMA200` and
`price_52_week_high` but never tells you a stock is 40% off its high and below
its 200-day average, which is the form a human actually reads.
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def numeric(df: pd.DataFrame, column: str) -> pd.Series:
    """Fetch a column as a float Series, or an all-NaN Series if it is absent.

    `df.get(missing)` returns None, and `pd.to_numeric(None)` returns a scalar
    rather than a Series - which turns every downstream vector operation into a
    scalar one and fails with an obscure AttributeError. Always returning an
    index-aligned Series means a dropped upstream column degrades to nulls
    instead of crashing the pipeline.
    """
    if column not in df.columns:
        return pd.Series(np.nan, index=df.index, dtype="float64")
    return pd.to_numeric(df[column], errors="coerce")


def _safe_ratio(numerator: pd.Series, denominator: pd.Series) -> pd.Series:
    """Element-wise division that yields NaN rather than inf on a zero denominator."""
    denominator = denominator.replace(0, np.nan)
    return numerator / denominator


def add_derived(df: pd.DataFrame) -> pd.DataFrame:
    """Append derived columns to a cross-section. Pure - returns a new frame."""
    out = df.copy()
    close = numeric(out, "close")

    # Position within the 52-week range. `pct_from_52w_high` is negative or zero;
    # `range_position_52w` is 0 at the low and 100 at the high.
    high52 = numeric(out, "price_52_week_high")
    low52 = numeric(out, "price_52_week_low")
    out["pct_from_52w_high"] = _safe_ratio(close - high52, high52) * 100
    out["pct_from_52w_low"] = _safe_ratio(close - low52, low52) * 100
    span = (high52 - low52).replace(0, np.nan)
    out["range_position_52w"] = ((close - low52) / span) * 100

    # Distance from the moving averages, as a percentage rather than a raw level.
    for window in (20, 50, 200):
        sma = numeric(out, f"SMA{window}")
        out[f"pct_vs_sma{window}"] = _safe_ratio(close - sma, sma) * 100
        out[f"above_sma{window}"] = close > sma

    # Trend regime from the classic 50/200 relationship.
    sma50 = numeric(out, "SMA50")
    sma200 = numeric(out, "SMA200")
    out["sma50_above_sma200"] = sma50 > sma200

    # MACD histogram - the crossover signal, which the feed omits despite
    # supplying both the line and its signal.
    macd = numeric(out, "MACD.macd")
    signal = numeric(out, "MACD.signal")
    out["macd_histogram"] = macd - signal

    # Bollinger position: %B is 0 at the lower band and 1 at the upper;
    # bandwidth measures squeeze/expansion.
    bb_lower = numeric(out, "BB.lower")
    bb_upper = numeric(out, "BB.upper")
    bb_span = (bb_upper - bb_lower).replace(0, np.nan)
    out["bb_percent_b"] = (close - bb_lower) / bb_span
    mid = (bb_upper + bb_lower) / 2
    out["bb_bandwidth"] = _safe_ratio(bb_upper - bb_lower, mid) * 100

    # ATR as a percentage of price, so volatility is comparable across a $0.02
    # explorer and a $150 bank.
    atr = numeric(out, "ATR")
    out["atr_pct"] = _safe_ratio(atr, close) * 100

    # Intraday position and distance from VWAP.
    vwap = numeric(out, "VWAP")
    out["pct_vs_vwap"] = _safe_ratio(close - vwap, vwap) * 100

    day_high = numeric(out, "high")
    day_low = numeric(out, "low")
    day_span = (day_high - day_low).replace(0, np.nan)
    out["day_range_position"] = ((close - day_low) / day_span) * 100

    # Traded value matters more than share count when comparing across prices.
    out["turnover"] = numeric(out, "volume") * close

    # Valuation expressed as yields rather than ratios.
    #
    # This is the difference between a value screen that works and one that
    # doesn't. P/E is populated for only 32% of ASX common stocks - but that is
    # not missing data: 1,052 of the 1,101 nulls are companies with EPS <= 0.
    # The ASX is full of pre-revenue explorers, and a loss-making company has no
    # meaningful P/E. Inverting to earnings yield keeps them in: the value is
    # simply negative, it orders correctly against profitable peers, and
    # coverage rises from 32% to 97%.
    eps = numeric(out, "earnings_per_share_basic_ttm")
    out["earnings_yield"] = _safe_ratio(eps, close) * 100
    ones = pd.Series(1.0, index=out.index)
    out["book_yield"] = _safe_ratio(ones, numeric(out, "price_book_ratio")) * 100
    out["sales_yield"] = _safe_ratio(ones, numeric(out, "price_sales_ratio")) * 100

    # Leverage proxy. total_debt is 98.6% populated where enterprise value and
    # net income are effectively empty (0.6%), so this is the only balance-sheet
    # measure the feed actually supports.
    out["debt_to_market_cap"] = _safe_ratio(
        numeric(out, "total_debt_fq"),
        numeric(out, "market_cap_basic"),
    )

    out["is_profitable"] = eps > 0

    return out


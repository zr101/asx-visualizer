"""
Sector aggregates and rotation.

Two things worth knowing about the sector data:

1. The taxonomy is TradingView's (FactSet-style: "Non-Energy Minerals",
   "Miscellaneous"), not GICS. It is heavily skewed - 714 of ~2,200 listings sit
   in Non-Energy Minerals, reflecting how many junior miners the ASX carries.
2. Cap-weighted and equal-weighted sector returns answer different questions.
   Cap-weighted tells you what the sector did as an investment; equal-weighted
   tells you what the typical company in it did. On the ASX these diverge sharply
   because a handful of giants dominate several sectors, so both are reported.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .derived import numeric
from .session import Session

PERFORMANCE_WINDOWS = {
    "1d": "change",
    "1w": "Perf.W",
    "1m": "Perf.1M",
    "3m": "Perf.3M",
    "6m": "Perf.6M",
    "ytd": "Perf.YTD",
    "1y": "Perf.Y",
}

def _weighted_mean(values: pd.Series, weights: pd.Series) -> float | None:
    mask = values.notna() & weights.notna() & (weights > 0)
    if not mask.any():
        return None
    return float(np.average(values[mask], weights=weights[mask]))


def of(session: Session) -> pd.DataFrame:
    """Per-sector aggregates for one Session, over its Stocks universe.

    One row per sector with cap- and equal-weighted returns across every
    performance window, plus sector-level breadth.
    """
    stocks = session.stocks
    stocks = stocks[stocks["sector"].notna()]
    if stocks.empty:
        return pd.DataFrame()

    rows = []
    for sector, group in stocks.groupby("sector", sort=True):
        weights = numeric(group, "market_cap_basic")
        traded = group["traded"].fillna(False).astype(bool)
        # Masked by `traded`, and the denominator counts only listings that
        # traded - matching `breadth.of` exactly. These two were previously
        # computed differently and published side by side in one payload under
        # the same name.
        change = numeric(group, "change").where(traded)

        traded_count = int(traded.sum())
        row = {
            "sector": sector,
            "count": len(group),
            "traded_count": traded_count,
            "market_cap": float(weights.sum(skipna=True)),
            "advancers": int((change > 0).sum()),
            "decliners": int((change < 0).sum()),
        }
        row["advancing_pct"] = (
            round(100.0 * row["advancers"] / traded_count, 2) if traded_count else None
        )

        close = numeric(group, "close")
        sma200 = numeric(group, "SMA200")
        valid = close.notna() & sma200.notna()
        row["pct_above_sma200"] = (
            round(100.0 * float((close > sma200)[valid].sum()) / int(valid.sum()), 2)
            if valid.any() else None
        )

        for label, column in PERFORMANCE_WINDOWS.items():
            values = numeric(group, column)
            row[f"cap_weighted_{label}"] = _round(_weighted_mean(values, weights))
            row[f"equal_weighted_{label}"] = _round(
                float(values.mean()) if values.notna().any() else None
            )

        # Traded value gives a sense of where the day's attention actually went.
        turnover = numeric(group, "volume") * close
        row["turnover"] = float(turnover.sum(skipna=True))

        rows.append(row)

    out = pd.DataFrame(rows)
    total_cap = out["market_cap"].sum()
    out["market_cap_weight"] = (
        (out["market_cap"] / total_cap * 100).round(2) if total_cap else None
    )
    return out.sort_values("market_cap", ascending=False).reset_index(drop=True)


def rotation_table(sector_perf: pd.DataFrame) -> list[dict]:
    """Sectors ranked by each performance window - the rotation view.

    Reading across a row shows whether a sector's leadership is recent or
    sustained, which is the actual question in rotation analysis.
    """
    if sector_perf.empty:
        return []

    records = []
    for _, row in sector_perf.iterrows():
        entry = {"sector": row["sector"], "count": int(row["count"])}
        for label in PERFORMANCE_WINDOWS:
            entry[label] = row.get(f"cap_weighted_{label}")
        records.append(entry)

    # Rank within each window: 1 = best performing sector.
    frame = pd.DataFrame(records)
    for label in PERFORMANCE_WINDOWS:
        if label in frame.columns:
            frame[f"{label}_rank"] = frame[label].rank(ascending=False, method="min")
            frame[f"{label}_rank"] = frame[f"{label}_rank"].astype("Int64")

    return frame.to_dict(orient="records")


def _round(value, digits: int = 4):
    if value is None or (isinstance(value, float) and not np.isfinite(value)):
        return None
    return round(float(value), digits)

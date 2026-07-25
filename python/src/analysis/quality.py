"""
Data quality rules.

The source feed carries rows forward. When a security doesn't trade - and on the
ASX roughly 16% of common stocks don't on any given day - its row reappears
unchanged, still reporting the *previous* session's `change`. Taken at face
value, a stock that fell 4% once and then sat untraded for three days is counted
as a decliner three times.

The same thing happens at the level of whole days. Four of the 134 stored
snapshots are public holidays where the entire market is carried forward:

    2026-01-26  Australia Day       identical to 2026-01-23
    2026-04-03  Good Friday         identical to 2026-04-02
    2026-04-06  Easter Monday       identical to 2026-04-03
    2026-06-08  King's Birthday     identical to 2026-06-05

There are 130 real trading sessions in the archive, not 134. Every cumulative
series - the advance/decline line above all - is wrong unless these are dropped.
(The first snapshot, 2026-01-17, is also a Saturday: it holds Friday's close.)

None of this is visible in a single snapshot. It only appears once consecutive
days can be compared, which is the whole argument for keeping the history.
"""
from __future__ import annotations

import pandas as pd

from . import universe

# A day is a carried-forward copy if essentially every security is unchanged.
# Real consecutive sessions match at 24-33%; holidays match at 99.7-100%, so
# anything in between would be anomalous and the threshold is not delicate.
STALE_DAY_THRESHOLD = 0.90


def mark_traded(today: pd.DataFrame, yesterday: pd.DataFrame | None) -> pd.DataFrame:
    """Add a `traded` flag by comparing against the previous session.

    A security traded if either its close or its volume moved. Volume alone was
    a perfect discriminator on the days sampled, but both are checked because a
    genuinely unchanged close with new volume is a real (if unusual) session.

    With no previous day to compare against, everything is assumed to have
    traded - the first day of the archive has no baseline.
    """
    out = today.copy()

    if yesterday is None or yesterday.empty:
        out["traded"] = True
        return out

    prev = yesterday[["symbol", "close", "volume"]].rename(
        columns={"close": "_prev_close", "volume": "_prev_volume"}
    )
    out = out.merge(prev, on="symbol", how="left")

    unchanged = (
        (out["close"] == out["_prev_close"])
        & (out["volume"] == out["_prev_volume"])
    )
    # A symbol absent yesterday has no baseline, so it counts as traded.
    out["traded"] = ~unchanged.fillna(False)
    return out.drop(columns=["_prev_close", "_prev_volume"])


def is_stale_day(today: pd.DataFrame, yesterday: pd.DataFrame) -> tuple[bool, float]:
    """Whether an entire day is a carried-forward copy of the previous one.

    Returns (is_stale, match_fraction) so callers can log the evidence.
    """
    if today.empty or yesterday.empty:
        return False, 0.0

    a = universe.common_stocks(today).set_index("symbol")
    b = universe.common_stocks(yesterday).set_index("symbol")
    common = a.index.intersection(b.index)
    if len(common) == 0:
        return False, 0.0

    identical = (
        (a.loc[common, "close"] == b.loc[common, "close"])
        & (a.loc[common, "volume"] == b.loc[common, "volume"])
    )
    fraction = float(identical.mean())
    return fraction >= STALE_DAY_THRESHOLD, fraction


def find_stale_days(frames: dict) -> dict[str, str]:
    """Scan a {date: DataFrame} mapping for carried-forward days.

    Returns {stale_date: date_it_duplicates}.
    """
    stale: dict[str, str] = {}
    previous_date = None
    for date in sorted(frames):
        if previous_date is not None:
            flagged, _ = is_stale_day(frames[date], frames[previous_date])
            if flagged:
                stale[date] = previous_date
                continue  # don't use a stale day as the baseline for the next
        previous_date = date
    return stale


def add_true_return(today: pd.DataFrame, yesterday: pd.DataFrame | None) -> pd.DataFrame:
    """Compute `ret_1d` from our own consecutive closes rather than `change`.

    This is the column breadth should count, because it is null for securities
    that didn't trade instead of repeating a stale move.

    Note the closes are unadjusted, so a return spanning an ex-dividend date or a
    consolidation will contain that artefact; `change` from the source is
    adjusted. Where a clean multi-day return is needed, prefer the supplied
    `Perf.*` fields.
    """
    out = mark_traded(today, yesterday)

    if yesterday is None or yesterday.empty:
        out["ret_1d"] = pd.NA
        return out

    prev = yesterday[["symbol", "close"]].rename(columns={"close": "_prev_close"})
    out = out.merge(prev, on="symbol", how="left")

    ret = (out["close"] / out["_prev_close"] - 1) * 100
    out["ret_1d"] = ret.where(out["traded"])
    return out.drop(columns=["_prev_close"])


def presence_gaps(history: pd.DataFrame) -> pd.DataFrame:
    """Per-ticker count of days missing between first and last appearance.

    736 of 2,396 tickers have interior gaps, almost all caused by the unstable
    pagination sort rather than by real suspensions. That makes naive
    "delisted today" detection unreliable over the historical period - it would
    fire around a hundred false positives a day - so gaps are surfaced rather
    than interpreted.
    """
    if history.empty:
        return pd.DataFrame(columns=["symbol", "first_seen", "last_seen", "days_present", "gaps"])

    all_dates = sorted(history["date"].unique())
    index_of = {date: i for i, date in enumerate(all_dates)}

    rows = []
    for symbol, group in history.groupby("symbol"):
        dates = sorted(group["date"].unique())
        span = index_of[dates[-1]] - index_of[dates[0]] + 1
        rows.append({
            "symbol": symbol,
            "first_seen": dates[0],
            "last_seen": dates[-1],
            "days_present": len(dates),
            "gaps": span - len(dates),
        })

    return pd.DataFrame(rows).sort_values("gaps", ascending=False).reset_index(drop=True)


def coverage_report(df: pd.DataFrame, columns: list[str]) -> dict:
    """Non-null rate per column over common stocks, for display on /about."""
    stocks = universe.common_stocks(df)
    return {
        "universe": "common_stocks",
        "rows": len(stocks),
        "fields": {
            column: round(float(stocks[column].notna().mean()), 4)
            for column in columns
            if column in stocks.columns
        },
    }

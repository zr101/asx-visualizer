"""
Market breadth - how much of the market is participating in a move.

This is the module that justifies keeping six months of history. An index level
tells you where the market closed; breadth tells you whether that close was
earned by the whole market or by five large caps. On 2026-07-24 the ASX 200 sat
roughly flat year-to-date while only 23.7% of common stocks were above their
200-day average - a divergence invisible from the index alone.

All functions take a cross-section (one trading day) unless named `_series`,
which take the full history and return one row per date.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .archive import Archive
from .derived import numeric
from .session import Session


def of(session: Session) -> dict:
    """Breadth for one Session, over its Stocks universe.

    Counts come from the source `change` masked to listings that actually
    traded. On a typical day ~16% of common stocks do not trade, and ~150 of
    those still report a non-zero `change` carried over from their last
    session - counting those would inflate both advancers and decliners.

    Taking a Session rather than a frame is what makes that masking guaranteed:
    the `traded` fact is established at construction, so there is no longer a
    path into this function that skips it.
    """
    stocks = session.stocks
    if stocks.empty:
        return {}

    close = numeric(stocks, "close")
    volume = numeric(stocks, "volume")

    traded = stocks["traded"].fillna(False).astype(bool)

    # The source `change` is adjusted for splits and consolidations; a return
    # computed from our own unadjusted closes is not, and would read a 1-for-100
    # consolidation as a +6,249,900% gain. Masking it to rows that actually
    # traded removes the stale-carry-forward problem without giving up that
    # adjustment.
    change = numeric(stocks, "change").where(traded)

    advancers = int((change > 0).sum())
    decliners = int((change < 0).sum())
    unchanged = int(((change == 0) & traded).sum())
    untraded = int((~traded).sum())

    # Dollar volume, not share volume: ASX share counts are dominated by
    # sub-cent stocks, where a million shares is a few hundred dollars.
    dollar_volume = volume * close
    up_volume = float(dollar_volume[change > 0].sum())
    down_volume = float(dollar_volume[change < 0].sum())

    sma50 = numeric(stocks, "SMA50")
    sma200 = numeric(stocks, "SMA200")
    has50 = close.notna() & sma50.notna()
    has200 = close.notna() & sma200.notna()

    high52 = numeric(stocks, "price_52_week_high")
    low52 = numeric(stocks, "price_52_week_low")
    # A close at or through the extreme counts as a new high/low for the day.
    new_highs = int((close >= high52).sum())
    new_lows = int((close <= low52).sum())

    return {
        "advancers": advancers,
        "decliners": decliners,
        "unchanged": unchanged,
        "untraded": untraded,
        "advance_decline_ratio": _ratio(advancers, decliners),
        "advance_decline_net": advancers - decliners,
        "advancing_pct": _pct(advancers, advancers + decliners + unchanged),
        "traded_pct": _pct(int(traded.sum()), len(stocks)),
        "up_volume": up_volume,
        "down_volume": down_volume,
        "up_down_volume_ratio": _ratio(up_volume, down_volume),
        # The Arms Index: below 1 means advancing stocks are getting more than
        # their share of volume, i.e. the buying is where the gains are.
        "trin": _trin(advancers, decliners, up_volume, down_volume),
        "pct_above_sma50": _pct(int((close > sma50)[has50].sum()), int(has50.sum())),
        "pct_above_sma200": _pct(int((close > sma200)[has200].sum()), int(has200.sum())),
        "new_highs_52w": new_highs,
        "new_lows_52w": new_lows,
        "net_new_highs": new_highs - new_lows,
        "median_change": _finite(change.median()),
        "mean_change": _finite(change.mean()),
        "universe_size": len(stocks),
    }


def over(archive: Archive) -> pd.DataFrame:
    """Breadth for every Session in the Archive, plus cumulative measures.

    The cumulative advance/decline line is the headline output: a market where
    the index rises while the A/D line falls is being carried by a shrinking
    number of names. That `cumsum` is only meaningful because an Archive
    contains no carried-forward days - an invariant it now enforces itself.
    """
    if not len(archive):
        return pd.DataFrame()

    rows = []
    previous: Session | None = None
    for session in archive:
        stats = of(session)
        if not stats:
            continue
        stats["date"] = session.date
        stats["market_return"] = _index_return(previous, session) if previous else 0.0
        rows.append(stats)
        previous = session

    if not rows:
        return pd.DataFrame()

    out = pd.DataFrame(rows).sort_values("date").reset_index(drop=True)
    out["ad_line"] = out["advance_decline_net"].cumsum()
    out["net_new_highs_line"] = out["net_new_highs"].cumsum()

    # A cap-weighted index built from the constituents themselves, rebased to 100.
    # The real XJO is only captured from the day index collection was added, so
    # this is what allows the whole archive to be charted against a benchmark.
    # It is not the ASX 200: it covers all common stocks and is not free-float
    # adjusted, and it is labelled as such wherever it is shown.
    out["market_index"] = (
        (1 + out["market_return"].fillna(0) / 100).cumprod() * 100
    ).round(3)

    # 10-day smoothing makes the participation trend legible through daily noise.
    out["pct_above_sma200_ma10"] = out["pct_above_sma200"].rolling(10, min_periods=1).mean()
    out["advancing_pct_ma10"] = out["advancing_pct"].rolling(10, min_periods=1).mean()

    return out


def _index_return(previous: Session, current: Session) -> float | None:
    """Cap-weighted index return between two sessions, using prior-day weights.

    Two corrections make this track reality, and it is badly wrong without both:

    - Only securities that actually traded are counted. Otherwise ~16% of rows
      contribute a repeat of their last move every day.
    - The source's adjusted `change` is used rather than a return computed from
      our own closes, which are unadjusted. Aspermont's 1-for-N consolidation
      shows up in our closes as +6,249,900%; the source correctly reports 0.00%.

    With both applied this returns -1.27% over the archive, against -0.83% for a
    fixed basket held start to finish and -0.86% for the actual ASX 200 over the
    same window. The remaining gap is genuine constituent turnover.
    """
    a = previous.stocks.set_index("symbol")
    b = current.stocks.set_index("symbol")

    common = a.index.intersection(b.index)
    if len(common) == 0:
        return None

    weights = pd.to_numeric(a.loc[common, "market_cap_basic"], errors="coerce")
    traded = b.loc[common, "traded"].fillna(False).astype(bool)
    returns = pd.to_numeric(b.loc[common, "change"], errors="coerce").where(traded)

    mask = returns.notna() & np.isfinite(returns) & weights.notna() & (weights > 0)
    if not mask.any():
        return None
    return round(float(np.average(returns[mask], weights=weights[mask])), 4)


def _trin(advancers: int, decliners: int, up_volume: float, down_volume: float) -> float | None:
    if not decliners or not down_volume or not up_volume:
        return None
    return round((advancers / decliners) / (up_volume / down_volume), 4)


def _ratio(numerator: float, denominator: float) -> float | None:
    if not denominator:
        return None
    return round(float(numerator) / float(denominator), 4)


def _pct(numerator: int, denominator: int) -> float | None:
    if not denominator:
        return None
    return round(100.0 * numerator / denominator, 2)


def _finite(value) -> float | None:
    if value is None or not np.isfinite(value):
        return None
    return round(float(value), 4)

"""
Day-over-day event detection.

This is what makes the site worth opening daily rather than occasionally. A
single snapshot can tell you a stock's RSI is 29; only two consecutive snapshots
can tell you it *crossed below* 30 today, which is the part a reader acts on.

Every signal here needs yesterday's cross-section as well as today's, so none of
it was computable before the history was loadable.
"""
from __future__ import annotations

import pandas as pd

from .derived import numeric
from .session import Session

# Signals are ordered by how much they usually matter to a reader, so the UI can
# take a meaningful "top N" without further sorting.
SIGNAL_PRIORITY = [
    "golden_cross",
    "death_cross",
    "new_52w_high",
    "new_52w_low",
    "crossed_above_sma200",
    "crossed_below_sma200",
    "rsi_oversold",
    "rsi_overbought",
    "rsi_exit_oversold",
    "rsi_exit_overbought",
    "macd_bullish_cross",
    "macd_bearish_cross",
    "unusual_volume",
    "gap_up",
    "gap_down",
    "new_listing",
    "delisted",
]

SIGNAL_LABELS = {
    "golden_cross": "Golden cross (50DMA crossed above 200DMA)",
    "death_cross": "Death cross (50DMA crossed below 200DMA)",
    "new_52w_high": "New 52-week high",
    "new_52w_low": "New 52-week low",
    "crossed_above_sma200": "Reclaimed its 200-day average",
    "crossed_below_sma200": "Lost its 200-day average",
    "rsi_oversold": "RSI crossed below 30 (oversold)",
    "rsi_overbought": "RSI crossed above 70 (overbought)",
    "rsi_exit_oversold": "RSI recovered back above 30",
    "rsi_exit_overbought": "RSI fell back below 70",
    "macd_bullish_cross": "MACD crossed above its signal line",
    "macd_bearish_cross": "MACD crossed below its signal line",
    "unusual_volume": "Unusual volume (2x its 10-day average)",
    "gap_up": "Gapped up at the open",
    "gap_down": "Gapped down at the open",
    "new_listing": "New to the ASX universe",
    "delisted": "No longer in the ASX universe",
}

UNUSUAL_VOLUME_MULTIPLE = 2.0
GAP_THRESHOLD_PCT = 5.0


def _aligned(today: pd.DataFrame, yesterday: pd.DataFrame) -> pd.DataFrame:
    """Join the two days on symbol, suffixing yesterday's columns with `_prev`."""
    keep_prev = [
        "symbol", "close", "RSI", "SMA50", "SMA200",
        "MACD.macd", "MACD.signal", "price_52_week_high", "price_52_week_low",
    ]
    prev = yesterday[[c for c in keep_prev if c in yesterday.columns]].copy()
    prev = prev.rename(columns={c: f"{c}_prev" for c in prev.columns if c != "symbol"})
    return today.merge(prev, on="symbol", how="inner")


def between(previous: Session, current: Session) -> pd.DataFrame:
    """Signals fired between two Adjacent Sessions - one row per (symbol, signal).

    Both sides are the Liquid universe: a crossover on a listing that trades
    twice a week is an artefact, not an event. Listings that did not trade are
    dropped for the same reason - their rows are carried forward by the feed,
    so any "crossing" is the previous session's number being repeated.

    Adjacency is the caller's guarantee, and only an Archive can give it. A
    signal computed across a gap would report a multi-day move as today's.
    """
    today, yesterday = current.liquid, previous.liquid
    if today.empty or yesterday.empty:
        return pd.DataFrame(columns=["symbol", "signal", "label"])

    today = today[today["traded"].fillna(False).astype(bool)]

    merged = _aligned(today, yesterday)
    if merged.empty:
        return pd.DataFrame(columns=["symbol", "signal", "label"])

    # Index-aligned reads: a missing column would otherwise collapse to a scalar
    # and turn every comparison below into a bare bool.
    def num(column: str) -> pd.Series:
        return numeric(merged, column)

    close, close_prev = num("close"), num("close_prev")
    rsi, rsi_prev = num("RSI"), num("RSI_prev")
    sma50, sma50_prev = num("SMA50"), num("SMA50_prev")
    sma200, sma200_prev = num("SMA200"), num("SMA200_prev")
    macd, macd_prev = num("MACD.macd"), num("MACD.macd_prev")
    macd_sig, macd_sig_prev = num("MACD.signal"), num("MACD.signal_prev")
    high52, high52_prev = num("price_52_week_high"), num("price_52_week_high_prev")
    low52, low52_prev = num("price_52_week_low"), num("price_52_week_low_prev")
    rel_volume = num("relative_volume_10d_calc")
    change = num("change")

    conditions = {
        "golden_cross": (sma50 > sma200) & (sma50_prev <= sma200_prev),
        "death_cross": (sma50 < sma200) & (sma50_prev >= sma200_prev),
        # A genuinely new extreme: the 52-week high itself moved up today.
        "new_52w_high": (high52 > high52_prev) & (close >= high52),
        "new_52w_low": (low52 < low52_prev) & (close <= low52),
        "crossed_above_sma200": (close > sma200) & (close_prev <= sma200_prev),
        "crossed_below_sma200": (close < sma200) & (close_prev >= sma200_prev),
        "rsi_oversold": (rsi < 30) & (rsi_prev >= 30),
        "rsi_overbought": (rsi > 70) & (rsi_prev <= 70),
        "rsi_exit_oversold": (rsi > 30) & (rsi_prev <= 30),
        "rsi_exit_overbought": (rsi < 70) & (rsi_prev >= 70),
        "macd_bullish_cross": (macd > macd_sig) & (macd_prev <= macd_sig_prev),
        "macd_bearish_cross": (macd < macd_sig) & (macd_prev >= macd_sig_prev),
        "unusual_volume": rel_volume >= UNUSUAL_VOLUME_MULTIPLE,
        "gap_up": change >= GAP_THRESHOLD_PCT,
        "gap_down": change <= -GAP_THRESHOLD_PCT,
    }

    context_columns = [
        c for c in ["symbol", "name", "description", "sector", "close", "change",
                    "volume", "relative_volume_10d_calc", "RSI", "market_cap_basic"]
        if c in merged.columns
    ]

    frames = []
    for signal, mask in conditions.items():
        mask = pd.Series(mask, index=merged.index).fillna(False).astype(bool)
        if not mask.any():
            continue
        hits = merged.loc[mask, context_columns].copy()
        hits["signal"] = signal
        hits["label"] = SIGNAL_LABELS[signal]
        frames.append(hits)

    if not frames:
        return pd.DataFrame(columns=["symbol", "signal", "label"])

    out = pd.concat(frames, ignore_index=True)
    out["priority"] = out["signal"].map({s: i for i, s in enumerate(SIGNAL_PRIORITY)})
    return out.sort_values(["priority", "market_cap_basic"], ascending=[True, False]) \
              .reset_index(drop=True)


def universe_changes(today: pd.DataFrame, yesterday: pd.DataFrame) -> dict:
    """Listings that appeared or disappeared between two days.

    Worth tracking for its own sake, and it is also what makes this archive
    survivorship-bias free: the tickers that leave are recorded, not erased.
    """
    if today.empty or yesterday.empty:
        return {"new_listings": [], "delistings": []}

    now = set(today["symbol"])
    before = set(yesterday["symbol"])

    def describe(frame: pd.DataFrame, symbols: set) -> list[dict]:
        subset = frame[frame["symbol"].isin(symbols)]
        columns = [c for c in ["symbol", "name", "description", "sector", "close"]
                   if c in subset.columns]
        return subset[columns].to_dict(orient="records")

    return {
        "new_listings": describe(today, now - before),
        "delistings": describe(yesterday, before - now),
    }


def summarise(signal_rows: pd.DataFrame) -> dict[str, int]:
    """Count per signal type, ordered by priority."""
    if signal_rows.empty:
        return {}
    counts = signal_rows["signal"].value_counts().to_dict()
    return {s: int(counts[s]) for s in SIGNAL_PRIORITY if s in counts}

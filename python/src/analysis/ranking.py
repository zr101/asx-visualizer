"""
Cross-sectional ranking.

A raw metric is hard to judge: is an RSI of 61 high? Is a P/E of 18 cheap for
this market? Percentile ranks answer that by scoring every stock against its
peers on the same day, which is also what makes factor scores comparable across
sectors and across time.

Two deliberate choices:

- Ranks are computed over the *populated* subset and the coverage is reported
  alongside. A "value score" derived from the 32% of ASX stocks that report
  earnings is a legitimate number, but only if the reader knows that's what it is.
- Ranking is done within the liquid universe by default. Illiquid microcaps
  produce extreme values on every momentum and volatility measure, and letting
  them set the percentile boundaries compresses everything else into the middle.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .session import Session

# Factor definitions. `higher_is_better` records the direction so a single
# ranking routine can serve momentum (more is better) and value (less is better).
FACTOR_DEFINITIONS = {
    "momentum": [
        ("Perf.1M", True),
        ("Perf.3M", True),
        ("Perf.6M", True),
        ("pct_from_52w_high", True),
    ],
    # Yields, not ratios. See derived.py: P/E covers 32% of ASX common stocks
    # because two-thirds of them lose money, while earnings yield covers 97% and
    # still orders loss-makers correctly (below every profitable company).
    "value": [
        ("earnings_yield", True),
        ("book_yield", True),
        ("sales_yield", True),
    ],
    "income": [
        ("dividend_yield_recent", True),
    ],
    "trend": [
        ("pct_vs_sma50", True),
        ("pct_vs_sma200", True),
        ("ADX", True),
    ],
    "volatility": [
        ("Volatility.D", False),
        ("atr_pct", False),
        ("beta_1_year", False),
    ],
}


RS_WINDOWS = {
    "1w": ("Perf.W", 0.15),
    "1m": ("Perf.1M", 0.25),
    "3m": ("Perf.3M", 0.30),
    "6m": ("Perf.6M", 0.20),
    "1y": ("Perf.Y", 0.10),
}


def percentile_rank(series: pd.Series, higher_is_better: bool = True) -> pd.Series:
    """Percentile rank in 0-100, computed over non-null values only.

    Nulls stay null rather than being imputed to the median - a stock with no
    reported P/E is not an average-valued stock, it is an unknown one.
    """
    values = pd.to_numeric(series, errors="coerce")
    if values.notna().sum() < 2:
        return pd.Series(np.nan, index=series.index, dtype="float64")
    ranked = values.rank(pct=True, ascending=higher_is_better) * 100
    return ranked.round(2)


def add_percentile_ranks(
    df: pd.DataFrame,
    columns: dict[str, bool] | None = None,
    suffix: str = "_pct_rank",
) -> pd.DataFrame:
    """Append percentile-rank columns for the given metrics."""
    if columns is None:
        columns = {
            column: higher
            for definition in FACTOR_DEFINITIONS.values()
            for column, higher in definition
        }

    out = df.copy()
    for column, higher_is_better in columns.items():
        if column in out.columns:
            out[f"{column}{suffix}"] = percentile_rank(out[column], higher_is_better)
    return out


def zscore(series: pd.Series, clip: float = 3.0) -> pd.Series:
    """Standard score, winsorised at +/- `clip` standard deviations.

    Clipping matters here: a shell company up 500% would otherwise dominate any
    composite it appears in.
    """
    values = pd.to_numeric(series, errors="coerce")
    std = values.std()
    if not std or not np.isfinite(std):
        return pd.Series(np.nan, index=series.index, dtype="float64")
    return ((values - values.mean()) / std).clip(-clip, clip)


def factor_scores(df: pd.DataFrame) -> pd.DataFrame:
    """Composite 0-100 factor scores, one column per factor.

    Each factor averages the percentile ranks of its components. A stock scores
    only if it has at least one component populated; the count of contributing
    components is retained so thin scores can be distinguished from complete ones.
    """
    out = df.copy()

    for factor, components in FACTOR_DEFINITIONS.items():
        ranks = []
        for column, higher_is_better in components:
            if column in out.columns:
                ranks.append(percentile_rank(out[column], higher_is_better))

        if not ranks:
            out[f"{factor}_score"] = np.nan
            out[f"{factor}_inputs"] = 0
            continue

        stacked = pd.concat(ranks, axis=1)
        out[f"{factor}_score"] = stacked.mean(axis=1, skipna=True).round(2)
        out[f"{factor}_inputs"] = stacked.notna().sum(axis=1).astype(int)

    return out


def rank_within_sector(
    df: pd.DataFrame,
    column: str,
    higher_is_better: bool = True,
) -> pd.Series:
    """Percentile rank of a metric within each stock's own sector.

    A miner's momentum is more informative measured against other miners than
    against the whole market.
    """
    if column not in df.columns or "sector" not in df.columns:
        return pd.Series(np.nan, index=df.index, dtype="float64")

    return (
        df.groupby("sector", dropna=False)[column]
        .transform(lambda s: percentile_rank(s, higher_is_better))
    )


def add_rs_rating(df: pd.DataFrame) -> pd.DataFrame:
    """Append the 1-99 RS rating.

    Relative strength has two halves and they are different measures. This is
    the cross-sectional one: it ranks a listing's blended performance against
    every other listing in the same Universe, and needs no benchmark at all -
    which is why it belongs here rather than in `relative_strength`, whose
    subject is excess return over an index.
    """
    out = df.copy()
    out["rs_rating"] = _rs_rating(out)
    return out


def _rs_rating(df: pd.DataFrame) -> pd.Series:
    """Weighted blend of performance windows, rescaled to 1-99.

    Percentile-ranks each window first so that a single extreme window cannot
    dominate the blend, then ranks the blend itself.
    """
    weighted = pd.Series(0.0, index=df.index)
    total_weight = pd.Series(0.0, index=df.index)

    for column, weight in RS_WINDOWS.values():
        if column not in df.columns:
            continue
        window_rank = percentile_rank(df[column], higher_is_better=True)
        present = window_rank.notna()
        weighted[present] += window_rank[present] * weight
        total_weight[present] += weight

    blended = pd.Series(np.nan, index=df.index, dtype="float64")
    usable = total_weight > 0
    blended[usable] = weighted[usable] / total_weight[usable]

    if blended.notna().sum() < 2:
        return blended

    # Rescale the blend to 1-99 so the output reads as a rating, not a percentile.
    rating = blended.rank(pct=True) * 98 + 1
    return rating.round(0)


def of(session: Session) -> pd.DataFrame:
    """Cross-sectional scores for one Session, over its Liquid universe.

    Returns symbol plus the score columns, ready to join back onto the full
    listing set - non-liquid listings get no score rather than a misleading one.
    Ranking a $2,000-a-day shell against BHP produces a percentile that
    describes nothing, which is why the population is stated rather than implied.
    """
    liquid = session.liquid
    if liquid.empty:
        return pd.DataFrame(columns=["symbol"])

    scored = factor_scores(liquid)
    scored = add_rs_rating(scored)
    columns = ["symbol"] + [
        c for c in scored.columns if c.endswith(("_score", "_inputs", "_rating"))
    ]
    return scored[columns]


def factor_coverage(df: pd.DataFrame) -> dict[str, dict]:
    """Per-factor input coverage, for honest display alongside the scores."""
    report = {}
    for factor, components in FACTOR_DEFINITIONS.items():
        inputs = {}
        for column, _ in components:
            inputs[column] = (
                round(float(df[column].notna().mean()), 4) if column in df.columns else 0.0
            )
        report[factor] = {
            "inputs": inputs,
            "scored": (
                int(df[f"{factor}_score"].notna().sum())
                if f"{factor}_score" in df.columns else 0
            ),
        }
    return report

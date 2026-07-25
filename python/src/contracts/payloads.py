"""
The published data contract, declared once.

Every file under `frontend/public/data/` has exactly one model here, and these
models are the only definition of those shapes. TypeScript types are generated
from them, so a field renamed in Python becomes a frontend compile error rather
than a column of en-dashes.

That failure mode was not hypothetical. Before this existed, the hand-written
TypeScript declared three fields on the breadth series that were never emitted,
declared `advancers` on pulse sectors where the payload omitted it, and omitted
the `*_rank` fields that drive the entire rotation-table shading. All three
type-checked and none of them raised.

Note the field names here are the *sanitised* ones (`Perf_W`, not `Perf.W`) -
this describes the wire format, not the store.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Scalar = float | int | str | bool | None


class Payload(BaseModel):
    """Base for every published file. Extra fields are a contract violation."""

    model_config = ConfigDict(extra="forbid")


class Columnar(Payload):
    """Parallel arrays keyed by field name.

    Used for the row-heavy payloads: with ~2,100 rows the repeated JSON keys of
    an array-of-objects would be more than half the file.
    """

    n: int
    fields: list[str]
    columns: dict[str, list[Scalar]]


class UniverseCounts(Payload):
    total_listings: int
    common_stocks: int
    funds_and_etfs: int
    other: int
    liquid_stocks: int


class BreadthReading(Payload):
    """Breadth for one Session, over its Stocks universe."""

    advancers: int
    decliners: int
    unchanged: int
    untraded: int
    advance_decline_ratio: float | None
    advance_decline_net: int
    advancing_pct: float | None
    traded_pct: float | None
    up_volume: float
    down_volume: float
    up_down_volume_ratio: float | None
    trin: float | None
    pct_above_sma50: float | None
    pct_above_sma200: float | None
    new_highs_52w: int
    new_lows_52w: int
    net_new_highs: int
    median_change: float | None
    mean_change: float | None
    universe_size: int


class IndexQuote(Payload):
    symbol: str
    description: str | None
    close: float | None
    change: float | None
    Perf_W: float | None
    Perf_1M: float | None
    Perf_3M: float | None
    Perf_6M: float | None
    Perf_YTD: float | None
    Perf_Y: float | None


class SectorRow(Payload):
    """One sector's aggregates for a Session.

    `traded_count` is the denominator behind `advancing_pct`, stated rather than
    implied - the two Readings that report participation used to disagree
    because one counted untraded listings and the other did not.
    """

    sector: str
    count: int
    traded_count: int
    market_cap: float
    market_cap_weight: float | None
    advancers: int
    decliners: int
    advancing_pct: float | None
    pct_above_sma200: float | None
    turnover: float
    cap_weighted_1d: float | None = None
    cap_weighted_1w: float | None = None
    cap_weighted_1m: float | None = None
    cap_weighted_3m: float | None = None
    cap_weighted_6m: float | None = None
    cap_weighted_ytd: float | None = None
    cap_weighted_1y: float | None = None
    equal_weighted_1d: float | None = None
    equal_weighted_1w: float | None = None
    equal_weighted_1m: float | None = None
    equal_weighted_3m: float | None = None
    equal_weighted_6m: float | None = None
    equal_weighted_ytd: float | None = None
    equal_weighted_1y: float | None = None


class RotationRow(Payload):
    """A sector's return in each window, with its rank in that window.

    The ranks drive the shading in the rotation table and were previously
    undeclared on the frontend, reachable only through an index signature that
    also made every typo compile.
    """

    sector: str
    count: int
    d1: float | None = Field(default=None, alias="1d")
    w1: float | None = Field(default=None, alias="1w")
    m1: float | None = Field(default=None, alias="1m")
    m3: float | None = Field(default=None, alias="3m")
    m6: float | None = Field(default=None, alias="6m")
    ytd: float | None = None
    y1: float | None = Field(default=None, alias="1y")
    d1_rank: int | None = Field(default=None, alias="1d_rank")
    w1_rank: int | None = Field(default=None, alias="1w_rank")
    m1_rank: int | None = Field(default=None, alias="1m_rank")
    m3_rank: int | None = Field(default=None, alias="3m_rank")
    m6_rank: int | None = Field(default=None, alias="6m_rank")
    ytd_rank: int | None = None
    y1_rank: int | None = Field(default=None, alias="1y_rank")

    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class Mover(Payload):
    symbol: str
    name: str | None
    description: str | None
    sector: str | None
    close: float | None
    change: float | None
    volume: float | None
    turnover: float | None
    relative_volume_10d_calc: float | None
    market_cap_basic: float | None


class SignalRow(Payload):
    """A listing that fired a signal.

    Deliberately not a subclass of Mover: signal rows carry RSI but no
    `turnover`. The frontend declared exactly that inheritance and it
    type-checked, because nothing verified the declaration against the payload.
    """

    symbol: str
    name: str | None
    description: str | None
    sector: str | None
    close: float | None
    change: float | None
    volume: float | None
    relative_volume_10d_calc: float | None
    RSI: float | None
    market_cap_basic: float | None


class SignalGroup(Payload):
    label: str
    total: int
    rows: list[SignalRow]


class ListingRef(Payload):
    symbol: str
    name: str | None
    description: str | None
    sector: str | None
    close: float | None


class UniverseChanges(Payload):
    new_listings: list[ListingRef]
    delistings: list[ListingRef]


# --- Files ---------------------------------------------------------------


class ManifestFile(Payload):
    latest_date: str
    previous_date: str | None
    sessions: list[str]
    session_count: int
    universe: UniverseCounts
    files: list[str]


class ScreenerRow(Payload):
    """One unpacked screener row.

    The wire format is columnar, so this shape never appears in the JSON - but
    it is what the frontend reconstructs, and it is the only screener type the
    UI actually programs against. Declaring it here keeps `SCREENER_FIELDS` and
    the frontend row type from drifting; a test asserts the two agree.
    """

    symbol: str
    name: str | None
    description: str | None
    sector: str | None
    industry: str | None
    close: float | None
    change: float | None
    volume: float | None
    market_cap_basic: float | None
    RSI: float | None
    ADX: float | None
    Perf_W: float | None
    Perf_1M: float | None
    Perf_3M: float | None
    Perf_6M: float | None
    Perf_YTD: float | None
    Perf_Y: float | None
    price_earnings_ttm: float | None
    price_book_ratio: float | None
    dividend_yield_recent: float | None
    earnings_per_share_basic_ttm: float | None
    beta_1_year: float | None
    total_revenue_ttm: float | None
    relative_volume_10d_calc: float | None
    average_volume_30d_calc: float | None
    VWAP: float | None
    ATR: float | None
    SMA20: float | None
    SMA50: float | None
    SMA200: float | None
    Volatility_D: float | None
    Recommend_All: float | None
    price_52_week_high: float | None
    price_52_week_low: float | None
    pct_from_52w_high: float | None
    range_position_52w: float | None
    pct_vs_sma50: float | None
    pct_vs_sma200: float | None
    earnings_yield: float | None
    book_yield: float | None
    atr_pct: float | None
    turnover: float | None
    is_profitable: bool | None
    momentum_score: float | None
    value_score: float | None
    income_score: float | None
    trend_score: float | None
    volatility_score: float | None
    rs_rating: float | None


class ScreenerFile(Columnar):
    date: str


class BreadthFile(Columnar):
    """The daily breadth series. Columnar because it is one row per session."""


class SectorsFile(Payload):
    date: str
    latest: list[SectorRow]
    rotation: list[RotationRow]


class SignalsFile(Payload):
    date: str
    counts: dict[str, int]
    signals: dict[str, SignalGroup]
    universe_changes: UniverseChanges | None = None


class PulseFile(Payload):
    date: str
    previous_date: str | None
    breadth: BreadthReading
    universe: UniverseCounts
    indices: list[IndexQuote]
    sectors: list[SectorRow]
    gainers: list[Mover]
    losers: list[Mover]
    most_active: list[Mover]
    unusual_volume: list[Mover]
    signal_counts: dict[str, int]


class ArchiveProvenance(Payload):
    sessions: int
    first_session: str
    latest_session: str
    ticker_days: int
    distinct_tickers: int


class FieldCoverage(Payload):
    universe: Literal["common_stocks"]
    rows: int
    fields: dict[str, float]


class FactorCoverage(Payload):
    inputs: dict[str, float]
    scored: int


class CoverageFile(Payload):
    generated_from: ArchiveProvenance
    coverage: FieldCoverage
    factor_coverage: dict[str, FactorCoverage]
    tickers_with_gaps: int
    tickers_complete: int


#: Every published file, mapped to the model that defines it. Schema export and
#: the TypeScript generator both walk this, so adding a file here is the single
#: edit needed to bring it under the contract.
PUBLISHED: dict[str, type[Payload]] = {
    "manifest": ManifestFile,
    "screener": ScreenerFile,
    "breadth": BreadthFile,
    "sectors": SectorsFile,
    "signals": SignalsFile,
    "pulse": PulseFile,
    "coverage": CoverageFile,
    "screener_row": ScreenerRow,
}

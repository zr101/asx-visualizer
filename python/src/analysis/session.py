"""
A Session: one trading day's cross-section, with its row-local facts established.

The analysis modules used to take a bare DataFrame, which made the real interface
"a frame that has already been through these functions, in this order" - a rule
that lived only in prose. Getting it wrong did not raise; it produced a plausible
wrong number. `breadth.daily_breadth` fell back to treating every row as traded,
silently restoring the carried-forward-row bug it was written to fix, and
`ranking.factor_scores` skipped missing inputs to yield a momentum score built on
three of its four components, correctly scaled and wrong.

A Session can only be constructed one way, and every Reading takes a Session, so
that ordering is no longer something a caller can get wrong.
"""
from __future__ import annotations

from functools import cached_property

import pandas as pd

from . import derived, quality, universe


class Session:
    """One trading day. Build via `Session.build` or, normally, via an Archive.

    The frame reachable through this object has always had its row-local facts
    established. The raw pre-enrichment frame is not part of the interface.
    """

    def __init__(self, date: str, frame: pd.DataFrame) -> None:
        self._date = date
        self._frame = frame

    @classmethod
    def build(cls, day: pd.DataFrame, previous: pd.DataFrame | None = None) -> Session:
        """Establish the row-local facts for one day's listings.

        `previous` is the preceding Session's frame, needed to decide which
        listings actually traded. Without it every listing is assumed to have
        traded, which is only correct for the first day of the archive.
        """
        date = cls._date_of(day)
        frame = quality.add_true_return(day, previous)
        frame = derived.add_derived(frame)
        return cls(date, frame)

    @staticmethod
    def _date_of(day: pd.DataFrame) -> str:
        if "date" not in day.columns or day.empty:
            return ""
        return str(day["date"].iloc[0])

    @property
    def date(self) -> str:
        return self._date

    # --- Universes -------------------------------------------------------
    # Cached because a single publish run previously recomputed the liquid
    # universe three times over the same frame.

    @property
    def all(self) -> pd.DataFrame:
        """Every listing, including funds, ETFs and depositary receipts."""
        return self._frame

    @cached_property
    def stocks(self) -> pd.DataFrame:
        """Common stocks - the correct denominator for market statistics."""
        return universe.common_stocks(self._frame)

    @cached_property
    def liquid(self) -> pd.DataFrame:
        """Common stocks clearing the turnover floor."""
        return universe.liquid(self.stocks)

    def composition(self) -> dict:
        """How the session's listings divide across the universes."""
        return universe.summarise(self._frame)

    def __len__(self) -> int:
        return len(self._frame)

    def __repr__(self) -> str:
        return f"<Session {self._date} listings={len(self._frame)} stocks={len(self.stocks)}>"

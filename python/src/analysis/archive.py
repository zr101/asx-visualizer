"""
An Archive: the ordered sequence of Sessions, and the only thing that can say
two Sessions are adjacent.

Two invariants used to live outside `src/` entirely, enforced by the two scripts
that write the store and asserted nowhere near the code that depends on them:

  1. Carried-forward days are not Sessions. `breadth.over` runs `cumsum` on the
     advance/decline line, which double-counts a day's advances if a public
     holiday copy is present. `parquet_store.write_day` is public and accepts
     any frame, so nothing structurally prevented one.

  2. A Signal compares adjacent Sessions. The publish step used to take
     `dates[-2]` as "yesterday", so across a gap in the archive a multi-day move
     would be reported as having crossed today.

Both now live here, next to the readings that rely on them.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from . import quality
from .session import Session


class Archive:
    """An ordered run of Sessions with no carried-forward days between them."""

    def __init__(
        self,
        frames: dict[str, pd.DataFrame],
        excluded: dict[str, str] | None = None,
    ) -> None:
        self._frames = frames
        self._dates = sorted(frames)
        self._excluded = excluded or {}
        self._cache: dict[str, Session] = {}

    @classmethod
    def of(cls, frames: dict[str, pd.DataFrame]) -> Archive:
        """Build from raw daily frames, dropping carried-forward days.

        The store already excludes them at write time, so this normally removes
        nothing - but it turns an assumption into a check, at the place that
        depends on it.
        """
        normalised = {str(date): frame for date, frame in frames.items()}
        excluded = quality.find_stale_days(normalised)
        kept = {d: f for d, f in normalised.items() if d not in excluded}
        return cls(kept, excluded)

    @classmethod
    def load(
        cls,
        root: Path | None = None,
        start: str | None = None,
        end: str | None = None,
    ) -> Archive:
        from src.storage import parquet_store

        history = parquet_store.load_history(root=root, start=start, end=end)
        if history.empty:
            return cls({})
        return cls.of({str(date): group for date, group in history.groupby("date")})

    @classmethod
    def from_history(cls, history: pd.DataFrame) -> Archive:
        """Build from an already-loaded history frame."""
        if history.empty:
            return cls({})
        return cls.of({str(date): group for date, group in history.groupby("date")})

    # --- Sessions --------------------------------------------------------
    # Built on demand and cached: loading the archive should not cost the
    # enrichment of every day when a caller only wants the latest two.

    @property
    def dates(self) -> list[str]:
        return list(self._dates)

    @property
    def excluded_days(self) -> dict[str, str]:
        """Carried-forward days that were dropped, mapped to the day they copy."""
        return dict(self._excluded)

    def session(self, date: str) -> Session:
        if date not in self._frames:
            raise KeyError(f"{date} is not a session in this archive")
        if date not in self._cache:
            position = self._dates.index(date)
            previous = self._frames[self._dates[position - 1]] if position else None
            self._cache[date] = Session.build(self._frames[date], previous)
        return self._cache[date]

    @property
    def sessions(self) -> list[Session]:
        """Every Session, oldest first. Builds all of them."""
        return [self.session(date) for date in self._dates]

    @property
    def latest(self) -> Session:
        if not self._dates:
            raise ValueError("archive is empty")
        return self.session(self._dates[-1])

    def pair(self, index: int = -1) -> tuple[Session, Session]:
        """The Session at `index` and the one immediately before it.

        Adjacency is guaranteed by construction rather than assumed, which is
        what makes the result safe to compute a Signal from.
        """
        if len(self._dates) < 2:
            raise ValueError("archive has fewer than two sessions")
        position = index if index >= 0 else len(self._dates) + index
        if position < 1:
            raise ValueError(f"no session precedes index {index}")
        return self.session(self._dates[position - 1]), self.session(self._dates[position])

    def __len__(self) -> int:
        return len(self._dates)

    def __iter__(self):
        return iter(self.sessions)

    def __repr__(self) -> str:
        span = f"{self._dates[0]}..{self._dates[-1]}" if self._dates else "empty"
        return f"<Archive {len(self._dates)} sessions {span}>"

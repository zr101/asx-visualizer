"""Shared fixtures.

The frames here are deliberately tiny and hand-written so expected values can be
verified by eye. A five-stock, three-day fixture where you can count the
advancers yourself is worth more than a large mocked one.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.analysis.archive import Archive  # noqa: E402
from src.analysis.session import Session  # noqa: E402


def make_day(rows: list[dict]) -> pd.DataFrame:
    """Build a cross-section, filling unspecified columns with sane defaults."""
    defaults = {
        "type": "stock",
        # Present on every real snapshot; the payload models require them, and a
        # fixture without them tests a shape production never produces.
        "name": "TEST",
        "description": "Test Company Ltd",
        "industry": "Testing",
        "close": 10.0,
        "open": 10.0,
        "high": 10.0,
        "low": 10.0,
        "volume": 1_000_000.0,
        "change": 0.0,
        "market_cap_basic": 1e9,
        "sector": "Finance",
        "average_volume_30d_calc": 1_000_000.0,
        "relative_volume_10d_calc": 1.0,
    }
    return pd.DataFrame([{**defaults, **row} for row in rows])


@pytest.fixture
def day_one() -> pd.DataFrame:
    return make_day([
        {"symbol": "A", "close": 100.0, "volume": 1000.0, "change": 1.0,
         "SMA50": 90.0, "SMA200": 80.0, "RSI": 55.0,
         "price_52_week_high": 110.0, "price_52_week_low": 50.0},
        {"symbol": "B", "close": 50.0, "volume": 2000.0, "change": -2.0,
         "SMA50": 55.0, "SMA200": 60.0, "RSI": 35.0,
         "price_52_week_high": 80.0, "price_52_week_low": 45.0},
        {"symbol": "C", "close": 20.0, "volume": 500.0, "change": 0.0,
         "SMA50": 20.0, "SMA200": 25.0, "RSI": 50.0,
         "price_52_week_high": 30.0, "price_52_week_low": 15.0},
    ])


@pytest.fixture
def day_two() -> pd.DataFrame:
    """A moves up, B moves down, C does not trade (identical close and volume)."""
    return make_day([
        {"symbol": "A", "close": 105.0, "volume": 1200.0, "change": 5.0,
         "SMA50": 92.0, "SMA200": 81.0, "RSI": 62.0,
         "price_52_week_high": 110.0, "price_52_week_low": 50.0},
        {"symbol": "B", "close": 44.0, "volume": 2500.0, "change": -12.0,
         "SMA50": 54.0, "SMA200": 59.0, "RSI": 28.0,
         "price_52_week_high": 80.0, "price_52_week_low": 44.0},
        {"symbol": "C", "close": 20.0, "volume": 500.0, "change": 0.0,
         "SMA50": 20.0, "SMA200": 25.0, "RSI": 50.0,
         "price_52_week_high": 30.0, "price_52_week_low": 15.0},
    ])


def make_session(rows: list[dict], previous: pd.DataFrame | None = None) -> Session:
    """A Session built from row dicts, with its row-local facts established."""
    return Session.build(make_day(rows), previous)


def make_archive(days: dict[str, list[dict]]) -> Archive:
    """An Archive from {date: rows}. Carried-forward days are dropped as usual."""
    return Archive.of({
        date: make_day(rows).assign(date=date) for date, rows in days.items()
    })


@pytest.fixture
def session_two(day_one, day_two) -> Session:
    """The second session, built against the first - so `traded` is real."""
    return Session.build(day_two, day_one)

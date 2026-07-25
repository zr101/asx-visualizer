"""Tests for the data-quality rules.

These encode two bugs that silently corrupted every market statistic:

1. Whole days carried forward over public holidays, counted as real sessions.
2. Individual securities carried forward when they didn't trade, still
   reporting the previous session's `change`.

If either rule regresses, every breadth number on the site is wrong and nothing
else in the suite catches it. That is why this file comes first.
"""
from __future__ import annotations

import pandas as pd
import pytest
from conftest import make_day

from src.analysis import quality


class TestMarkTraded:
    def test_identical_close_and_volume_is_not_traded(self, day_one, day_two):
        result = quality.mark_traded(day_two, day_one)
        traded = dict(zip(result["symbol"], result["traded"], strict=True))
        assert traded["A"] is True or traded["A"]
        assert traded["B"]
        assert not traded["C"], "C has identical close and volume - it did not trade"

    def test_changed_volume_alone_counts_as_traded(self):
        yesterday = make_day([{"symbol": "A", "close": 10.0, "volume": 100.0}])
        today = make_day([{"symbol": "A", "close": 10.0, "volume": 250.0}])
        assert quality.mark_traded(today, yesterday)["traded"].iloc[0]

    def test_changed_close_alone_counts_as_traded(self):
        yesterday = make_day([{"symbol": "A", "close": 10.0, "volume": 100.0}])
        today = make_day([{"symbol": "A", "close": 11.0, "volume": 100.0}])
        assert quality.mark_traded(today, yesterday)["traded"].iloc[0]

    def test_symbol_absent_yesterday_counts_as_traded(self):
        yesterday = make_day([{"symbol": "A"}])
        today = make_day([{"symbol": "A"}, {"symbol": "NEW", "close": 5.0}])
        result = quality.mark_traded(today, yesterday)
        assert result.set_index("symbol").loc["NEW", "traded"]

    def test_no_previous_day_assumes_everything_traded(self, day_one):
        assert quality.mark_traded(day_one, None)["traded"].all()


class TestStaleDay:
    def test_exact_copy_is_stale(self, day_one):
        flagged, fraction = quality.is_stale_day(day_one.copy(), day_one)
        assert flagged
        assert fraction == 1.0

    def test_normal_session_is_not_stale(self, day_one, day_two):
        flagged, fraction = quality.is_stale_day(day_two, day_one)
        assert not flagged
        # Only C is unchanged, so a third of rows match - far below threshold.
        assert fraction < quality.STALE_DAY_THRESHOLD

    def test_threshold_boundary(self):
        """Exactly at the threshold counts as stale; just below does not."""
        yesterday = make_day([{"symbol": s, "close": 10.0, "volume": 100.0}
                              for s in "ABCDEFGHIJ"])
        # 9 of 10 identical = 0.90, exactly the threshold.
        rows = [{"symbol": s, "close": 10.0, "volume": 100.0} for s in "ABCDEFGHI"]
        rows.append({"symbol": "J", "close": 12.0, "volume": 300.0})
        flagged, fraction = quality.is_stale_day(make_day(rows), yesterday)
        assert fraction == 0.9
        assert flagged

        # 8 of 10 = 0.80, below threshold.
        rows = [{"symbol": s, "close": 10.0, "volume": 100.0} for s in "ABCDEFGH"]
        rows += [{"symbol": "I", "close": 12.0, "volume": 300.0},
                 {"symbol": "J", "close": 12.0, "volume": 300.0}]
        flagged, _ = quality.is_stale_day(make_day(rows), yesterday)
        assert not flagged

    def test_find_stale_days_returns_the_day_it_duplicates(self, day_one, day_two):
        frames = {"2026-01-05": day_one,
                  "2026-01-06": day_one.copy(),
                  "2026-01-07": day_two}
        stale = quality.find_stale_days(frames)
        assert stale == {"2026-01-06": "2026-01-05"}

    def test_consecutive_stale_days_both_reference_the_last_real_session(self, day_one):
        """A long weekend produces two copies; neither may become the baseline."""
        frames = {"2026-04-02": day_one,
                  "2026-04-03": day_one.copy(),
                  "2026-04-06": day_one.copy()}
        stale = quality.find_stale_days(frames)
        assert stale == {"2026-04-03": "2026-04-02", "2026-04-06": "2026-04-02"}


class TestTrueReturn:
    def test_untraded_security_has_null_return(self, day_one, day_two):
        result = quality.add_true_return(day_two, day_one).set_index("symbol")
        assert pd.isna(result.loc["C", "ret_1d"]), \
            "C did not trade, so it has no return - not a repeat of its last one"

    def test_return_computed_from_our_own_closes(self, day_one, day_two):
        result = quality.add_true_return(day_two, day_one).set_index("symbol")
        assert result.loc["A", "ret_1d"] == pytest.approx(5.0)     # 100 -> 105
        assert result.loc["B", "ret_1d"] == pytest.approx(-12.0)   # 50 -> 44

    def test_stale_change_is_not_counted(self, day_one):
        """The exact bug: an untraded row still reports yesterday's move."""
        today = day_one.copy()
        today.loc[today["symbol"] == "B", "change"] = -2.0   # carried forward
        result = quality.add_true_return(today, day_one).set_index("symbol")
        assert pd.isna(result.loc["B", "ret_1d"])


class TestPresenceGaps:
    def test_interior_gap_is_counted(self):
        history = pd.concat([
            make_day([{"symbol": "A"}, {"symbol": "B"}]).assign(date="2026-01-01"),
            make_day([{"symbol": "A"}]).assign(date="2026-01-02"),
            make_day([{"symbol": "A"}, {"symbol": "B"}]).assign(date="2026-01-03"),
        ], ignore_index=True)
        gaps = quality.presence_gaps(history).set_index("symbol")
        assert gaps.loc["A", "gaps"] == 0
        assert gaps.loc["B", "gaps"] == 1

    def test_trailing_absence_is_not_a_gap(self):
        """A delisted ticker has no interior gap - it simply stops."""
        history = pd.concat([
            make_day([{"symbol": "A"}, {"symbol": "B"}]).assign(date="2026-01-01"),
            make_day([{"symbol": "A"}]).assign(date="2026-01-02"),
        ], ignore_index=True)
        gaps = quality.presence_gaps(history).set_index("symbol")
        assert gaps.loc["B", "gaps"] == 0

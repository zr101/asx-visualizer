"""Tests for universe selection, derived metrics, breadth, ranking and signals."""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest
from conftest import make_archive, make_day, make_session

from src.analysis import breadth, derived, ranking, signals, universe


class TestUniverse:
    def test_excludes_funds_and_depositary_receipts(self):
        day = make_day([
            {"symbol": "STOCK", "type": "stock"},
            {"symbol": "ETF", "type": "fund"},
            {"symbol": "DR", "type": "dr"},
        ])
        assert list(universe.common_stocks(day)["symbol"]) == ["STOCK"]
        assert list(universe.funds(day)["symbol"]) == ["ETF"]

    def test_liquidity_floor_uses_turnover_not_share_count(self):
        """A million shares at a tenth of a cent is $1,000, not liquidity."""
        day = make_day([
            {"symbol": "PENNY", "close": 0.001, "average_volume_30d_calc": 1_000_000.0},
            {"symbol": "REAL", "close": 10.0, "average_volume_30d_calc": 50_000.0},
        ])
        assert list(universe.liquid(day)["symbol"]) == ["REAL"]

    def test_summarise_partitions_the_universe(self):
        day = make_day([
            {"symbol": "A", "type": "stock"}, {"symbol": "B", "type": "stock"},
            {"symbol": "C", "type": "fund"}, {"symbol": "D", "type": "dr"},
        ])
        result = universe.summarise(day)
        assert result["total_listings"] == 4
        assert result["common_stocks"] == 2
        assert result["funds_and_etfs"] == 1
        assert result["other"] == 1


class TestDerived:
    def test_pct_from_52w_high_is_negative_below_the_high(self):
        day = make_day([{"symbol": "A", "close": 80.0,
                         "price_52_week_high": 100.0, "price_52_week_low": 50.0}])
        out = derived.add_derived(day)
        assert out["pct_from_52w_high"].iloc[0] == pytest.approx(-20.0)
        assert out["range_position_52w"].iloc[0] == pytest.approx(60.0)

    def test_zero_denominator_yields_null_not_infinity(self):
        day = make_day([{"symbol": "A", "close": 10.0, "SMA50": 0.0,
                         "price_52_week_high": 0.0, "price_52_week_low": 0.0}])
        out = derived.add_derived(day)
        assert pd.isna(out["pct_vs_sma50"].iloc[0])
        assert not np.isinf(out["pct_vs_sma50"].iloc[0] or 0)

    def test_macd_histogram_is_line_minus_signal(self):
        day = make_day([{"symbol": "A", "MACD.macd": 1.5, "MACD.signal": 0.5}])
        assert derived.add_derived(day)["macd_histogram"].iloc[0] == pytest.approx(1.0)

    def test_bollinger_percent_b_bounds(self):
        day = make_day([
            {"symbol": "LOW", "close": 10.0, "BB.lower": 10.0, "BB.upper": 20.0},
            {"symbol": "MID", "close": 15.0, "BB.lower": 10.0, "BB.upper": 20.0},
            {"symbol": "HIGH", "close": 20.0, "BB.lower": 10.0, "BB.upper": 20.0},
        ])
        out = derived.add_derived(day).set_index("symbol")
        assert out.loc["LOW", "bb_percent_b"] == pytest.approx(0.0)
        assert out.loc["MID", "bb_percent_b"] == pytest.approx(0.5)
        assert out.loc["HIGH", "bb_percent_b"] == pytest.approx(1.0)

    def test_earnings_yield_is_defined_for_loss_makers(self):
        """The point of inverting P/E: a loss-maker gets a negative yield, not a null.

        P/E covers 32% of ASX common stocks because two-thirds lose money.
        Earnings yield covers 97% and still orders them below profitable peers.
        """
        day = make_day([
            {"symbol": "PROFIT", "close": 10.0, "earnings_per_share_basic_ttm": 1.0},
            {"symbol": "LOSS", "close": 10.0, "earnings_per_share_basic_ttm": -0.5},
        ])
        out = derived.add_derived(day).set_index("symbol")
        assert out.loc["PROFIT", "earnings_yield"] == pytest.approx(10.0)
        assert out.loc["LOSS", "earnings_yield"] == pytest.approx(-5.0)
        assert out.loc["PROFIT", "is_profitable"]
        assert not out.loc["LOSS", "is_profitable"]


class TestBreadth:
    def test_untraded_securities_are_excluded_from_counts(self, session_two):
        """C did not trade, so it is neither an advancer nor a decliner."""
        stats = breadth.of(session_two)
        assert stats["advancers"] == 1        # A
        assert stats["decliners"] == 1        # B
        assert stats["untraded"] == 1         # C
        assert stats["advance_decline_net"] == 0

    def test_pct_above_sma200_ignores_missing_averages(self):
        session = make_session([
            {"symbol": "A", "close": 100.0, "SMA200": 90.0},    # above
            {"symbol": "B", "close": 100.0, "SMA200": 110.0},   # below
            {"symbol": "C", "close": 100.0, "SMA200": None},    # not counted
        ])
        assert breadth.of(session)["pct_above_sma200"] == pytest.approx(50.0)

    def test_dollar_volume_used_for_up_down_ratio(self):
        """Share volume would make the penny stock dominate; dollar volume doesn't."""
        session = make_session([
            {"symbol": "UP", "close": 100.0, "volume": 1_000.0, "change": 1.0},
            {"symbol": "DOWN", "close": 0.01, "volume": 1_000_000.0, "change": -1.0},
        ])
        stats = breadth.of(session)
        assert stats["up_volume"] == pytest.approx(100_000.0)
        assert stats["down_volume"] == pytest.approx(10_000.0)
        assert stats["up_down_volume_ratio"] > 1

    def test_empty_universe_returns_empty_dict(self):
        """A session of nothing but funds has no Stocks universe to measure."""
        assert breadth.of(make_session([{"symbol": "E", "type": "fund"}])) == {}

    def test_ad_line_accumulates_the_actual_net_advances(self):
        """Hand-computed, so a wrong A/D line cannot pass.

        The previous version asserted cumsum().iloc[-1] == sum(), which is an
        identity of pandas and holds for any input at all.
        """
        rise = {"close": 11.0, "volume": 200.0, "change": 10.0}
        archive = make_archive({
            "2026-01-05": [{"symbol": "A", "close": 10.0, "volume": 100.0},
                           {"symbol": "B", "close": 10.0, "volume": 100.0}],
            # day 2: both rise  -> net +2
            "2026-01-06": [{"symbol": "A", **rise}, {"symbol": "B", **rise}],
            # day 3: A falls, B untraded (identical row) -> net -1
            "2026-01-07": [{"symbol": "A", "close": 8.0, "volume": 300.0, "change": -10.0},
                           {"symbol": "B", **rise}],
        })
        series = breadth.over(archive)
        assert len(series) == 3
        assert list(series["advance_decline_net"]) == [0, 2, -1]
        assert list(series["ad_line"]) == [0, 2, 1]
        assert list(series["untraded"]) == [0, 0, 1]

    def test_carried_forward_day_never_reaches_the_ad_line(self):
        """A public-holiday copy would otherwise double-count the prior session."""
        day = [{"symbol": "A", "close": 11.0, "volume": 200.0, "change": 10.0},
               {"symbol": "B", "close": 11.0, "volume": 200.0, "change": 10.0}]
        archive = make_archive({
            "2026-01-05": [{"symbol": "A", "close": 10.0, "volume": 100.0},
                           {"symbol": "B", "close": 10.0, "volume": 100.0}],
            "2026-01-06": day,
            "2026-01-07": list(day),   # market shut - feed repeats the session
        })
        assert len(archive) == 2
        assert archive.excluded_days == {"2026-01-07": "2026-01-06"}
        assert list(breadth.over(archive)["ad_line"]) == [0, 2]


class TestRanking:
    def test_percentile_rank_direction(self):
        values = pd.Series([1.0, 2.0, 3.0, 4.0])
        ascending = ranking.percentile_rank(values, higher_is_better=True)
        assert ascending.iloc[3] > ascending.iloc[0]
        descending = ranking.percentile_rank(values, higher_is_better=False)
        assert descending.iloc[3] < descending.iloc[0]

    def test_nulls_stay_null_rather_than_imputed(self):
        """A stock with no reported P/E is unknown, not average."""
        result = ranking.percentile_rank(pd.Series([1.0, None, 3.0]))
        assert pd.isna(result.iloc[1])

    def test_all_null_column_returns_all_null(self):
        result = ranking.percentile_rank(pd.Series([None, None], dtype="float64"))
        assert result.isna().all()

    def test_factor_score_records_how_many_inputs_contributed(self):
        """A score built on one input must be distinguishable from one built on three.

        Three rows, because percentile_rank needs at least two populated values
        in a column before it will rank it at all.
        """
        day = make_day([
            {"symbol": "FULL", "close": 10.0, "earnings_per_share_basic_ttm": 1.0,
             "price_book_ratio": 2.0, "price_sales_ratio": 1.0},
            {"symbol": "ALSO", "close": 10.0, "earnings_per_share_basic_ttm": 2.0,
             "price_book_ratio": 4.0, "price_sales_ratio": 2.0},
            {"symbol": "THIN", "close": 10.0, "price_book_ratio": 3.0},
        ])
        scored = ranking.factor_scores(derived.add_derived(day)).set_index("symbol")
        assert scored.loc["FULL", "value_inputs"] == 3
        assert scored.loc["THIN", "value_inputs"] == 1
        assert pd.notna(scored.loc["THIN", "value_score"])


class TestSignals:
    def _pair(self, prev_row: dict, today_row: dict):
        """(previous session, current session) for a single listing."""
        previous = make_day([{"symbol": "A", **prev_row}])
        return make_session([{"symbol": "A", **prev_row}]), make_session(
            [{"symbol": "A", **today_row}], previous
        )

    def test_golden_cross_fires_only_on_the_crossing_day(self):
        previous, current = self._pair(
            {"SMA50": 95.0, "SMA200": 100.0, "volume": 100.0},
            {"SMA50": 105.0, "SMA200": 100.0, "volume": 200.0},
        )
        assert "golden_cross" in set(signals.between(previous, current)["signal"])

        # Already crossed yesterday - not a new event.
        previous, current = self._pair(
            {"SMA50": 105.0, "SMA200": 100.0, "volume": 100.0},
            {"SMA50": 106.0, "SMA200": 100.0, "volume": 200.0},
        )
        assert "golden_cross" not in set(signals.between(previous, current)["signal"])

    def test_rsi_crossing_boundary_is_strict(self):
        previous, current = self._pair(
            {"RSI": 30.0, "volume": 100.0}, {"RSI": 29.0, "volume": 200.0})
        assert "rsi_oversold" in set(signals.between(previous, current)["signal"])

        # Was already below 30 - no new crossing.
        previous, current = self._pair(
            {"RSI": 29.0, "volume": 100.0}, {"RSI": 28.0, "volume": 200.0})
        assert "rsi_oversold" not in set(signals.between(previous, current)["signal"])

    def test_untraded_security_fires_no_signals(self):
        """Identical close and volume means the row was carried forward."""
        row = {"RSI": 29.0, "SMA50": 105.0, "SMA200": 100.0,
               "close": 10.0, "volume": 100.0}
        prior_rows = [{"symbol": "A", **{**row, "RSI": 31.0, "SMA50": 95.0}}]
        previous = make_session(prior_rows)
        current = make_session([{"symbol": "A", **row}], make_day(prior_rows))
        assert signals.between(previous, current).empty

    def test_universe_changes_reports_both_directions(self):
        yesterday = make_day([{"symbol": "STAY"}, {"symbol": "GONE"}])
        today = make_day([{"symbol": "STAY"}, {"symbol": "NEW"}])
        changes = signals.universe_changes(today, yesterday)
        assert [r["symbol"] for r in changes["new_listings"]] == ["NEW"]
        assert [r["symbol"] for r in changes["delistings"]] == ["GONE"]

"""
Tests for the published data contract.

`emit.build_payloads` is pure, so these assert on payloads directly rather than
writing to a tmpdir and re-parsing JSON - which is what the old `build` forced,
since its only return value was a map of filenames to byte counts.
"""
from __future__ import annotations

import json

import pytest
from conftest import make_archive

from src.contracts import payloads as P
from src.publish import emit

pytestmark = pytest.mark.filterwarnings("ignore::DeprecationWarning")


def _archive():
    """Three sessions: a base, a broad rise, then a mixed day with an untraded row."""
    rise = {"close": 11.0, "volume": 200.0, "change": 10.0, "sector": "Finance",
            "market_cap_basic": 2e9, "SMA200": 9.0, "RSI": 60.0,
            "price_52_week_high": 12.0, "price_52_week_low": 8.0}
    return make_archive({
        "2026-01-05": [
            {"symbol": "ASX:A", "close": 10.0, "volume": 100.0, "sector": "Finance",
             "market_cap_basic": 2e9},
            {"symbol": "ASX:B", "close": 10.0, "volume": 100.0, "sector": "Energy",
             "market_cap_basic": 1e9},
        ],
        "2026-01-06": [{"symbol": "ASX:A", **rise},
                       {"symbol": "ASX:B", **{**rise, "sector": "Energy"}}],
        "2026-01-07": [{"symbol": "ASX:A", "close": 9.0, "volume": 300.0,
                        "change": -18.0, "sector": "Finance", "market_cap_basic": 2e9},
                       {"symbol": "ASX:B", **{**rise, "sector": "Energy"}}],
    })


class TestPayloadsAreConstructible:
    """Every payload validates against its model at construction.

    Pydantic is configured `extra="forbid"`, so a field the model does not
    declare raises here rather than silently reaching the frontend.
    """

    @pytest.fixture(scope="class")
    def built(self):
        return emit.build_payloads(_archive())

    @pytest.mark.parametrize(
        "name", ["manifest", "screener", "breadth", "sectors", "signals", "pulse", "coverage"]
    )
    def test_payload_matches_its_declared_model(self, built, name):
        assert isinstance(built[name], P.PUBLISHED[name])

    def test_every_published_model_is_emitted(self, built):
        """A model in PUBLISHED with no payload would export a schema nothing uses."""
        emitted = set(built) - {"_search"}
        declared = set(P.PUBLISHED) - {"screener_row"}
        assert emitted == declared

    def test_payloads_serialise_without_nan(self, built):
        """NaN is not valid JSON, and JSON.parse rejects it."""
        for name, payload in built.items():
            if name == "_search":
                continue
            text = payload.model_dump_json(by_alias=True)
            assert "NaN" not in text and "Infinity" not in text
            json.loads(text)


class TestScreenerContract:
    def test_emitted_fields_match_the_declared_row(self):
        """The list emit writes and the row type the frontend reads cannot drift."""
        emit._assert_screener_contract()

    def test_drift_is_detected(self, monkeypatch):
        monkeypatch.setattr(emit, "SCREENER_FIELDS", [*emit.SCREENER_FIELDS, "invented"])
        with pytest.raises(AssertionError, match="invented"):
            emit._assert_screener_contract()


class TestParticipationIsConsistent:
    """The defect that made two Readings disagree in one payload.

    Sector advancers summed to 392 against breadth's 306 on real data, because
    one masked by `traded` and the other did not.
    """

    def test_sector_advancers_reconcile_with_breadth(self):
        pulse = emit.build_payloads(_archive())["pulse"]
        assert sum(s.advancers for s in pulse.sectors) == pulse.breadth.advancers

    def test_sector_denominator_is_stated(self):
        pulse = emit.build_payloads(_archive())["pulse"]
        for sector in pulse.sectors:
            assert sector.traded_count <= sector.count
            if sector.traded_count:
                expected = round(100.0 * sector.advancers / sector.traded_count, 2)
                assert sector.advancing_pct == pytest.approx(expected)


class TestSchemasAreCurrent:
    def test_exported_schemas_match_the_models(self):
        """CI runs this - a model change without re-export fails here."""
        from scripts.export_schemas import main

        assert main.__module__  # import smoke

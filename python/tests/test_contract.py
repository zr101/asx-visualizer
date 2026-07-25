"""
Live contract checks against the upstream scanner.

Marked `network` and deselected by default (`addopts` excludes nothing, but CI
runs `-m network` only in the weekly canary). These are the only tests that can
catch the highest-severity latent failure in the pipeline: rows arrive as bare
positional arrays, so if a column is reordered or removed upstream, every one of
the 89 fields silently shifts by one and the data looks plausible but is wrong.
"""
from __future__ import annotations

import pytest

from src.scrapers.tradingview import ColumnContractError, TradingViewScanner

pytestmark = pytest.mark.network


@pytest.fixture(scope="module")
def scanner():
    with TradingViewScanner() as client:
        yield client


def test_every_requested_column_is_returned_in_order(scanner):
    """The API echoes values positionally, so width is the only guarantee we get."""
    result = scanner.scan(limit=5)
    rows = result.get("data", [])
    assert rows, "scanner returned no rows"

    for row in rows:
        assert len(row["d"]) == len(TradingViewScanner.ALL_COLUMNS), (
            f"{row['s']}: expected {len(TradingViewScanner.ALL_COLUMNS)} values, "
            f"got {len(row['d'])} - the upstream column set has changed"
        )


def test_known_fields_have_plausible_types(scanner):
    """Guards against a silent reordering that keeps the width but shifts meaning."""
    result = scanner.scan(limit=25)
    records = scanner._rows_to_records(result["data"], TradingViewScanner.ALL_COLUMNS)

    for record in records:
        assert isinstance(record["name"], str), "name should be a ticker string"
        assert isinstance(record["exchange"], str)
        assert record["exchange"] == "ASX"
        if record["close"] is not None:
            assert isinstance(record["close"], (int, float))
            assert record["close"] >= 0
        if record["sector"] is not None:
            assert isinstance(record["sector"], str)


def test_pagination_returns_no_duplicates(scanner):
    """The bug this pipeline was built to fix: an unstable sort overlaps pages.

    Sorting by market cap silently dropped ~100 tickers a day for six months,
    because ~460 listings have a null market cap and the API does not break ties
    deterministically. Sorting by ticker is stable.
    """
    result = scanner.get_all_asx_stocks()
    symbols = [row["s"] for row in result["data"]]

    assert len(symbols) == len(set(symbols)), "pagination produced duplicate symbols"
    assert result["duplicatesDropped"] == 0
    assert result["fetchedCount"] == result["totalCount"], (
        f"fetched {result['fetchedCount']} but the API reports "
        f"{result['totalCount']} available"
    )


def test_index_family_is_available(scanner):
    """Relative strength and size-factor rotation both depend on these."""
    result = scanner.get_indices()
    records = scanner._rows_to_records(result["data"], TradingViewScanner.INDEX_COLUMNS)
    symbols = {record["symbol"] for record in records}

    for required in ("ASX:XJO", "ASX:XAO", "ASX:XSO"):
        assert required in symbols, f"{required} missing from the index scan"


def test_width_mismatch_raises(scanner):
    """The guard itself works - a short row must fail loudly, not zip silently."""
    with pytest.raises(ColumnContractError):
        scanner._rows_to_records(
            [{"s": "ASX:TEST", "d": [1, 2, 3]}], TradingViewScanner.ALL_COLUMNS
        )

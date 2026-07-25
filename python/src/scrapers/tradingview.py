"""
TradingView Scanner API Client for ASX Data
"""
import logging
import time

import httpx

logger = logging.getLogger(__name__)


class ColumnContractError(RuntimeError):
    """Raised when the API returns a row whose width doesn't match ALL_COLUMNS.

    Rows arrive as bare positional arrays, so a silent upstream column change
    would misalign every field. Failing loudly is the only safe response.
    """


class TradingViewScanner:
    BASE_URL = "https://scanner.tradingview.com/australia/scan"

    # All available columns for ASX stocks
    ALL_COLUMNS = [
        # Basic
        "name", "description", "logoid", "exchange", "type", "typespecs",
        "close", "open", "high", "low", "volume", "change", "change_abs",

        # Performance
        "Perf.W", "Perf.1M", "Perf.3M", "Perf.6M", "Perf.Y", "Perf.YTD", "Perf.5Y", "Perf.All",
        "High.1M", "Low.1M", "High.3M", "Low.3M", "High.6M", "Low.6M",
        "price_52_week_high", "price_52_week_low", "High.All", "Low.All",

        # Technical Indicators
        "RSI", "RSI7", "Stoch.K", "Stoch.D", "CCI20", "ADX", "ADX+DI", "ADX-DI",
        "MACD.macd", "MACD.signal", "Mom", "AO", "W.R", "BB.lower", "BB.upper",
        "ATR", "Volatility.D", "Volatility.W", "Volatility.M",

        # Moving Averages
        "SMA5", "SMA10", "SMA20", "SMA30", "SMA50", "SMA100", "SMA200",
        "EMA5", "EMA10", "EMA20", "EMA30", "EMA50", "EMA100", "EMA200",

        # Ratings
        "Recommend.All", "Recommend.MA", "Recommend.Other",

        # Fundamentals
        "market_cap_basic", "price_earnings_ttm", "price_sales_ratio",
        "price_book_ratio", "dividend_yield_recent", "earnings_per_share_basic_ttm",
        "beta_1_year", "enterprise_value_fq", "total_revenue_ttm",
        "gross_profit_fq", "net_income_fq", "total_debt_fq",

        # Volume
        "average_volume_10d_calc", "average_volume_30d_calc",
        "average_volume_60d_calc", "average_volume_90d_calc",
        "relative_volume_10d_calc", "VWAP",

        # Info
        "sector", "industry", "country", "earnings_release_date",
    ]

    # Indices carry no fundamentals, so they get their own narrower column set.
    INDEX_COLUMNS = [
        "name", "description", "close", "open", "high", "low", "change", "change_abs",
        "Perf.W", "Perf.1M", "Perf.3M", "Perf.6M", "Perf.Y", "Perf.YTD",
        "SMA50", "SMA200", "RSI", "Volatility.D",
    ]

    # Sorting by market cap is unstable: ~460 listings have a null market cap and
    # the API does not break ties deterministically, so paginated requests overlap
    # and silently drop roughly as many rows as they duplicate. `name` is unique
    # and never null, which makes pagination stable.
    DEFAULT_SORT = "name"

    def __init__(self, max_retries: int = 3, backoff: float = 1.5):
        self.max_retries = max_retries
        self.backoff = backoff
        self.client = httpx.Client(
            timeout=30.0,
            headers={
                "User-Agent": "asx-visualizer/1.0 (+https://github.com/zr101/asx-visualizer)",
                "Content-Type": "application/json",
            },
        )

    def scan(
        self,
        columns: list | None = None,
        filter_conditions: list | None = None,
        sort_by: str = DEFAULT_SORT,
        sort_order: str = "asc",
        limit: int = 500,
        offset: int = 0,
        symbol_types: list | None = None,
    ) -> dict:
        """
        Fetch ASX data from the TradingView Scanner, retrying on transient failures.
        """
        payload = {
            "filter": filter_conditions or [],
            "options": {"lang": "en"},
            "markets": ["australia"],
            "symbols": {"query": {"types": symbol_types or []}, "tickers": []},
            "columns": columns or self.ALL_COLUMNS,
            "sort": {"sortBy": sort_by, "sortOrder": sort_order},
            "range": [offset, offset + limit],
        }

        last_error: Exception | None = None
        for attempt in range(self.max_retries):
            try:
                response = self.client.post(self.BASE_URL, json=payload)
                response.raise_for_status()
                return response.json()
            except (httpx.HTTPError, ValueError) as exc:
                last_error = exc
                if attempt == self.max_retries - 1:
                    break
                delay = self.backoff ** attempt
                logger.warning(
                    "Scanner request failed (attempt %d/%d, offset=%d): %s - retrying in %.1fs",
                    attempt + 1, self.max_retries, offset, exc, delay,
                )
                time.sleep(delay)

        raise RuntimeError(
            f"Scanner request failed after {self.max_retries} attempts (offset={offset})"
        ) from last_error

    def _rows_to_records(self, rows: list, columns: list) -> list:
        """Zip positional value arrays against column names, verifying width first."""
        expected = len(columns)
        records = []
        for row in rows:
            values = row["d"]
            if len(values) != expected:
                raise ColumnContractError(
                    f"{row['s']}: expected {expected} values, got {len(values)}. "
                    "The TradingView column set has changed - update ALL_COLUMNS."
                )
            records.append({"symbol": row["s"], **dict(zip(columns, values, strict=True))})
        return records

    def get_all_asx_stocks(self) -> dict:
        """Fetch every ASX listing, paginated.

        Returns the API's own totalCount alongside the rows so callers can detect
        under-fetching instead of trusting a self-reported length.
        """
        all_rows: list = []
        seen: set = set()
        duplicates = 0
        offset = 0
        batch_size = 500
        total_count: int | None = None

        while True:
            result = self.scan(limit=batch_size, offset=offset)
            if total_count is None:
                total_count = result.get("totalCount")

            data = result.get("data", [])
            if not data:
                break

            for row in data:
                if row["s"] in seen:
                    duplicates += 1
                    continue
                seen.add(row["s"])
                all_rows.append(row)

            offset += batch_size
            if len(data) < batch_size:
                break

        if duplicates:
            logger.warning(
                "Dropped %d duplicate rows during pagination - pagination is unstable "
                "for sort key %r", duplicates, self.DEFAULT_SORT,
            )
        if total_count is not None and len(all_rows) != total_count:
            logger.warning(
                "Fetched %d unique rows but API reported totalCount=%d (delta %+d)",
                len(all_rows), total_count, len(all_rows) - total_count,
            )

        return {
            "totalCount": total_count if total_count is not None else len(all_rows),
            "fetchedCount": len(all_rows),
            "duplicatesDropped": duplicates,
            "data": all_rows,
        }

    def get_indices(self) -> dict:
        """Fetch ASX index levels (XJO, XAO, the size family and the GICS sector indices).

        These are the benchmarks relative strength and sector rotation are measured
        against; without them every 'performance' number is an absolute with nothing
        to compare it to.
        """
        result = self.scan(
            columns=self.INDEX_COLUMNS,
            sort_by="name",
            sort_order="asc",
            limit=100,
            symbol_types=["index"],
        )
        return {
            "totalCount": result.get("totalCount"),
            "data": result.get("data", []),
        }

    def close(self) -> None:
        self.client.close()

    def __enter__(self) -> "TradingViewScanner":
        return self

    def __exit__(self, *exc_info) -> None:
        self.close()

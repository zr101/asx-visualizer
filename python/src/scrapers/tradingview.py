"""
TradingView Scanner API Client for ASX Data
"""
import httpx
from typing import Optional


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

    PRESET_FILTERS = {
        "most_capitalized": {"sortBy": "market_cap_basic", "sortOrder": "desc"},
        "volume_leaders": {"sortBy": "volume", "sortOrder": "desc"},
        "top_gainers": {"sortBy": "change", "sortOrder": "desc", "filter": [{"left": "change", "operation": "greater", "right": 0}]},
        "top_losers": {"sortBy": "change", "sortOrder": "asc", "filter": [{"left": "change", "operation": "less", "right": 0}]},
        "most_volatile": {"sortBy": "Volatility.D", "sortOrder": "desc"},
        "overbought": {"filter": [{"left": "RSI", "operation": "greater", "right": 70}]},
        "oversold": {"filter": [{"left": "RSI", "operation": "less", "right": 30}]},
        "high_dividend": {"sortBy": "dividend_yield_recent", "sortOrder": "desc"},
        "unusual_volume": {"sortBy": "relative_volume_10d_calc", "sortOrder": "desc"},
    }

    def __init__(self):
        self.client = httpx.Client(timeout=30.0)

    def scan(
        self,
        columns: Optional[list] = None,
        filter_conditions: Optional[list] = None,
        sort_by: str = "market_cap_basic",
        sort_order: str = "desc",
        limit: int = 500,
        offset: int = 0,
    ) -> dict:
        """
        Fetch ASX stock data from TradingView Scanner
        """
        payload = {
            "filter": filter_conditions or [],
            "options": {"lang": "en"},
            "markets": ["australia"],
            "symbols": {"query": {"types": []}, "tickers": []},
            "columns": columns or self.ALL_COLUMNS,
            "sort": {"sortBy": sort_by, "sortOrder": sort_order},
            "range": [offset, offset + limit]
        }

        response = self.client.post(self.BASE_URL, json=payload)
        response.raise_for_status()
        return response.json()

    def get_preset(self, preset_name: str, limit: int = 100) -> dict:
        """Fetch data using a preset filter"""
        preset = self.PRESET_FILTERS.get(preset_name, {})
        return self.scan(
            sort_by=preset.get("sortBy", "market_cap_basic"),
            sort_order=preset.get("sortOrder", "desc"),
            filter_conditions=preset.get("filter"),
            limit=limit
        )

    def get_all_asx_stocks(self) -> dict:
        """Fetch all ASX stocks (paginated)"""
        all_data = []
        offset = 0
        batch_size = 500

        while True:
            result = self.scan(limit=batch_size, offset=offset)
            data = result.get("data", [])
            if not data:
                break
            all_data.extend(data)
            offset += batch_size
            if len(data) < batch_size:
                break

        return {"totalCount": len(all_data), "data": all_data}

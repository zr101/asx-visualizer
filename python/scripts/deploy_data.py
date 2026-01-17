#!/usr/bin/env python3
"""
Deploy Data Script
Finds the most recent JSON snapshot in data/snapshots/ and copies it to frontend/public/data.json
"""
import json
import shutil
from datetime import datetime
from pathlib import Path


def find_latest_snapshot(snapshots_dir: Path) -> Path | None:
    """Find the most recent JSON snapshot file (excluding summary and preset files)"""
    json_files = []

    for json_file in snapshots_dir.rglob("*.json"):
        # Skip summary files and preset files
        if "-summary" in json_file.name or json_file.parent.name == "presets":
            continue

        # Try to parse the date from the filename (YYYY-MM-DD.json)
        try:
            date_str = json_file.stem
            date = datetime.strptime(date_str, "%Y-%m-%d")
            json_files.append((date, json_file))
        except ValueError:
            continue

    if not json_files:
        return None

    # Sort by date descending and return the most recent
    json_files.sort(key=lambda x: x[0], reverse=True)
    return json_files[0][1]


def sanitize_key(key: str) -> str:
    """Replace dots with underscores in keys to avoid TanStack Table nested key issues"""
    return key.replace(".", "_").replace("+", "_plus_").replace("-", "_minus_")


def transform_snapshot_for_frontend(snapshot_path: Path) -> list[dict]:
    """Transform the raw TradingView snapshot into frontend-friendly format"""

    # Column names from TradingView scanner (must match ALL_COLUMNS in tradingview.py)
    COLUMNS = [
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

    with open(snapshot_path, "r") as f:
        raw_data = json.load(f)

    stocks = []
    for item in raw_data.get("data", []):
        symbol = item["s"]  # e.g., "ASX:CBA"
        values = item["d"]

        # Create a dictionary mapping column names to values
        # Sanitize all keys by replacing dots and special chars with underscores
        stock = {"symbol": symbol}
        for i, col in enumerate(COLUMNS):
            sanitized_col = sanitize_key(col)
            if i < len(values):
                stock[sanitized_col] = values[i]
            else:
                stock[sanitized_col] = None

        stocks.append(stock)

    return stocks


def deploy_data():
    """Main function to deploy the latest snapshot to frontend"""
    # Get project root (parent of python directory)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent

    snapshots_dir = project_root / "data" / "snapshots"
    frontend_public = project_root / "frontend" / "public"

    # Ensure directories exist
    if not snapshots_dir.exists():
        print(f"Error: Snapshots directory not found: {snapshots_dir}")
        return False

    frontend_public.mkdir(parents=True, exist_ok=True)

    # Find the latest snapshot
    latest_snapshot = find_latest_snapshot(snapshots_dir)

    if not latest_snapshot:
        print("Error: No snapshot files found in data/snapshots/")
        return False

    print(f"Found latest snapshot: {latest_snapshot}")

    # Transform data for frontend
    print("Transforming data for frontend...")
    stocks = transform_snapshot_for_frontend(latest_snapshot)

    # Write to frontend/public/data.json
    output_path = frontend_public / "data.json"
    with open(output_path, "w") as f:
        json.dump(stocks, f, indent=2)

    print(f"Deployed {len(stocks)} stocks to {output_path}")

    # Also copy the raw snapshot as data-raw.json for reference
    raw_output_path = frontend_public / "data-raw.json"
    shutil.copy(latest_snapshot, raw_output_path)
    print(f"Copied raw snapshot to {raw_output_path}")

    return True


if __name__ == "__main__":
    success = deploy_data()
    exit(0 if success else 1)

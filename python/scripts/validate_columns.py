#!/usr/bin/env python3
"""
Utility script to identify invalid column names in TradingView Scanner API
"""
import sys
import time
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from src.scrapers.tradingview import TradingViewScanner


def validate_columns():
    scanner = TradingViewScanner()

    # Start with known valid columns
    valid_columns = ["name", "close", "volume"]

    # Get all columns except the ones we already know work
    columns_to_test = [c for c in scanner.ALL_COLUMNS if c not in valid_columns]

    print(f"Testing {len(columns_to_test)} columns...\n")

    for column in columns_to_test:
        try:
            # Test with just 'name' and this column
            payload = {
                "filter": [],
                "options": {"lang": "en"},
                "markets": ["australia"],
                "symbols": {"query": {"types": []}, "tickers": []},
                "columns": ["name", column],
                "sort": {"sortBy": "name", "sortOrder": "desc"},
                "range": [0, 1]
            }

            response = scanner.client.post(scanner.BASE_URL, json=payload)

            if response.status_code == 200:
                valid_columns.append(column)
                print(f"✅ {column}")
            else:
                print(f"❌ {column} - INVALID (status: {response.status_code})")

            # Small delay to avoid rate limiting
            time.sleep(0.1)

        except Exception as e:
            print(f"❌ {column} - INVALID (error: {e})")

    print("\n" + "=" * 60)
    print("VALID COLUMNS LIST (copy this to tradingview.py):")
    print("=" * 60 + "\n")

    # Format as Python list
    print("ALL_COLUMNS = [")
    for i, col in enumerate(valid_columns):
        comma = "," if i < len(valid_columns) - 1 else ""
        print(f'    "{col}"{comma}')
    print("]")

    print(f"\n\nTotal valid columns: {len(valid_columns)}/{len(scanner.ALL_COLUMNS)}")


if __name__ == "__main__":
    validate_columns()

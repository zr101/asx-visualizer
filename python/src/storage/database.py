"""
SQLite/PostgreSQL Database Handler for ASX Data Storage
"""
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd


class Database:
    """Database handler for ASX stock data storage"""

    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize database connection.

        Args:
            db_path: Path to SQLite database file. Defaults to data/asx.db
        """
        if db_path is None:
            # Default to project root data directory
            project_root = Path(__file__).parent.parent.parent.parent
            data_dir = project_root / "data"
            data_dir.mkdir(parents=True, exist_ok=True)
            db_path = str(data_dir / "asx.db")

        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        """Get a database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Initialize database tables"""
        conn = self._get_connection()
        cursor = conn.cursor()

        # Snapshots metadata table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                snapshot_date DATE UNIQUE NOT NULL,
                total_stocks INTEGER,
                market_cap_total REAL,
                avg_change REAL,
                gainers INTEGER,
                losers INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Stock data table - stores daily stock data
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS stock_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                snapshot_date DATE NOT NULL,
                symbol TEXT NOT NULL,
                name TEXT,
                description TEXT,
                exchange TEXT,
                type TEXT,
                close REAL,
                open REAL,
                high REAL,
                low REAL,
                volume REAL,
                change REAL,
                change_abs REAL,
                perf_w REAL,
                perf_1m REAL,
                perf_3m REAL,
                perf_6m REAL,
                perf_y REAL,
                perf_ytd REAL,
                high_52w REAL,
                low_52w REAL,
                rsi REAL,
                rsi7 REAL,
                macd_macd REAL,
                macd_signal REAL,
                adx REAL,
                atr REAL,
                volatility_d REAL,
                sma20 REAL,
                sma50 REAL,
                sma200 REAL,
                ema20 REAL,
                ema50 REAL,
                ema200 REAL,
                recommend_all REAL,
                recommend_ma REAL,
                recommend_other REAL,
                market_cap_basic REAL,
                price_earnings_ttm REAL,
                price_sales_ratio REAL,
                price_book_ratio REAL,
                dividend_yield_recent REAL,
                eps_basic_ttm REAL,
                beta_1_year REAL,
                enterprise_value REAL,
                total_revenue_ttm REAL,
                gross_profit REAL,
                net_income REAL,
                total_debt REAL,
                avg_volume_10d REAL,
                avg_volume_30d REAL,
                relative_volume REAL,
                vwap REAL,
                sector TEXT,
                industry TEXT,
                country TEXT,
                employees INTEGER,
                raw_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(snapshot_date, symbol)
            )
        """)

        # Create indexes for common queries
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_stock_data_symbol
            ON stock_data(symbol)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_stock_data_date
            ON stock_data(snapshot_date)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_stock_data_sector
            ON stock_data(sector)
        """)

        conn.commit()
        conn.close()

    def insert_snapshot(self, df: pd.DataFrame, snapshot_date: str) -> int:
        """
        Insert a daily snapshot into the database.

        Args:
            df: DataFrame with stock data
            snapshot_date: Date string in YYYY-MM-DD format

        Returns:
            Number of rows inserted
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        # Insert snapshot metadata
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO snapshots
                (snapshot_date, total_stocks, market_cap_total, avg_change, gainers, losers)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                snapshot_date,
                len(df),
                df["market_cap_basic"].sum() if "market_cap_basic" in df.columns else None,
                df["change"].mean() if "change" in df.columns else None,
                len(df[df["change"] > 0]) if "change" in df.columns else None,
                len(df[df["change"] < 0]) if "change" in df.columns else None,
            ))
        except Exception as e:
            print(f"Warning: Could not insert snapshot metadata: {e}")

        # Column mapping from DataFrame to database
        column_mapping = {
            "symbol": "symbol",
            "name": "name",
            "description": "description",
            "exchange": "exchange",
            "type": "type",
            "close": "close",
            "open": "open",
            "high": "high",
            "low": "low",
            "volume": "volume",
            "change": "change",
            "change_abs": "change_abs",
            "Perf.W": "perf_w",
            "Perf.1M": "perf_1m",
            "Perf.3M": "perf_3m",
            "Perf.6M": "perf_6m",
            "Perf.Y": "perf_y",
            "Perf.YTD": "perf_ytd",
            "High.52W": "high_52w",
            "Low.52W": "low_52w",
            "RSI": "rsi",
            "RSI7": "rsi7",
            "MACD.macd": "macd_macd",
            "MACD.signal": "macd_signal",
            "ADX": "adx",
            "ATR": "atr",
            "Volatility.D": "volatility_d",
            "SMA20": "sma20",
            "SMA50": "sma50",
            "SMA200": "sma200",
            "EMA20": "ema20",
            "EMA50": "ema50",
            "EMA200": "ema200",
            "Recommend.All": "recommend_all",
            "Recommend.MA": "recommend_ma",
            "Recommend.Other": "recommend_other",
            "market_cap_basic": "market_cap_basic",
            "price_earnings_ttm": "price_earnings_ttm",
            "price_sales_ratio": "price_sales_ratio",
            "price_book_ratio": "price_book_ratio",
            "dividend_yield_recent": "dividend_yield_recent",
            "earnings_per_share_basic_ttm": "eps_basic_ttm",
            "beta_1_year": "beta_1_year",
            "enterprise_value_fq": "enterprise_value",
            "total_revenue_ttm": "total_revenue_ttm",
            "gross_profit_fq": "gross_profit",
            "net_income_fq": "net_income",
            "total_debt_fq": "total_debt",
            "average_volume_10d_calc": "avg_volume_10d",
            "average_volume_30d_calc": "avg_volume_30d",
            "relative_volume_10d_calc": "relative_volume",
            "VWAP": "vwap",
            "sector": "sector",
            "industry": "industry",
            "country": "country",
            "employees": "employees",
        }

        rows_inserted = 0
        for _, row in df.iterrows():
            try:
                # Build insert data
                insert_data = {"snapshot_date": snapshot_date}
                for df_col, db_col in column_mapping.items():
                    if df_col in row.index:
                        value = row[df_col]
                        # Handle NaN values
                        if pd.isna(value):
                            value = None
                        insert_data[db_col] = value

                # Build SQL
                columns = ", ".join(insert_data.keys())
                placeholders = ", ".join(["?" for _ in insert_data])
                sql = f"""
                    INSERT OR REPLACE INTO stock_data ({columns})
                    VALUES ({placeholders})
                """
                cursor.execute(sql, list(insert_data.values()))
                rows_inserted += 1
            except Exception as e:
                print(f"Warning: Could not insert row for {row.get('symbol', 'unknown')}: {e}")

        conn.commit()
        conn.close()
        return rows_inserted

    def get_stock_history(self, symbol: str, days: int = 30) -> list[dict]:
        """
        Get historical data for a specific stock.

        Args:
            symbol: Stock symbol (e.g., "ASX:BHP")
            days: Number of days of history to fetch

        Returns:
            List of dictionaries with historical data
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM stock_data
            WHERE symbol = ?
            ORDER BY snapshot_date DESC
            LIMIT ?
        """, (symbol, days))

        rows = cursor.fetchall()
        conn.close()

        return [dict(row) for row in rows]

    def get_snapshot(self, date: str) -> dict:
        """
        Get all stock data for a specific date.

        Args:
            date: Date string in YYYY-MM-DD format

        Returns:
            Dictionary with snapshot metadata and stock data
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        # Get snapshot metadata
        cursor.execute("""
            SELECT * FROM snapshots WHERE snapshot_date = ?
        """, (date,))
        metadata = cursor.fetchone()

        # Get stock data
        cursor.execute("""
            SELECT * FROM stock_data WHERE snapshot_date = ?
            ORDER BY market_cap_basic DESC
        """, (date,))
        stocks = cursor.fetchall()

        conn.close()

        return {
            "metadata": dict(metadata) if metadata else None,
            "data": [dict(row) for row in stocks],
            "count": len(stocks)
        }

    def get_latest_snapshot_date(self) -> Optional[str]:
        """Get the date of the most recent snapshot"""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT snapshot_date FROM snapshots
            ORDER BY snapshot_date DESC
            LIMIT 1
        """)
        result = cursor.fetchone()
        conn.close()

        return result["snapshot_date"] if result else None

    def get_all_symbols(self) -> list[str]:
        """Get all unique stock symbols in the database"""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT DISTINCT symbol FROM stock_data
            ORDER BY symbol
        """)
        rows = cursor.fetchall()
        conn.close()

        return [row["symbol"] for row in rows]

    def get_snapshot_dates(self) -> list[str]:
        """Get all available snapshot dates"""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT snapshot_date FROM snapshots
            ORDER BY snapshot_date DESC
        """)
        rows = cursor.fetchall()
        conn.close()

        return [row["snapshot_date"] for row in rows]

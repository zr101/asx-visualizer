# ASX Stock Market Visualizer - Project Specification

## Project Overview
Build a professional ASX (Australian Stock Exchange) stock market visualizer using the TradingView Widget API. The application should provide real-time market data, interactive charts, screening capabilities, and data export functionality.

## Tech Stack
- **Frontend**: Next.js 14+ with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Charts**: TradingView Embed Widgets
- **Backend/Scripts**: Python 3.11+
  - FastAPI (optional API layer)
  - Pandas (data processing & analysis)
  - Requests/HTTPX (API calls)
  - Schedule (job scheduling)
- **Data**: TradingView Scanner API
- **Database**: SQLite (local) or PostgreSQL (production) for historical data
- **Deployment**: 
  - Frontend: Vercel
  - Python Backend (optional): Railway / Render / AWS Lambda
- **CI/CD**: GitHub Actions for daily data snapshots
- **Repository**: GitHub

---

## Core Features

### 1. Dashboard Layout
Create a responsive dashboard with the following sections:

#### Header
- ASX 200 mini chart (TradingView widget)
- All Ordinaries mini chart (TradingView widget)
- Current market status (open/closed)
- Last updated timestamp

#### Main Content Areas
- **Market Overview**: Index charts (ASX 200, All Ords)
- **Hotlists Panel**: Gainers, Losers, Most Active tabs
- **Stock Screener Table**: Full-featured data table with all metrics
- **Heatmap View**: Optional sector/market cap heatmap

---

### 2. Stock Screener Table

#### Column Categories & Fields
Implement ALL of the following data fields as toggleable columns:

```
PERFORMANCE & PRICE EXTREMES
- 1-Month High/Low
- 3-Month High/Low  
- 6-Month High/Low
- 52 Week High/Low
- All Time High/Low
- 1-Year Beta
- Performance: Weekly, Monthly, 3M, 6M, YTD, 1Y, 5Y, All Time
- Gap %
- Change % (1m, 5m, 15m, 1h, 4h, 1D, 1W, 1M)
- Change from Open

OSCILLATORS & INDICATORS
- RSI (7), RSI (14)
- Stochastic %D/%K (14, 3, 3)
- Stochastic RSI Fast/Slow
- CCI (20)
- Momentum (10)
- Awesome Oscillator
- Ultimate Oscillator (7, 14, 28)
- Williams %R (14)
- Bull Bear Power
- MACD Level/Signal (12, 26)
- Technical Rating
- Oscillators Rating
- Moving Averages Rating

TREND & VOLATILITY
- Bollinger Bands (Upper/Lower, 20)
- Keltner Channels (Upper/Lower, 20)
- Donchian Channels (Upper/Lower, 20)
- ATR (14)
- ADR (14)
- ADX (14)
- +DI/-DI (14)
- Parabolic SAR
- Aroon Up/Down (14)
- Volatility (Daily, Weekly, Monthly)
- ROC (9)

MOVING AVERAGES
- SMA (5, 10, 20, 30, 50, 100, 200)
- EMA (5, 10, 20, 30, 50, 100, 200)
- HMA (9)
- VWMA (20)
- Ichimoku (Base, Conversion, Leading Span A/B)

PIVOT POINTS
- Camarilla (P, R1-R3, S1-S3)
- Classic (P, R1-R3, S1-S3)
- Demark (P, R1, S1)
- Fibonacci (P, R1-R3, S1-S3)
- Woodie (P, R1-R3, S1-S3)

FINANCIALS - INCOME STATEMENT
- Total Revenue (FY, YoY, QoQ, TTM growth)
- Revenue per Employee
- Gross Profit (FY, MRQ, all growth metrics)
- Net Income (FY, all growth metrics)
- EBITDA (TTM, all growth metrics)

FINANCIALS - BALANCE SHEET
- Total Assets (MRQ, growth metrics)
- Total Current Assets
- Total Liabilities (FY, MRQ)
- Total Debt (MRQ, growth metrics)
- Net Debt
- Cash & Equivalents (FY, MRQ)
- Cash & Short Term Investments
- Goodwill
- Current Ratio, Quick Ratio
- Debt to Equity Ratio

VALUATION & MARGINS
- Market Cap
- Enterprise Value
- EV/EBITDA
- P/E Ratio (TTM)
- P/S Ratio (FY, TTM)
- P/B Ratio (FY, MRQ)
- P/FCF (TTM)
- Gross Margin (FY, TTM)
- Operating Margin (FY, TTM)
- Net Margin (FY, TTM)
- Pretax Margin
- SG&A Ratio
- R&D Ratio

PER SHARE & DIVIDENDS
- Basic EPS (FY, TTM)
- Diluted EPS (all periods & growth)
- EPS Forecast
- Dividends Paid
- Dividends per Share (FY, MRQ, YoY)
- Dividend Yield Forward

VOLUME & OTHER
- Volume
- Average Volume (10, 30, 60, 90 day)
- Volume*Price
- Relative Volume
- Relative Volume at Time
- Money Flow (14)
- Chaikin Money Flow (20)
- VWAP
- ROA, ROE, ROIC (TTM)
- FCF (all growth metrics)
- FCF Margin
- Shares Outstanding
- Shares Float
- Employee Count
- Shareholder Count
- Country, Sector, Industry, Exchange
- Earnings Date (Recent/Upcoming)
- Candlestick Pattern
```

#### Table Features
- **Sortable columns**: Click header to sort ASC/DESC
- **Column visibility toggle**: Checkbox panel to show/hide columns
- **Column presets**: Save/load column configurations
- **Sticky first column**: Ticker always visible when scrolling horizontally
- **Row click**: Opens detailed view/chart for that stock
- **Pagination**: 25/50/100 rows per page
- **Export**: CSV download of current view

---

### 3. Filter System

#### Dropdown Filters (Single Select)
```typescript
const DROPDOWN_FILTERS = {
  symbolType: ['Any', 'Common Stock', 'Depositary Receipt', 'ETF', 'Fund', 'Preferred Stock', 'REIT', 'Structured Product', 'Unit', 'Warrant'],
  exchange: ['ASX', 'Any'],
  sector: ['Any', 'Communication Services', 'Consumer Cyclical', 'Consumer Defensive', 'Energy', 'Finance', 'Health Services', 'Health Technology', 'Industrial Services', 'Miscellaneous', 'Non-Energy Minerals', 'Process Industries', 'Producer Manufacturing', 'Technology Services', 'Transportation', 'Utilities'],
  index: ['Any', 'S&P/ASX 200', 'S&P/ASX 50', 'S&P/ASX 300', 'All Ordinaries'],
  industry: ['Any', ...allIndustries], // Populate from API
  country: ['Australia'], // Fixed for ASX
  candlestickPattern: ['Any', 'Bullish Engulfing', 'Bearish Engulfing', 'Hammer', 'Shooting Star', 'Doji', 'Morning Star', 'Evening Star', ...],
  earningsDate: ['Any', 'Yesterday', 'Today', 'Tomorrow', 'This Week', 'Next Week', 'This Month'],
  technicalRating: ['Any', 'Strong Buy', 'Buy', 'Neutral', 'Sell', 'Strong Sell'],
  maRating: ['Any', 'Strong Buy', 'Buy', 'Neutral', 'Sell', 'Strong Sell'],
  oscillatorsRating: ['Any', 'Strong Buy', 'Buy', 'Neutral', 'Sell', 'Strong Sell'],
}
```

#### Range Filters (Min/Max Input)
For numeric fields like:
- Market Cap
- P/E Ratio
- Volume
- Price
- Dividend Yield
- RSI
- Change %

---

### 4. Pre-built Screener Views (Quick Filters)

Implement these as one-click preset filters:

```typescript
const PRESET_VIEWS = [
  { id: 'most-capitalized', name: 'Most Capitalized', sort: 'market_cap_basic', order: 'desc' },
  { id: 'volume-leaders', name: 'Volume Leaders', sort: 'volume', order: 'desc' },
  { id: 'top-gainers', name: 'Top Gainers', sort: 'change', order: 'desc', filter: { change: { min: 0 } } },
  { id: 'top-losers', name: 'Top Losers', sort: 'change', order: 'asc', filter: { change: { max: 0 } } },
  { id: 'all-time-high', name: 'All-Time High', filter: { 'High.All': { equals: 'close' } } },
  { id: 'all-time-low', name: 'All-Time Low', filter: { 'Low.All': { equals: 'close' } } },
  { id: 'high-dividend', name: 'High Dividend', sort: 'dividend_yield_recent', order: 'desc' },
  { id: '52w-high', name: 'New 52-Week High', filter: { 'price_52_week_high': true } },
  { id: '52w-low', name: 'New 52-Week Low', filter: { 'price_52_week_low': true } },
  { id: 'monthly-high', name: 'New Monthly High', filter: { 'High.1M': { equals: 'close' } } },
  { id: 'monthly-low', name: 'New Monthly Low', filter: { 'Low.1M': { equals: 'close' } } },
  { id: 'most-volatile', name: 'Most Volatile', sort: 'Volatility.D', order: 'desc' },
  { id: 'unusual-volume', name: 'Unusual Volume', sort: 'relative_volume_10d_calc', order: 'desc', filter: { relative_volume: { min: 2 } } },
  { id: 'overbought', name: 'Overbought', filter: { 'RSI': { min: 70 } } },
  { id: 'oversold', name: 'Oversold', filter: { 'RSI': { max: 30 } } },
  { id: 'above-sma50', name: 'Outperforming SMA50', filter: { 'close': { above: 'SMA50' } } },
  { id: 'below-sma50', name: 'Underperforming SMA50', filter: { 'close': { below: 'SMA50' } } },
  { id: 'earnings-week', name: 'Earnings This Week', filter: { earnings_release_date: 'this_week' } },
];
```

---

### 5. TradingView Integration

#### Widgets to Implement
```typescript
// 1. Mini Chart Widget (for header)
<TradingViewWidget 
  symbol="ASX:XJO"
  width="100%"
  height={200}
  theme="dark"
/>

// 2. Hotlists Widget
<TradingViewHotlists
  exchange="ASX"
  showSymbolLogo={true}
  theme="dark"
/>

// 3. Stock Heatmap Widget
<TradingViewHeatmap
  exchange="ASX"
  dataSource="ASX"
  theme="dark"
/>

// 4. Screener Widget (or custom implementation using scanner API)
// Reference: scanner.tradingview.com endpoints
```

#### Scanner API Integration
The TradingView scanner API endpoint pattern:
```
POST https://scanner.tradingview.com/australia/scan
Headers: { 'Content-Type': 'application/json' }
Body: {
  "filter": [...],
  "options": { "lang": "en" },
  "markets": ["australia"],
  "symbols": { "query": { "types": [] }, "tickers": [] },
  "columns": ["name", "close", "change", "volume", ...],
  "sort": { "sortBy": "market_cap_basic", "sortOrder": "desc" },
  "range": [0, 150]
}
```

---

### 6. Python Backend & Scripts

#### Directory Structure
```
/python
├── requirements.txt
├── config.py
├── src/
│   ├── __init__.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app (optional)
│   │   └── routes/
│   │       ├── screener.py
│   │       └── historical.py
│   ├── scrapers/
│   │   ├── __init__.py
│   │   ├── tradingview.py       # TradingView scanner API client
│   │   └── asx.py               # Direct ASX data if needed
│   ├── processors/
│   │   ├── __init__.py
│   │   ├── cleaner.py           # Data cleaning
│   │   ├── transformer.py       # Data transformation
│   │   └── calculator.py        # Custom indicators/metrics
│   ├── storage/
│   │   ├── __init__.py
│   │   ├── database.py          # SQLite/PostgreSQL handler
│   │   ├── csv_handler.py       # CSV export/import
│   │   └── json_handler.py      # JSON snapshots
│   ├── analysis/
│   │   ├── __init__.py
│   │   ├── screener.py          # Custom screening logic
│   │   ├── signals.py           # Buy/sell signal generation
│   │   └── reports.py           # Daily summary reports
│   └── utils/
│       ├── __init__.py
│       ├── logger.py
│       └── helpers.py
├── scripts/
│   ├── fetch_daily_snapshot.py  # Main daily data fetch
│   ├── generate_report.py       # Daily summary report
│   ├── backfill_historical.py   # Backfill missing data
│   └── export_csv.py            # Export to CSV for analysis
├── notebooks/                    # Jupyter notebooks for analysis
│   ├── exploration.ipynb
│   ├── backtesting.ipynb
│   └── visualization.ipynb
└── tests/
    └── ...
```

#### requirements.txt
```
# API & Web
fastapi>=0.109.0
uvicorn>=0.27.0
httpx>=0.26.0
requests>=2.31.0

# Data Processing
pandas>=2.2.0
numpy>=1.26.0
polars>=0.20.0  # Fast alternative to pandas

# Database
sqlalchemy>=2.0.0
sqlite-utils>=3.35
psycopg2-binary>=2.9.9  # PostgreSQL

# Analysis
ta>=0.11.0  # Technical analysis library
scipy>=1.12.0
scikit-learn>=1.4.0

# Utilities
python-dotenv>=1.0.0
pydantic>=2.5.0
schedule>=1.2.0
rich>=13.7.0  # Beautiful terminal output
typer>=0.9.0  # CLI framework

# Development
jupyter>=1.0.0
matplotlib>=3.8.0
plotly>=5.18.0
pytest>=8.0.0
black>=24.1.0
ruff>=0.1.0
```

#### Core Python Scripts

**1. TradingView Scanner Client (`src/scrapers/tradingview.py`)**
```python
"""
TradingView Scanner API Client for ASX Data
"""
import httpx
from typing import Optional
from pydantic import BaseModel

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
        "High.52W", "Low.52W", "High.All", "Low.All",
        
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
        "sector", "industry", "country", "employees", "earnings_release_date",
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
```

**2. Daily Snapshot Script (`scripts/fetch_daily_snapshot.py`)**
```python
#!/usr/bin/env python3
"""
Daily ASX Data Snapshot Script
Fetches all ASX stock data and saves to JSON/CSV/Database
"""
import json
import pandas as pd
from datetime import datetime
from pathlib import Path
from rich.console import Console
from rich.progress import track

import sys
sys.path.append(str(Path(__file__).parent.parent))

from src.scrapers.tradingview import TradingViewScanner
from src.storage.database import Database

console = Console()

def fetch_and_save_snapshot():
    """Main function to fetch daily snapshot"""
    
    console.print("[bold blue]🚀 Starting ASX Daily Snapshot[/bold blue]")
    
    # Initialize
    scanner = TradingViewScanner()
    db = Database()
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Create directories
    data_dir = Path("data/snapshots") / datetime.now().strftime("%Y/%m")
    data_dir.mkdir(parents=True, exist_ok=True)
    
    # Fetch all ASX stocks
    console.print("[yellow]Fetching all ASX stocks...[/yellow]")
    result = scanner.get_all_asx_stocks()
    
    total_stocks = result["totalCount"]
    console.print(f"[green]✓ Fetched {total_stocks} stocks[/green]")
    
    # Convert to DataFrame
    df = pd.DataFrame([
        {"symbol": item["s"], **dict(zip(scanner.ALL_COLUMNS, item["d"]))}
        for item in result["data"]
    ])
    
    # Save JSON snapshot
    json_path = data_dir / f"{today}.json"
    with open(json_path, "w") as f:
        json.dump(result, f, indent=2)
    console.print(f"[green]✓ Saved JSON: {json_path}[/green]")
    
    # Save CSV snapshot
    csv_path = data_dir / f"{today}.csv"
    df.to_csv(csv_path, index=False)
    console.print(f"[green]✓ Saved CSV: {csv_path}[/green]")
    
    # Save to database
    db.insert_snapshot(df, today)
    console.print(f"[green]✓ Saved to database[/green]")
    
    # Generate summary
    summary = {
        "date": today,
        "total_stocks": total_stocks,
        "market_cap_total": df["market_cap_basic"].sum(),
        "avg_change": df["change"].mean(),
        "gainers": len(df[df["change"] > 0]),
        "losers": len(df[df["change"] < 0]),
        "unchanged": len(df[df["change"] == 0]),
        "top_gainer": df.loc[df["change"].idxmax(), ["symbol", "name", "change"]].to_dict(),
        "top_loser": df.loc[df["change"].idxmin(), ["symbol", "name", "change"]].to_dict(),
        "most_volume": df.loc[df["volume"].idxmax(), ["symbol", "name", "volume"]].to_dict(),
    }
    
    summary_path = data_dir / f"{today}-summary.json"
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)
    console.print(f"[green]✓ Saved summary: {summary_path}[/green]")
    
    # Fetch and save presets
    console.print("\n[yellow]Fetching preset views...[/yellow]")
    presets_dir = data_dir / "presets"
    presets_dir.mkdir(exist_ok=True)
    
    for preset_name in track(scanner.PRESET_FILTERS.keys(), description="Presets"):
        preset_data = scanner.get_preset(preset_name, limit=50)
        preset_path = presets_dir / f"{today}-{preset_name}.json"
        with open(preset_path, "w") as f:
            json.dump(preset_data, f, indent=2)
    
    console.print("[bold green]✅ Daily snapshot complete![/bold green]")
    return summary


if __name__ == "__main__":
    fetch_and_save_snapshot()
```

**3. Data Analysis Module (`src/analysis/screener.py`)**
```python
"""
Custom Stock Screener Logic
"""
import pandas as pd
import numpy as np
from typing import Optional

class StockScreener:
    """Custom screening logic beyond TradingView presets"""
    
    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()
    
    def filter_by_market_cap(self, min_cap: float = None, max_cap: float = None):
        """Filter by market cap range"""
        if min_cap:
            self.df = self.df[self.df["market_cap_basic"] >= min_cap]
        if max_cap:
            self.df = self.df[self.df["market_cap_basic"] <= max_cap]
        return self
    
    def filter_by_pe_ratio(self, min_pe: float = None, max_pe: float = None):
        """Filter by P/E ratio range"""
        if min_pe:
            self.df = self.df[self.df["price_earnings_ttm"] >= min_pe]
        if max_pe:
            self.df = self.df[self.df["price_earnings_ttm"] <= max_pe]
        return self
    
    def filter_by_dividend_yield(self, min_yield: float = 0):
        """Filter for dividend-paying stocks"""
        self.df = self.df[self.df["dividend_yield_recent"] >= min_yield]
        return self
    
    def filter_oversold(self, rsi_threshold: float = 30):
        """Find oversold stocks (RSI below threshold)"""
        self.df = self.df[self.df["RSI"] < rsi_threshold]
        return self
    
    def filter_overbought(self, rsi_threshold: float = 70):
        """Find overbought stocks (RSI above threshold)"""
        self.df = self.df[self.df["RSI"] > rsi_threshold]
        return self
    
    def filter_golden_cross(self):
        """Find stocks where SMA50 just crossed above SMA200"""
        self.df = self.df[
            (self.df["SMA50"] > self.df["SMA200"]) & 
            (self.df["close"] > self.df["SMA50"])
        ]
        return self
    
    def filter_death_cross(self):
        """Find stocks where SMA50 just crossed below SMA200"""
        self.df = self.df[
            (self.df["SMA50"] < self.df["SMA200"]) & 
            (self.df["close"] < self.df["SMA50"])
        ]
        return self
    
    def filter_breakout(self, period: str = "52W"):
        """Find stocks breaking out to new highs"""
        high_col = f"High.{period}"
        if high_col in self.df.columns:
            self.df = self.df[self.df["close"] >= self.df[high_col] * 0.98]
        return self
    
    def filter_breakdown(self, period: str = "52W"):
        """Find stocks breaking down to new lows"""
        low_col = f"Low.{period}"
        if low_col in self.df.columns:
            self.df = self.df[self.df["close"] <= self.df[low_col] * 1.02]
        return self
    
    def filter_unusual_volume(self, multiplier: float = 2.0):
        """Find stocks with unusual volume"""
        self.df = self.df[self.df["relative_volume_10d_calc"] >= multiplier]
        return self
    
    def filter_by_sector(self, sectors: list):
        """Filter by sector(s)"""
        self.df = self.df[self.df["sector"].isin(sectors)]
        return self
    
    def rank_by(self, column: str, ascending: bool = False, top_n: int = 50):
        """Rank and return top N stocks by column"""
        self.df = self.df.sort_values(column, ascending=ascending).head(top_n)
        return self
    
    def get_results(self) -> pd.DataFrame:
        """Return filtered DataFrame"""
        return self.df
    
    def get_summary(self) -> dict:
        """Return summary statistics"""
        return {
            "count": len(self.df),
            "avg_change": self.df["change"].mean(),
            "avg_volume": self.df["volume"].mean(),
            "sectors": self.df["sector"].value_counts().to_dict(),
        }


# Example custom screens
def value_stocks(df: pd.DataFrame) -> pd.DataFrame:
    """Find undervalued stocks"""
    return (
        StockScreener(df)
        .filter_by_pe_ratio(min_pe=0, max_pe=15)
        .filter_by_market_cap(min_cap=100_000_000)
        .filter_by_dividend_yield(min_yield=3)
        .rank_by("dividend_yield_recent", top_n=20)
        .get_results()
    )

def momentum_stocks(df: pd.DataFrame) -> pd.DataFrame:
    """Find momentum stocks"""
    return (
        StockScreener(df)
        .filter_by_market_cap(min_cap=500_000_000)
        .filter_breakout("52W")
        .filter_unusual_volume(multiplier=1.5)
        .rank_by("Perf.1M", top_n=20)
        .get_results()
    )

def oversold_bounce(df: pd.DataFrame) -> pd.DataFrame:
    """Find potential oversold bounces"""
    return (
        StockScreener(df)
        .filter_oversold(rsi_threshold=35)
        .filter_by_market_cap(min_cap=100_000_000)
        .rank_by("RSI", ascending=True, top_n=20)
        .get_results()
    )
```

**4. FastAPI Backend (Optional) (`src/api/main.py`)**
```python
"""
FastAPI Backend for ASX Visualizer
Provides REST API for the Next.js frontend
"""
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import pandas as pd

from src.scrapers.tradingview import TradingViewScanner
from src.storage.database import Database
from src.analysis.screener import StockScreener

app = FastAPI(
    title="ASX Visualizer API",
    description="API for Australian Stock Exchange data",
    version="1.0.0"
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-app.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scanner = TradingViewScanner()
db = Database()


@app.get("/api/stocks")
async def get_stocks(
    sort_by: str = "market_cap_basic",
    sort_order: str = "desc",
    limit: int = Query(50, le=500),
    offset: int = 0,
    sector: Optional[str] = None,
    min_market_cap: Optional[float] = None,
    max_pe: Optional[float] = None,
):
    """Get screened stocks with filters"""
    result = scanner.scan(
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )
    return result


@app.get("/api/presets/{preset_name}")
async def get_preset(preset_name: str, limit: int = 50):
    """Get stocks by preset filter"""
    if preset_name not in scanner.PRESET_FILTERS:
        raise HTTPException(status_code=404, detail="Preset not found")
    return scanner.get_preset(preset_name, limit=limit)


@app.get("/api/stock/{symbol}")
async def get_stock(symbol: str):
    """Get detailed data for a single stock"""
    result = scanner.scan(
        filter_conditions=[{"left": "name", "operation": "equal", "right": symbol}],
        limit=1
    )
    if not result.get("data"):
        raise HTTPException(status_code=404, detail="Stock not found")
    return result["data"][0]


@app.get("/api/historical/{symbol}")
async def get_historical(symbol: str, days: int = 30):
    """Get historical data for a stock"""
    return db.get_stock_history(symbol, days)


@app.get("/api/snapshot/{date}")
async def get_snapshot(date: str):
    """Get snapshot for a specific date"""
    return db.get_snapshot(date)


@app.get("/api/summary")
async def get_market_summary():
    """Get current market summary"""
    result = scanner.scan(limit=2000)
    df = pd.DataFrame([
        {"symbol": item["s"], **dict(zip(scanner.ALL_COLUMNS[:20], item["d"][:20]))}
        for item in result["data"]
    ])
    
    return {
        "total_stocks": len(df),
        "market_cap_total": df["market_cap_basic"].sum(),
        "gainers": len(df[df["change"] > 0]),
        "losers": len(df[df["change"] < 0]),
        "avg_change": df["change"].mean(),
    }
```

### 7. GitHub Actions - Daily Data Dump

Create `.github/workflows/daily-snapshot.yml`:

```yaml
name: Daily ASX Data Snapshot

on:
  schedule:
    # Run at 6:30 PM AEST (8:30 AM UTC) - after market close
    - cron: '30 8 * * 1-5'
  workflow_dispatch: # Allow manual trigger

jobs:
  snapshot:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
          
      - name: Install Python dependencies
        run: |
          cd python
          pip install -r requirements.txt
        
      - name: Fetch ASX Data Snapshot
        run: |
          cd python
          python scripts/fetch_daily_snapshot.py
        
      - name: Generate Daily Report
        run: |
          cd python
          python scripts/generate_report.py
          
      - name: Commit and Push
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add data/
          git commit -m "📊 Daily ASX snapshot - $(date +'%Y-%m-%d')" || exit 0
          git push

      - name: Upload Artifact (backup)
        uses: actions/upload-artifact@v4
        with:
          name: asx-snapshot-${{ github.run_id }}
          path: data/snapshots/
          retention-days: 30
```

#### Alternative: Run Python Backend on Schedule
```yaml
# .github/workflows/update-data.yml
name: Update Data & Deploy

on:
  schedule:
    - cron: '*/15 8-9 * * 1-5'  # Every 15 min during market hours (AEST)
  push:
    branches: [main]

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          
      - name: Install dependencies
        run: pip install -r python/requirements.txt
        
      - name: Update cached data
        run: python python/scripts/update_cache.py
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          
      - name: Trigger Vercel Redeploy
        run: curl -X POST ${{ secrets.VERCEL_DEPLOY_HOOK }}
```

#### Data Storage Structure
```
/data
  /snapshots
    /2026
      /01
        /2026-01-17.json      # Full snapshot
        /2026-01-17-summary.json  # Summary stats
  /historical
    /BHP.json                 # Individual stock history
    /CBA.json
    ...
```

---

### 8. Project Structure

```
asx-visualizer/
├── .github/
│   └── workflows/
│       ├── daily-snapshot.yml
│       └── deploy.yml
│
├── frontend/                      # Next.js Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Main dashboard
│   │   │   ├── layout.tsx
│   │   │   ├── screener/
│   │   │   │   └── page.tsx          # Full screener page
│   │   │   └── stock/
│   │   │       └── [symbol]/
│   │   │           └── page.tsx      # Individual stock page
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn components
│   │   │   ├── charts/
│   │   │   │   ├── MiniChart.tsx
│   │   │   │   ├── Heatmap.tsx
│   │   │   │   └── TradingViewWidget.tsx
│   │   │   ├── screener/
│   │   │   │   ├── DataTable.tsx
│   │   │   │   ├── ColumnToggle.tsx
│   │   │   │   ├── FilterPanel.tsx
│   │   │   │   ├── PresetViews.tsx
│   │   │   │   └── SortControls.tsx
│   │   │   ├── hotlists/
│   │   │   │   ├── GainersLosers.tsx
│   │   │   │   └── MostActive.tsx
│   │   │   └── layout/
│   │   │       ├── Header.tsx
│   │   │       ├── Sidebar.tsx
│   │   │       └── Footer.tsx
│   │   ├── lib/
│   │   │   ├── tradingview/
│   │   │   │   ├── scanner.ts        # Scanner API client
│   │   │   │   ├── columns.ts        # Column definitions
│   │   │   │   └── filters.ts        # Filter configurations
│   │   │   ├── api.ts                # Python backend API client
│   │   │   ├── utils.ts
│   │   │   └── constants.ts
│   │   ├── hooks/
│   │   │   ├── useScreenerData.ts
│   │   │   ├── useColumnVisibility.ts
│   │   │   └── useFilters.ts
│   │   └── types/
│   │       └── index.ts
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── next.config.js
│
├── python/                        # Python Backend & Scripts
│   ├── requirements.txt
│   ├── config.py
│   ├── src/
│   │   ├── __init__.py
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── main.py              # FastAPI app
│   │   │   └── routes/
│   │   │       ├── screener.py
│   │   │       └── historical.py
│   │   ├── scrapers/
│   │   │   ├── __init__.py
│   │   │   ├── tradingview.py       # TradingView scanner client
│   │   │   └── asx.py               # Direct ASX data fetcher
│   │   ├── processors/
│   │   │   ├── __init__.py
│   │   │   ├── cleaner.py           # Data cleaning
│   │   │   ├── transformer.py       # Data transformation
│   │   │   └── calculator.py        # Custom indicators
│   │   ├── storage/
│   │   │   ├── __init__.py
│   │   │   ├── database.py          # SQLite/PostgreSQL handler
│   │   │   ├── csv_handler.py
│   │   │   └── json_handler.py
│   │   ├── analysis/
│   │   │   ├── __init__.py
│   │   │   ├── screener.py          # Custom screening logic
│   │   │   ├── signals.py           # Signal generation
│   │   │   └── reports.py           # Summary reports
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── logger.py
│   │       └── helpers.py
│   ├── scripts/
│   │   ├── fetch_daily_snapshot.py  # Daily data fetch
│   │   ├── generate_report.py       # Daily report
│   │   ├── backfill_historical.py   # Backfill data
│   │   ├── export_csv.py            # CSV export
│   │   └── run_api.py               # Start FastAPI server
│   ├── notebooks/                    # Jupyter notebooks
│   │   ├── exploration.ipynb
│   │   ├── backtesting.ipynb
│   │   └── visualization.ipynb
│   └── tests/
│       ├── __init__.py
│       ├── test_scrapers.py
│       └── test_analysis.py
│
├── data/                          # Git-tracked data snapshots
│   ├── snapshots/
│   │   └── 2026/
│   │       └── 01/
│   │           ├── 2026-01-17.json
│   │           ├── 2026-01-17.csv
│   │           ├── 2026-01-17-summary.json
│   │           └── presets/
│   │               ├── 2026-01-17-top_gainers.json
│   │               └── ...
│   ├── historical/
│   │   ├── BHP.json
│   │   ├── CBA.json
│   │   └── ...
│   └── cache/
│       └── latest.json
│
├── docker-compose.yml             # Local development
├── Dockerfile.python              # Python backend container
├── vercel.json                    # Frontend deployment
├── README.md
└── .gitignore
```

---

### 9. UI/UX Requirements

#### Theme
- **Dark mode** as default (matching TradingView dark theme)
- Color scheme:
  - Background: `#131722` (TradingView dark)
  - Cards: `#1e222d`
  - Accent: `#2962ff` (TradingView blue)
  - Positive: `#26a69a` (green)
  - Negative: `#ef5350` (red)

#### Responsive Design
- Desktop: Full sidebar + main content
- Tablet: Collapsible sidebar
- Mobile: Bottom navigation + stacked cards

#### Interactions
- Smooth transitions on filter changes
- Loading skeletons while data fetches
- Toast notifications for actions
- Keyboard shortcuts (e.g., `/` to search)

---

### 10. Deployment

#### Frontend (Vercel)
```json
// vercel.json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/.next",
  "framework": "nextjs",
  "regions": ["syd1"],
  "rewrites": [
    { "source": "/api/py/:path*", "destination": "https://your-python-api.railway.app/:path*" }
  ]
}
```

#### Python Backend (Railway/Render)
```dockerfile
# Dockerfile.python
FROM python:3.11-slim

WORKDIR /app

COPY python/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY python/ .

EXPOSE 8000

CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Docker Compose (Local Development)
```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

  backend:
    build:
      context: .
      dockerfile: Dockerfile.python
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:///data/asx.db
    volumes:
      - ./python:/app
      - ./data:/app/data

  db:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=asx
      - POSTGRES_PASSWORD=asx123
      - POSTGRES_DB=asx_visualizer
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### Environment Variables
```env
# .env.local (Frontend)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_API_URL=https://your-python-api.railway.app

# .env (Python)
DATABASE_URL=postgresql://user:pass@host:5432/asx_visualizer
TRADINGVIEW_API_KEY=widget_user_token  # Free tier
```

---

### 11. Development Phases

#### Phase 1: Foundation & Python Backend
- [ ] Initialize monorepo structure (frontend + python)
- [ ] Python: Set up project structure, requirements.txt
- [ ] Python: Create TradingView scanner client (`tradingview.py`)
- [ ] Python: Create database models and handlers
- [ ] Python: Build FastAPI endpoints
- [ ] Frontend: Next.js project setup with TypeScript
- [ ] Frontend: Tailwind + shadcn/ui configuration
- [ ] Frontend: Basic layout (header, sidebar, main)

#### Phase 2: Data Collection & Storage
- [ ] Python: Implement daily snapshot script
- [ ] Python: Set up SQLite/PostgreSQL storage
- [ ] Python: Create data export utilities (CSV, JSON)
- [ ] Set up GitHub Actions for daily snapshots
- [ ] Test data collection pipeline

#### Phase 3: Screener Core
- [ ] Frontend: TradingView mini chart widgets
- [ ] Frontend: Data table component with virtual scrolling
- [ ] Frontend: Connect to Python API
- [ ] Frontend: Column definitions for all 200+ metrics
- [ ] Frontend: Basic sorting functionality
- [ ] Frontend: Column visibility toggle

#### Phase 4: Filters & Presets
- [ ] Frontend: Dropdown filter components
- [ ] Frontend: Range filter components
- [ ] Frontend: Preset view buttons (18 presets)
- [ ] Frontend: Filter state management (URL params)
- [ ] Python: Custom screener logic (value, momentum, etc.)

#### Phase 5: Analysis & Notebooks
- [ ] Python: Custom screening algorithms
- [ ] Python: Signal generation module
- [ ] Python: Create Jupyter notebooks for analysis
- [ ] Python: Backtesting framework setup

#### Phase 6: Polish & Deploy
- [ ] Frontend: Responsive design refinements
- [ ] Frontend: Loading states & animations
- [ ] Docker Compose for local development
- [ ] Deploy Python backend to Railway/Render
- [ ] Deploy frontend to Vercel
- [ ] Documentation (README, API docs)
- [ ] Set up monitoring & alerts

---

## Deliverables

1. **GitHub Repository** with full source code (monorepo: frontend + python)
2. **Live Vercel URL** for the frontend application
3. **Python API** deployed on Railway/Render
4. **Daily data snapshots** in `/data` folder via GitHub Actions
5. **Jupyter Notebooks** for data exploration and analysis
6. **README.md** with:
   - Project description & architecture
   - Setup instructions (frontend + backend)
   - API documentation
   - Screenshots
   - Data schema documentation

---

## Notes for Implementation

1. **TradingView Terms**: The embed widgets are free for non-commercial use. Ensure "Powered by TradingView" attribution is visible.

2. **Rate Limiting**: TradingView scanner may have rate limits. Implement appropriate caching and throttling in Python.

3. **Data Freshness**: Market data from TradingView widgets has ~15 min delay for free tier. Document this for users.

4. **Fallback**: If TradingView API is unavailable, serve cached data from PostgreSQL with timestamp.

5. **Python vs Node**: Use Python for:
   - Data fetching & processing
   - Historical data storage
   - Custom analysis & screening
   - Jupyter notebooks for exploration
   - GitHub Actions data jobs
   
   Use Next.js/TypeScript for:
   - Frontend UI
   - TradingView widget integration
   - Real-time UI interactions

6. **Local Development**: Use Docker Compose to run frontend + backend + database together.

---

## Quick Start Commands

```bash
# Clone and setup
git clone https://github.com/yourusername/asx-visualizer
cd asx-visualizer

# Option 1: Docker (recommended)
docker-compose up -d

# Option 2: Manual setup

# Backend
cd python
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python scripts/run_api.py

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# Fetch initial data
cd python
python scripts/fetch_daily_snapshot.py
```

---

Now build this! Start with Phase 1 and iterate through each phase. Ask me if you need clarification on any feature.